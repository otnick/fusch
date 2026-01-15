<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { browser } from "$app/environment";
  import * as THREE from "three";
  import { io, type Socket } from "socket.io-client";

  const SERVER_URL = "https://socket.fusch.fun";
  const MAX_USERS = 16;

  let container: HTMLDivElement | null = null;

  let renderer: THREE.WebGLRenderer | null = null;
  let scene: THREE.Scene | null = null;
  let camera: THREE.OrthographicCamera | null = null;
  let material: THREE.ShaderMaterial | null = null;

  let frameId: number | null = null;
  let socket: Socket | null = null;

  // ---- Audio sync state from server ----
  type AudioState = { url: string; startedAt: number | null; sessionId: string | null };
  let lastAudioState: AudioState | null = null;

  // Audio: starts ONLY after slider interaction
  let audioEl: HTMLAudioElement | null = null;
  let audioCtx: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;
  let freqData: Uint8Array | null = null;

  let audioUnlocked = false;
  let audioPlaying = false;

  // prevent double starts
  let startingAudio = false;
  // dedupe audio:state events
  let lastAudioKey = "";

  // Slider starts at 0
  let volumePct = 0;
  $: if (audioEl) audioEl.volume = Math.min(1, Math.max(0, volumePct / 100));

  function dbg(...args: any[]) {
    // eslint-disable-next-line no-console
    console.log("[LOCAL-AUDIO]", ...args);
  }

  function resolveUrl(state: AudioState) {
    return state.url.startsWith("http") ? state.url : `${SERVER_URL}${state.url}`;
  }

  function ensureAudioElement(url: string) {
    if (!audioEl) {
      audioEl = new Audio(url);
      audioEl.crossOrigin = "anonymous";
      audioEl.loop = true;
      audioEl.preload = "auto";
      (audioEl as any).playsInline = true;

      audioEl.addEventListener("error", () => dbg("<audio> error", audioEl?.error));
      audioEl.addEventListener("stalled", () => dbg("stalled"));
      audioEl.addEventListener("waiting", () => dbg("waiting"));
      audioEl.addEventListener("playing", () => dbg("playing"));
      audioEl.addEventListener("pause", () => dbg("paused"));
      audioEl.addEventListener("loadedmetadata", () => dbg("loadedmetadata", { duration: audioEl?.duration }));
    } else if (audioEl.src !== url) {
      dbg("switch audio src", { from: audioEl.src, to: url });
      audioEl.src = url;
    }
    audioEl.volume = Math.min(1, Math.max(0, volumePct / 100));
  }

  async function ensureAudioGraph() {
    if (!audioEl) return;

    if (!audioCtx) {
      audioCtx = new AudioContext();

      // On iOS Safari this matters sometimes
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const anyEl = audioEl as any;
      if (typeof anyEl.playsInline !== "undefined") anyEl.playsInline = true;

      const src = audioCtx.createMediaElementSource(audioEl);
      analyser = audioCtx.createAnalyser();

      // ✅ More “beat” / less mush
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.25;
      analyser.minDecibels = -85;
      analyser.maxDecibels = -15;

      src.connect(analyser);
      analyser.connect(audioCtx.destination);

      freqData = new Uint8Array(analyser.frequencyBinCount);
      dbg("AudioContext created");
    }

    if (audioCtx.state !== "running") {
      await audioCtx.resume();
      dbg("AudioContext resumed", audioCtx.state);
    }
  }

  // -------------------------
  // ✅ SOFT SYNC (playbackRate-based) + rare hard seek
  // -------------------------
  function computeWrappedDiff(target: number, cur: number, dur: number) {
    let diff = target - cur;
    diff = ((diff + dur / 2) % dur) - dur / 2; // shortest wrap-around diff
    return diff;
  }

  function hardAlignOnce(state: AudioState) {
    if (!audioEl || !state.startedAt) return;

    const dur = audioEl.duration;
    if (!Number.isFinite(dur) || dur <= 0) return;

    const targetAbs = (Date.now() - state.startedAt) / 1000;
    const target = targetAbs % dur;

    audioEl.playbackRate = 1.0;
    audioEl.currentTime = Math.max(0, target);
  }

  function softSyncAudio(state: AudioState) {
    if (!audioEl || !state.startedAt) return;

    const dur = audioEl.duration;
    if (!Number.isFinite(dur) || dur <= 0) return;

    const targetAbs = (Date.now() - state.startedAt) / 1000;
    const target = targetAbs % dur;

    const cur = audioEl.currentTime || 0;
    const diff = computeWrappedDiff(target, cur, dur);
    const abs = Math.abs(diff);

    const HARD_SEEK_SEC = 4.0;
    if (abs > HARD_SEEK_SEC) {
      hardAlignOnce(state);
      return;
    }

    const MAX_RATE_DELTA = 0.015; // ±1.5%
    const K = 0.04;
    const rate = 1.0 + Math.max(-MAX_RATE_DELTA, Math.min(MAX_RATE_DELTA, diff * K));
    audioEl.playbackRate = rate;
  }

  function stopAudio() {
    audioPlaying = false;
    try {
      if (audioEl) audioEl.playbackRate = 1.0;
      audioEl?.pause();
    } catch {}
  }

  // -------------------------
  // ✅ IMPORTANT: Unlock from a real user gesture (no await chain)
  // -------------------------
  function unlockFromGesture() {
    if (!browser) return;
    if (audioUnlocked) return;

    audioUnlocked = true;
    dbg("audio unlocked from gesture");

    // If we already have a state: set src + kick audio graph + kick play
    if (lastAudioState?.startedAt) {
      const url = resolveUrl(lastAudioState);
      ensureAudioElement(url);

      // fire-and-forget: keep it inside gesture call stack
      ensureAudioGraph().catch((e) => dbg("ensureAudioGraph failed", e));
      audioEl
        ?.play()
        .then(() => {
          audioPlaying = true;
          dbg("gesture play() ok");
        })
        .catch((e) => dbg("gesture play() failed", e));
    }
  }

  async function startSyncedAudio(state: AudioState, reason = "unknown") {
    dbg("startSyncedAudio()", { reason, startedAt: state.startedAt, sessionId: state.sessionId, volumePct });

    if (!browser) return;

    if (!state.startedAt) {
      dbg("state.startedAt is null -> stop");
      stopAudio();
      return;
    }

    // Don’t start if muted
    if (volumePct <= 0) {
      dbg("volume is 0 -> not playing (by design)");
      return;
    }

    // prevent parallel play() calls
    if (startingAudio) {
      dbg("startSyncedAudio: already starting -> skip");
      return;
    }
    startingAudio = true;

    const url = resolveUrl(state);
    ensureAudioElement(url);

    try {
      await ensureAudioGraph();

      // Reset playbackRate on start
      if (audioEl) audioEl.playbackRate = 1.0;

      // If metadata missing, wait once
      if (!Number.isFinite(audioEl!.duration) || audioEl!.duration <= 0) {
        await new Promise<void>((resolve) => {
          const done = () => resolve();
          audioEl!.addEventListener("loadedmetadata", done, { once: true });
          setTimeout(done, 3000);
        });
      }

      // Initial align once (rare click ok)
      hardAlignOnce(state);

      await audioEl!.play();
      audioPlaying = true;
      dbg("play() ok", { currentTime: audioEl!.currentTime, duration: audioEl!.duration });

      // baseline soft correction
      softSyncAudio(state);
    } catch (e) {
      audioPlaying = false;
      dbg("start failed", e);
    } finally {
      startingAudio = false;
    }
  }

  // ---- Mouse/Users (unchanged logic) ----
  const localMouse = new THREE.Vector2(0.5, 0.5);
  const prevLocalMouse = new THREE.Vector2(0.5, 0.5);

  type PsyUser = { x: number; y: number; v: number; updatedAt: number };
  const users = new Map<string, PsyUser>();
  let myId: string | null = null;

  const uniforms = {
    uTime: { value: 0 },
    uRes: { value: new THREE.Vector2(1, 1) },
    uUsers: { value: Array.from({ length: MAX_USERS }, () => new THREE.Vector4(0.5, 0.5, 0.0, 0.0)) },
    uUserCount: { value: 0 },
    uEnergy: { value: 0.0 },
    uBass: { value: 0.0 },
    uTreble: { value: 0.0 }
  };

  function resize() {
    if (!renderer) return;

    const vv = window.visualViewport;
    const w = Math.max(1, Math.floor(vv?.width ?? window.innerWidth));
    const h = Math.max(1, Math.floor(vv?.height ?? window.innerHeight));

    const isMobile =
      typeof navigator !== "undefined" &&
      ("ontouchstart" in window || navigator.maxTouchPoints > 0);

    // ✅ stronger mobile perf cap
    const dprCap = isMobile ? 1.0 : 2.0;
    renderer.setPixelRatio(Math.min(devicePixelRatio, dprCap));
    renderer.setSize(w, h, true);

    uniforms.uRes.value.set(w, h);
  }

  function clamp01(n: number) {
    return Math.min(1, Math.max(0, n));
  }

  let pendingX = 0.5;
  let pendingY = 0.5;
  let hasPendingPointer = false;

  function onPointerMove(e: PointerEvent) {
    if (!container) return;
    const rect = container.getBoundingClientRect();
    pendingX = clamp01((e.clientX - rect.left) / rect.width);
    pendingY = clamp01(1 - (e.clientY - rect.top) / rect.height);
    hasPendingPointer = true;
  }

  function updateUsersUniform() {
    const arr = uniforms.uUsers.value as THREE.Vector4[];
    for (let i = 0; i < MAX_USERS; i++) arr[i].set(0.5, 0.5, 0.0, 0.0);

    const entries = Array.from(users.entries())
      .sort((a, b) => b[1].updatedAt - a[1].updatedAt)
      .slice(0, MAX_USERS);

    for (let i = 0; i < entries.length; i++) {
      const [, s] = entries[i];
      arr[i].set(s.x, s.y, s.v, 1.0);
    }
    uniforms.uUserCount.value = entries.length;
  }

  let lastSend = 0,
    lastSentX = 0.5,
    lastSentY = 0.5;

  function sendPsyInput(v: number, force = false) {
    if (!socket || !myId) return;
    const now = performance.now();
    if (!force && now - lastSend < 33) return;

    const dx = Math.abs(localMouse.x - lastSentX);
    const dy = Math.abs(localMouse.y - lastSentY);
    if (!force && dx < 0.002 && dy < 0.002 && v < 0.01) return;

    lastSend = now;
    lastSentX = localMouse.x;
    lastSentY = localMouse.y;

    socket.emit("psy:input", { x: localMouse.x, y: localMouse.y, v, ts: Date.now() });
  }

  // -------------------------
  // ✅ Beat-friendly audio extraction
  // Peak + envelope follower (snappy even at low FPS)
  // -------------------------
  let bassEnv = 0;
  let energyEnv = 0;

  function envelopeStep(input: number, env: number, attack = 0.55, release = 0.08) {
    const a = input > env ? attack : release;
    return env + (input - env) * a;
  }

  let silentFrames = 0;

  function updateAudioUniforms() {
    if (!analyser || !freqData || !audioPlaying) {
      uniforms.uEnergy.value *= 0.97;
      uniforms.uBass.value *= 0.97;
      uniforms.uTreble.value *= 0.97;
      return;
    }

    analyser.getByteFrequencyData(freqData);
    const n = freqData.length;

    const bassEnd = Math.max(16, Math.floor(n * 0.10));
    const trebleStart = Math.floor(n * 0.70);
    const energyEnd = Math.floor(n * 0.55);

    // peak bass
    let bassPeak = 0;
    for (let i = 0; i < bassEnd; i++) bassPeak = Math.max(bassPeak, freqData[i]);

    // average treble (ok)
    let trebleSum = 0;
    for (let i = trebleStart; i < n; i++) trebleSum += freqData[i];
    const trebleAvg = trebleSum / Math.max(1, n - trebleStart);

    // peak-ish energy
    let energyPeak = 0;
    for (let i = 0; i < energyEnd; i++) energyPeak = Math.max(energyPeak, freqData[i]);

    // detect “analyser dead”
    let probe = 0;
    for (let i = 0; i < 24; i++) probe += freqData[i];
    silentFrames = probe === 0 ? silentFrames + 1 : 0;
    if (silentFrames === 90) dbg("⚠️ analyser seems silent (CORS/gesture?)");

    const bass = bassPeak / 255;
    const treble = trebleAvg / 255;
    const energy = energyPeak / 255;

    bassEnv = envelopeStep(bass, bassEnv, 0.60, 0.10);
    energyEnv = envelopeStep(energy, energyEnv, 0.50, 0.07);

    uniforms.uBass.value = bassEnv;
    uniforms.uEnergy.value = energyEnv;
    uniforms.uTreble.value = uniforms.uTreble.value * 0.85 + treble * 0.15;
  }

  // ✅ soft sync on a short interval (no clicks)
  let last = 0;
  let lastSoftSync = 0;

  function animate(now = performance.now()) {
    if (!renderer || !scene || !camera) return;

    if (!last) last = now;
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;

    updateAudioUniforms();

    // ✅ Soft-sync every ~2s while playing
    if (audioPlaying && lastAudioState?.startedAt && now - lastSoftSync > 2000) {
      softSyncAudio(lastAudioState);
      lastSoftSync = now;
    }

    const SPEED = 0.20 + 0.09 * uniforms.uEnergy.value;
    uniforms.uTime.value += dt * SPEED;

    const velVec = localMouse.clone().sub(prevLocalMouse);
    prevLocalMouse.copy(localMouse);
    const v = Math.min(2, Math.max(0, velVec.length() * 12));

    if (myId) users.set(myId, { x: localMouse.x, y: localMouse.y, v, updatedAt: Date.now() });

    if (hasPendingPointer) {
      localMouse.set(pendingX, pendingY);
      hasPendingPointer = false;
    }

    sendPsyInput(v);
    updateUsersUniform();

    renderer.render(scene, camera);
    frameId = requestAnimationFrame(animate);
  }

  let vv: VisualViewport | null = null;

  onMount(() => {
    if (!browser || !container) return;

    const isMobile =
      typeof navigator !== "undefined" &&
      ("ontouchstart" in window || navigator.maxTouchPoints > 0);

    // ✅ AA off on mobile for perf
    renderer = new THREE.WebGLRenderer({ antialias: !isMobile });
    container.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    material = new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader });
    scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));

    resize();
    window.addEventListener("resize", resize, { passive: true });
    vv = window.visualViewport ?? null;
    vv?.addEventListener("resize", resize, { passive: true });

    container.addEventListener("pointermove", onPointerMove, { passive: true });

    socket = io(SERVER_URL, { transports: ["websocket"] });

    socket.on("connect", () => {
      dbg("socket connected", socket!.id);
      myId = socket!.id!;
      users.clear();
      socket!.emit("requestPsyUsers");
      sendPsyInput(0, true);
    });

    socket.on("audio:state", (s: AudioState) => {
      const key = `${s.sessionId ?? ""}|${s.startedAt ?? ""}|${s.url ?? ""}`;
      if (key === lastAudioKey) return;
      lastAudioKey = key;

      dbg("audio:state", s);
      lastAudioState = s;

      // If already unlocked + volume > 0 => (re)start
      if (audioUnlocked && volumePct > 0) startSyncedAudio(s, "server update");
      if (audioUnlocked && !s.startedAt) dbg("⚠️ startedAt null from server (no session running?)");
    });

    socket.on("psyUsers", (list: Array<{ id: string; x: number; y: number; v: number; updatedAt: number }>) => {
      for (const u of list) users.set(u.id, { x: u.x, y: u.y, v: u.v ?? 0, updatedAt: u.updatedAt ?? Date.now() });
    });

    socket.on("psyUser", (u: { id: string; x: number; y: number; v: number; updatedAt: number }) => {
      users.set(u.id, { x: u.x, y: u.y, v: u.v ?? 0, updatedAt: u.updatedAt ?? Date.now() });
    });

    socket.on("psyUserLeft", ({ id }: { id: string }) => users.delete(id));

    animate();
  });

  onDestroy(() => {
    if (!browser) return;
    if (frameId !== null) cancelAnimationFrame(frameId);

    window.removeEventListener("resize", resize);
    vv?.removeEventListener("resize", resize);
    container?.removeEventListener("pointermove", onPointerMove);

    socket?.disconnect();
    socket = null;

    stopAudio();
    try {
      audioCtx?.close();
    } catch {}
    audioCtx = null;
    analyser = null;
    freqData = null;
    audioEl = null;

    material?.dispose();
    if (scene) {
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        mesh.geometry?.dispose?.();
      });
    }

    renderer?.dispose();
    renderer?.domElement?.remove();

    renderer = null;
    scene = null;
    camera = null;
    material = null;
  });

  const vertexShader = /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
  `;

  const fragmentShader = /* glsl */ `
    precision highp float;
    varying vec2 vUv;

    uniform float uTime;
    uniform vec2 uRes;
    uniform vec4 uUsers[16];
    uniform int uUserCount;

    uniform float uEnergy;
    uniform float uBass;
    uniform float uTreble;

    float hash21(vec2 p){ p=fract(p*vec2(123.34,345.45)); p+=dot(p,p+34.345); return fract(p.x*p.y); }
    float noise(vec2 p){
      vec2 i=floor(p), f=fract(p);
      float a=hash21(i), b=hash21(i+vec2(1.,0.)), c=hash21(i+vec2(0.,1.)), d=hash21(i+vec2(1.,1.));
      vec2 u=f*f*(3.-2.*f);
      return mix(a,b,u.x)+(c-a)*u.y*(1.-u.x)+(d-b)*u.x*u.y;
    }
    float fbm(vec2 p){
      float v=0., a=0.5;
      mat2 m=mat2(1.6,-1.2,1.2,1.6);
      for(int i=0;i<4;i++){ v+=a*noise(p); p=m*p; a*=0.55; }
      return v;
    }
    vec3 hsv2rgb(vec3 c){
      vec4 K=vec4(1.,2./3.,1./3.,3.);
      vec3 p=abs(fract(c.xxx+K.xyz)*6.-K.www);
      return c.z*mix(K.xxx, clamp(p-K.xxx,0.,1.), c.y);
    }
    vec2 swirl(vec2 p, vec2 center, float strength){
      vec2 d=p-center; float r=length(d);
      float ang=strength*exp(-r*3.5);
      float s=sin(ang), c=cos(ang);
      mat2 rot=mat2(c,-s,s,c);
      return center+rot*d;
    }

    void main(){
      vec2 uv=vUv;

      vec2 p=(uv*2.-1.);
      float aspect=uRes.x/uRes.y;
      p.x*=aspect;

      vec2 pw=p;
      float glowSum=0.;

      float audioBoost=0.85+0.50*uEnergy;
      float bassBoost =0.85+0.65*uBass;

      for(int i=0;i<16;i++){
        vec4 u=uUsers[i];
        if(u.w<0.5) continue;

        vec2 m=(u.xy*2.-1.); m.x*=aspect;
        float v=clamp(u.z,0.,2.);

        float strength=(0.48+0.36*v)*bassBoost;
        pw=swirl(pw,m,strength);

        float dist=length(pw-m);
        glowSum+=exp(-dist*(2.7+0.55*uTreble))*(0.08+0.22*v)*audioBoost;
      }

      float t=uTime*(0.30+0.10*uEnergy);

      vec2 q=pw;
      q+=(0.20+0.05*uBass)*vec2(
        fbm(pw*2.+vec2(0.,t)),
        fbm(pw*2.+vec2(t,0.))
      );

      vec2 r=q;
      r+=(0.34+0.07*uEnergy)*vec2(
        fbm(q*2.6+vec2(2.1,1.7)+t),
        fbm(q*2.6+vec2(1.3,2.9)-t)
      );

      float f=fbm(r*(2.4+0.25*uTreble)-t);

      float stripes=0.5+0.5*sin(
        (r.x*(4.4+0.50*uTreble)+r.y*(2.9+0.40*uTreble))
        + f*(5.8+1.1*uEnergy)
        + uTime*(0.75+0.12*uEnergy)
      );

      float hue=fract(0.13*r.x+0.18*r.y+f*0.55+uTime*(0.06+0.04*uTreble));
      float sat=0.82+0.10*sin(uTime+f*(5.0+1.1*uEnergy));
      float val=0.60+(0.32+0.16*uEnergy)*pow(stripes,1.2);

      val+=glowSum;
      sat+=glowSum*0.22;

      vec3 col=hsv2rgb(vec3(hue, clamp(sat,0.,1.), clamp(val,0.,1.)));

      float vig=smoothstep(1.35,0.2,length(p));
      col*=vig;

      gl_FragColor=vec4(col,1.);
    }
  `;
</script>

<style>
  .container {
    position: fixed;
    inset: 0;
    overflow: hidden;
    background: black;
    touch-action: none;
    max-width: none;
    max-height: none;
  }
  .container :global(canvas) {
    display: block;
    width: 100%;
    height: 100%;
  }

  .vol {
    position: fixed;
    right: 16px;
    top: 64px;
    z-index: 1000;
    padding: 10px 12px;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.18);
    background: rgba(250, 182, 34, 0.55);
    color: white;
    backdrop-filter: blur(8px);
    display: flex;
    gap: 10px;
    align-items: center;
    max-width: 200px;
    max-height: 40px;
  }
  .pct {
    min-width: 22px;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .skRange {
    width: 100px;
    height: 18px;
    appearance: none;
    background: transparent;
    cursor: pointer;
  }
  .skRange::-webkit-slider-runnable-track {
    height: 8px;
    border-radius: 999px;
    background: linear-gradient(90deg, rgba(197, 97, 255, 0.95) var(--fill), rgba(255, 255, 255, 0.18) var(--fill));
  }
  .skRange::-moz-range-track {
    height: 8px;
    border-radius: 999px;
    background: linear-gradient(90deg, rgba(197, 97, 255, 0.95) var(--fill), rgba(255, 255, 255, 0.18) var(--fill));
  }
  .skRange::-webkit-slider-thumb {
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.95);
    border: 2px solid rgba(197, 97, 255, 0.95);
    margin-top: -4px;
  }
  .skRange::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.95);
    border: 2px solid rgba(197, 97, 255, 0.95);
  }
  .hint {
    position: fixed;
    right: 16px;
    top: 102px;
    z-index: 1000;
    color: rgba(255, 255, 255, 0.85);
    font-size: 12px;
  }
  .credits {
    position: fixed;
    top: 22px;
    left: 12px;
    color: rgba(255, 255, 255, 0.65);
    font-size: 13px;
    z-index: 1000;
  }
</style>

<div class="container" bind:this={container}></div>

{#if browser}
  <div class="vol" on:pointermove|stopPropagation>
    <span class="icon">{audioUnlocked ? "🔊" : "🔇"}</span>

    <input
      class="skRange"
      style={`--fill:${volumePct}%`}
      type="range"
      min="0"
      max="100"
      step="1"
      bind:value={volumePct}
      aria-label="Volume"
      on:pointerdown={(e) => {
        e.stopPropagation();
        // ✅ critical: unlock directly from gesture
        if (!audioUnlocked) unlockFromGesture();
      }}
      on:input={(e) => {
        e.stopPropagation();

        // if user moves slider up from 0 and we are not unlocked, unlock now (non-async)
        if (!audioUnlocked && volumePct > 0) unlockFromGesture();

        if (audioUnlocked && volumePct <= 0 && audioPlaying) stopAudio();

        if (audioUnlocked && volumePct > 0 && lastAudioState?.startedAt && !audioPlaying) {
          // start sync normally (can be async)
          startSyncedAudio(lastAudioState, "slider resume");
        }
      }}
    />

    <span class="pct">{volumePct}%</span>
  </div>

  <div class="credits">Set: pipi & kaka Fusch25</div>

  {#if !audioUnlocked}
    <div class="hint ms-2 mt-1">Bewege den Slider, um Musik zu aktivieren.</div>
  {/if}
{/if}
