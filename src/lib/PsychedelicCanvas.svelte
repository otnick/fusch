<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { browser } from "$app/environment";
  import * as THREE from "three";
  import { io, type Socket } from "socket.io-client";

  // -------------------------
  // Config
  // -------------------------
  const SERVER_URL = "https://socket.fusch.fun"; // Socket.IO endpoint (https!)
  const AUDIO_URL = "https://socket.fusch.fun/audio/set.wav"; // <-- deine Audio-Route
  const MAX_USERS = 16;

  let container: HTMLDivElement | null = null;

  let renderer: THREE.WebGLRenderer | null = null;
  let scene: THREE.Scene | null = null;
  let camera: THREE.OrthographicCamera | null = null;
  let material: THREE.ShaderMaterial | null = null;

  let frameId: number | null = null;
  let socket: Socket | null = null;

  // -------------------------
  // Audio (local reactive)
  // -------------------------
  let audioEl: HTMLAudioElement | null = null;
  let audioCtx: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;
  let freqData: Uint8Array | null = null;

  let audioPlaying = false;
  let audioError: string | null = null;

  async function startAudio() {
    audioError = null;

    try {
      if (!audioEl) {
        audioEl = new Audio(AUDIO_URL);
        audioEl.crossOrigin = "anonymous";
        audioEl.loop = true;
        audioEl.preload = "auto";
      }

      if (!audioCtx) {
        audioCtx = new AudioContext();
        const src = audioCtx.createMediaElementSource(audioEl);
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 1024; // 512 bins
        src.connect(analyser);
        analyser.connect(audioCtx.destination);
        freqData = new Uint8Array(analyser.frequencyBinCount);
      }

      if (audioCtx.state !== "running") await audioCtx.resume();
      await audioEl.play();
      audioPlaying = true;
    } catch (e: any) {
      audioPlaying = false;
      audioError = e?.message ?? "Audio konnte nicht gestartet werden.";
      // Autoplay-Policy / CORS / 404 sind die üblichen Gründe
      console.error(e);
    }
  }

  function stopAudio() {
    audioPlaying = false;
    try {
      audioEl?.pause();
    } catch {}
  }

  // -------------------------
  // Local pointer target (0..1)
  // -------------------------
  const localMouse = new THREE.Vector2(0.5, 0.5);
  const prevLocalMouse = new THREE.Vector2(0.5, 0.5);

  // Store multi-user states (including yourself)
  type PsyUser = { x: number; y: number; v: number; updatedAt: number };
  const users = new Map<string, PsyUser>();
  let myId: string | null = null;

  // Uniforms
  const uniforms = {
    uTime: { value: 0 },
    uRes: { value: new THREE.Vector2(1, 1) },
    uUsers: { value: Array.from({ length: MAX_USERS }, () => new THREE.Vector4(0.5, 0.5, 0.0, 0.0)) },
    uUserCount: { value: 0 },

    // Audio reactivity (0..1)
    uEnergy: { value: 0.0 },
    uBass: { value: 0.0 },
    uTreble: { value: 0.0 }
  };

  // -------------------------
  // Helpers
  // -------------------------
  function resize() {
    if (!container || !renderer) return;
    const rect = container.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width));
    const h = Math.max(1, Math.floor(rect.height));

    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(w, h, false);
    uniforms.uRes.value.set(w, h);
  }

  function clamp01(n: number) {
    return Math.min(1, Math.max(0, n));
  }

  // Pointer → localMouse (container-relative)
  function onPointerMove(e: PointerEvent) {
    if (!container) return;
    if (e.type === "pointerdown") container.setPointerCapture?.(e.pointerId);

    const rect = container.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = 1 - (e.clientY - rect.top) / rect.height;
    localMouse.set(clamp01(x), clamp01(y));
  }

  // Update the uUsers uniform array from "users" map
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

  // Throttled send (30Hz) + only if changed
  let lastSend = 0;
  let lastSentX = 0.5;
  let lastSentY = 0.5;

  function sendPsyInput(v: number) {
    if (!socket || !myId) return;

    const now = performance.now();
    if (now - lastSend < 33) return;

    const dx = Math.abs(localMouse.x - lastSentX);
    const dy = Math.abs(localMouse.y - lastSentY);
    if (dx < 0.002 && dy < 0.002 && v < 0.01) return;

    lastSend = now;
    lastSentX = localMouse.x;
    lastSentY = localMouse.y;

    socket.emit("psy:input", { x: localMouse.x, y: localMouse.y, v, ts: Date.now() });
  }

  function updateAudioUniforms() {
    if (!analyser || !freqData || !audioPlaying) {
      uniforms.uEnergy.value *= 0.985;
      uniforms.uBass.value *= 0.985;
      uniforms.uTreble.value *= 0.985;
      return;
    }

    analyser.getByteFrequencyData(freqData);

    // Frequency bins: 0..(fftSize/2 - 1)
    // Wir nehmen grob: Bass = erste ~8%, Treble = letzte ~25%
    const n = freqData.length;

    const bassEnd = Math.max(8, Math.floor(n * 0.08));
    const trebleStart = Math.floor(n * 0.75);

    let bassSum = 0;
    for (let i = 0; i < bassEnd; i++) bassSum += freqData[i];

    let trebleSum = 0;
    for (let i = trebleStart; i < n; i++) trebleSum += freqData[i];

    // Gesamtenergie = Mittelwert über z.B. erste Hälfte (wirkt musikalischer)
    const energyEnd = Math.floor(n * 0.5);
    let energySum = 0;
    for (let i = 0; i < energyEnd; i++) energySum += freqData[i];

    const bass = bassSum / (bassEnd * 255);
    const treble = trebleSum / ((n - trebleStart) * 255);
    const energy = energySum / (energyEnd * 255);

    // smoothing
    uniforms.uBass.value = uniforms.uBass.value * 0.85 + bass * 0.15;
    uniforms.uTreble.value = uniforms.uTreble.value * 0.85 + treble * 0.15;
    uniforms.uEnergy.value = uniforms.uEnergy.value * 0.85 + energy * 0.15;
  }

  // -------------------------
  // Animation loop
  // -------------------------
  let last = 0;

  function animate(now = performance.now()) {
    if (!renderer || !scene || !camera) return;

    if (!last) last = now;
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;

    // time: leicht musik-getrieben
    const SPEED = 0.20 + 0.10 * uniforms.uEnergy.value;
    uniforms.uTime.value += dt * SPEED;

    // update audio → uniforms
    updateAudioUniforms();

    // mouse velocity → v
    const velVec = localMouse.clone().sub(prevLocalMouse);
    prevLocalMouse.copy(localMouse);
    const v = Math.min(2, Math.max(0, velVec.length() * 12));

    // own state locally (so you see yourself even if no echo)
    if (myId) {
      users.set(myId, { x: localMouse.x, y: localMouse.y, v, updatedAt: Date.now() });
    }

    sendPsyInput(v);
    updateUsersUniform();

    renderer.render(scene, camera);
    frameId = requestAnimationFrame(animate);
  }

  // -------------------------
  // Mount / Destroy
  // -------------------------
  onMount(() => {
    if (!browser) return;
    if (!container) return;

    // three.js
    renderer = new THREE.WebGLRenderer({ antialias: true });
    container.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader
    });

    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(quad);

    resize();
    window.addEventListener("resize", resize, { passive: true });
    container.addEventListener("pointermove", onPointerMove, { passive: true });
    container.addEventListener("pointerdown", onPointerMove, { passive: true });

    // socket.io
    socket = io(SERVER_URL, {
      transports: ["websocket"]
      // path: "/socket.io" // nur nötig, wenn dein Proxy einen anderen Path nutzt
    });

    socket.on("connect", () => {
      myId = socket!.id;
      users.clear();
      socket!.emit("requestPsyUsers");
    });

    socket.on("psyUsers", (list: Array<{ id: string; x: number; y: number; v: number; updatedAt: number }>) => {
      for (const u of list) users.set(u.id, { x: u.x, y: u.y, v: u.v ?? 0, updatedAt: u.updatedAt ?? Date.now() });
    });

    socket.on("psyUser", (u: { id: string; x: number; y: number; v: number; updatedAt: number }) => {
      users.set(u.id, { x: u.x, y: u.y, v: u.v ?? 0, updatedAt: u.updatedAt ?? Date.now() });
    });

    socket.on("psyUserLeft", ({ id }: { id: string }) => {
      users.delete(id);
    });

    animate();
  });

  onDestroy(() => {
    if (!browser) return;

    if (frameId !== null) cancelAnimationFrame(frameId);
    window.removeEventListener("resize", resize);
    container?.removeEventListener("pointermove", onPointerMove);
    container?.removeEventListener("pointerdown", onPointerMove);

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

  // -------------------------
  // Shaders (Multi-user + audio-reactive)
  // -------------------------
  const vertexShader = /* glsl */`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position.xy, 0.0, 1.0);
    }
  `;

  const fragmentShader = /* glsl */`
    precision highp float;
    varying vec2 vUv;

    uniform float uTime;
    uniform vec2 uRes;
    uniform vec4 uUsers[16];
    uniform int uUserCount;

    uniform float uEnergy;
    uniform float uBass;
    uniform float uTreble;

    float hash21(vec2 p) {
      p = fract(p * vec2(123.34, 345.45));
      p += dot(p, p + 34.345);
      return fract(p.x * p.y);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      float a = hash21(i);
      float b = hash21(i + vec2(1.0, 0.0));
      float c = hash21(i + vec2(0.0, 1.0));
      float d = hash21(i + vec2(1.0, 1.0));
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
    }

    float fbm(vec2 p) {
      float v = 0.0;
      float a = 0.5;
      mat2 m = mat2(1.6, -1.2, 1.2, 1.6);
      for (int i = 0; i < 5; i++) {
        v += a * noise(p);
        p = m * p;
        a *= 0.55;
      }
      return v;
    }

    vec3 hsv2rgb(vec3 c) {
      vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
      vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
      return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
    }

    vec2 swirl(vec2 p, vec2 center, float strength) {
      vec2 d = p - center;
      float r = length(d);
      float ang = strength * exp(-r * 3.5);
      float s = sin(ang), c = cos(ang);
      mat2 rot = mat2(c, -s, s, c);
      return center + rot * d;
    }

    void main() {
      vec2 uv = vUv;

      vec2 p = (uv * 2.0 - 1.0);
      float aspect = uRes.x / uRes.y;
      p.x *= aspect;

      vec2 pw = p;
      float glowSum = 0.0;

      // audio: macht Swirls + Glow lebendiger
      float audioBoost = 0.6 + 1.2 * uEnergy;
      float bassBoost = 0.8 + 1.4 * uBass;

      for (int i = 0; i < 16; i++) {
        vec4 u = uUsers[i];
        if (u.w < 0.5) continue;

        vec2 m = (u.xy * 2.0 - 1.0);
        m.x *= aspect;

        float v = clamp(u.z, 0.0, 2.0);

        float strength = (0.50 + 0.40 * v) * bassBoost;
        pw = swirl(pw, m, strength);

        float dist = length(pw - m);
        glowSum += exp(-dist * (2.6 + 1.0 * uTreble)) * (0.10 + 0.22 * v) * audioBoost;
      }

      float t = uTime * (0.28 + 0.22 * uEnergy);

      vec2 q = pw;
      q += (0.20 + 0.08 * uBass) * vec2(
        fbm(pw * 2.0 + vec2(0.0, t)),
        fbm(pw * 2.0 + vec2(t, 0.0))
      );

      vec2 r = q;
      r += (0.34 + 0.12 * uEnergy) * vec2(
        fbm(q * 2.6 + vec2(2.1, 1.7) + t),
        fbm(q * 2.6 + vec2(1.3, 2.9) - t)
      );

      float f = fbm(r * (2.4 + 0.7 * uTreble) - t);

      float stripes = 0.5 + 0.5 * sin(
        (r.x * (4.4 + 1.2 * uTreble) + r.y * (2.9 + 0.9 * uTreble))
        + f * (5.6 + 2.0 * uEnergy)
        + uTime * (0.70 + 0.35 * uEnergy)
      );

      float hue = fract(0.13 * r.x + 0.18 * r.y + f * 0.55 + uTime * (0.06 + 0.10 * uTreble));
      float sat = 0.82 + 0.12 * sin(uTime + f * (5.0 + 3.0 * uEnergy));
      float val = 0.60 + (0.30 + 0.30 * uEnergy) * pow(stripes, 1.2);

      val += glowSum;
      sat += glowSum * 0.25;

      vec3 col = hsv2rgb(vec3(hue, clamp(sat, 0.0, 1.0), clamp(val, 0.0, 1.0)));

      float vig = smoothstep(1.35, 0.2, length(p));
      col *= vig;

      gl_FragColor = vec4(col, 1.0);
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
  }

  .audioBtn {
    position: fixed;
    left: 16px;
    top: 16px;
    z-index: 10;
    padding: 10px 14px;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.18);
    background: rgba(197, 97, 255, 0.55);
    color: white;
    font: inherit;
    cursor: pointer;
    backdrop-filter: blur(8px);
  }

  .audioErr {
    position: fixed;
    left: 16px;
    bottom: 64px;
    z-index: 10;
    max-width: min(560px, calc(100vw - 32px));
    padding: 10px 12px;
    border-radius: 12px;
    border: 1px solid rgba(255, 80, 80, 0.35);
    background: rgba(0, 0, 0, 0.65);
    color: rgba(255, 220, 220, 1);
    font: inherit;
    backdrop-filter: blur(8px);
  }
</style>

<div class="container" bind:this={container}></div>

{#if browser}
  <button class="audioBtn" on:click={() => (audioPlaying ? stopAudio() : startAudio())}>
    {audioPlaying ? "Stop Audio" : "Start Audio"}
  </button>

  {#if audioError}
    <div class="audioErr">
      {audioError}<br />
      Tipp: Prüfe, ob <code>{AUDIO_URL}</code> im Browser erreichbar ist und ob der Server CORS/Range erlaubt.
    </div>
  {/if}
{/if}
