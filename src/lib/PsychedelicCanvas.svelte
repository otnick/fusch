<script lang="ts">
import { onMount, onDestroy } from "svelte";
import { browser } from "$app/environment";
import * as THREE from "three";
import { io, type Socket } from "socket.io-client";

// -------------------------
// Config
// -------------------------
const SERVER_URL = "http://localhost:3000"; // <-- anpassen
const MAX_USERS = 16;

let container: HTMLDivElement | null = null;

let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene | null = null;
let camera: THREE.OrthographicCamera | null = null;
let material: THREE.ShaderMaterial | null = null;

let frameId: number | null = null;
let socket: Socket | null = null;

// Local pointer target (0..1)
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
// vec4 array: (x, y, v, activeFlag)
uUsers: { value: Array.from({ length: MAX_USERS }, () => new THREE.Vector4(0.5, 0.5, 0.0, 0.0)) },
uUserCount: { value: 0 }
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
const rect = container.getBoundingClientRect();
const x = (e.clientX - rect.left) / rect.width;
const y = 1 - (e.clientY - rect.top) / rect.height;
localMouse.set(clamp01(x), clamp01(y));
}

// Update the uUsers uniform array from "users" map
function updateUsersUniform() {
const arr = uniforms.uUsers.value as THREE.Vector4[];
// mark all inactive
for (let i = 0; i < MAX_USERS; i++) arr[i].set(0.5, 0.5, 0.0, 0.0);

// take latest MAX_USERS
const entries = Array.from(users.entries())
    .sort((a, b) => (b[1].updatedAt - a[1].updatedAt))
    .slice(0, MAX_USERS);

for (let i = 0; i < entries.length; i++) {
    const [, s] = entries[i];
    arr[i].set(s.x, s.y, s.v, 1.0);
}

uniforms.uUserCount.value = entries.length;
}

// Throttled send (30Hz)
let lastSend = 0;
function sendPsyInput(v: number) {
if (!socket || !myId) return;
const now = performance.now();
if (now - lastSend < 33) return;
lastSend = now;

socket.emit("psy:input", { x: localMouse.x, y: localMouse.y, v, ts: Date.now() });
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

const SPEED = 0.22; // ruhiger
uniforms.uTime.value += dt * SPEED;

// Local velocity magnitude (for sending + some "energy")
const velVec = localMouse.clone().sub(prevLocalMouse);
prevLocalMouse.copy(localMouse);

// Scale v into a usable range (0..2-ish)
const v = Math.min(2, Math.max(0, velVec.length() * 12));

// Update own state locally (so you see yourself even if no echo)
if (myId) {
    users.set(myId, { x: localMouse.x, y: localMouse.y, v, updatedAt: Date.now() });
}

// Push to server (throttled)
sendPsyInput(v);

// Update uniforms from map
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
window.addEventListener("pointermove", onPointerMove, { passive: true });

// socket.io
socket = io(SERVER_URL, { transports: ["websocket"] });

socket.on("connect", () => {
    myId = socket!.id;
    socket!.emit("requestPsyUsers");
});

// initial bulk list
socket.on("psyUsers", (list: Array<{ id: string; x: number; y: number; v: number; updatedAt: number }>) => {
    for (const u of list) users.set(u.id, { x: u.x, y: u.y, v: u.v ?? 0, updatedAt: u.updatedAt ?? Date.now() });
});

// incremental updates
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
window.removeEventListener("pointermove", onPointerMove);

socket?.disconnect();
socket = null;

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
// Shaders (Multi-user)
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

    // aspect-correct "world space"
    vec2 p = (uv * 2.0 - 1.0);
    float aspect = uRes.x / uRes.y;
    p.x *= aspect;

    // build a combined multi-user warp + glow
    vec2 pw = p;
    float glowSum = 0.0;

    // apply swirls sequentially
    for (int i = 0; i < 16; i++) {
    vec4 u = uUsers[i];
    if (u.w < 0.5) continue; // inactive

    vec2 m = (u.xy * 2.0 - 1.0);
    m.x *= aspect;

    // v (0..2-ish) from user
    float v = clamp(u.z, 0.0, 2.0);

    // calmer strengths
    float strength = 0.55 + 0.45 * v; // was wilder
    pw = swirl(pw, m, strength);

    float dist = length(pw - m);
    glowSum += exp(-dist * 2.8) * (0.12 + 0.18 * v);
    }

    // flow field
    float t = uTime * 0.30; // calmer
    vec2 q = pw;
    q += 0.22 * vec2(
    fbm(pw * 2.0 + vec2(0.0, t)),
    fbm(pw * 2.0 + vec2(t, 0.0))
    );

    vec2 r = q;
    r += 0.38 * vec2(
    fbm(q * 2.6 + vec2(2.1, 1.7) + t),
    fbm(q * 2.6 + vec2(1.3, 2.9) - t)
    );

    float f = fbm(r * 2.6 - t);
    float stripes = 0.5 + 0.5 * sin((r.x * 4.6 + r.y * 3.0) + f * 5.8 + uTime * 0.75);

    float hue = fract(0.13 * r.x + 0.18 * r.y + f * 0.55 + uTime * 0.06);
    float sat = 0.85 + 0.10 * sin(uTime + f * 5.0);
    float val = 0.62 + 0.32 * pow(stripes, 1.2);

    // collective glow
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
</style>

<div class="container" bind:this={container}></div>
