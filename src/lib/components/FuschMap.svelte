<script lang="ts">
  import { onMount } from "svelte";
  import { io, type Socket } from "socket.io-client";

  export let API_BASE: string;

  type MarkerDTO = {
    id: string;
    lat: number;
    lng: number;
    title: string;
    imageUrl: string;
    createdAt: number;
  };

  let mapEl: HTMLDivElement | null = null;
  let map: any = null;
  let L: any = null;
  let socket: Socket | null = null;

  const markerLayer = new Map<string, any>();
  const markerById = new Map<string, MarkerDTO>();
  let markers: MarkerDTO[] = [];

  let addMode = false;
  let draftLatLng: { lat: number; lng: number } | null = null;
  let draftMarker: any = null;

  // ✅ User location marker
  let userMarker: any = null;
  let userAccuracyCircle: any = null;
  let watchId: number | null = null;
  let lastUserLatLng: { lat: number; lng: number } | null = null;

  const EVT_SET_ADD_MODE = "fusch:setAddMode";
  const EVT_REQUEST_UPLOAD = "fusch:requestUpload";
  const EVT_CLEAR_DRAFT = "fusch:clearDraft";
  const EVT_MARKERS_UPDATED = "fusch:markersUpdated";
  const EVT_FOCUS_MARKER = "fusch:focusMarker";

  function emitMarkers() {
    window.dispatchEvent(new CustomEvent(EVT_MARKERS_UPDATED, { detail: markers }));
  }

  function escapeHtml(s: string) {
    return s.replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[c] ?? c));
  }

  function makePsyMarkerIcon() {
    return L.divIcon({
      className: "",
      html: `
        <div style="
          width:18px;height:18px;border-radius:999px;
          background: rgba(255,255,255,.92);
          border: 2px solid rgba(180,110,255,.95);
          box-shadow:
            0 0 0 6px rgba(180,110,255,.18),
            0 0 0 14px rgba(60,255,210,.09),
            0 0 26px rgba(180,110,255,.55),
            0 0 40px rgba(60,255,210,.35);
        "></div>
      `,
      iconSize: [18, 18],
      iconAnchor: [9, 9]
    });
  }

  // ✅ User location icon (distinct)
  function makeUserIcon() {
    return L.divIcon({
      className: "",
      html: `
        <div style="
          width:18px;height:18px;border-radius:999px;
          background: rgba(60,255,210,.95);
          border: 2px solid rgba(255,255,255,.9);
          box-shadow:
            0 0 0 7px rgba(60,255,210,.18),
            0 0 28px rgba(60,255,210,.55);
        "></div>
      `,
      iconSize: [18, 18],
      iconAnchor: [9, 9]
    });
  }

  function addMarkerToMap(m: MarkerDTO) {
    if (!map || !L) return;
    if (markerLayer.has(m.id)) return;

    markerById.set(m.id, m);

    const marker = L.marker([m.lat, m.lng], { icon: makePsyMarkerIcon() }).addTo(map);
    const imgUrl = API_BASE + m.imageUrl;

    marker.bindPopup(`
      <div style="max-width:260px">
        ${m.title ? `<div style="font-weight:900;margin-bottom:6px">${escapeHtml(m.title)}</div>` : ""}
        <img src="${imgUrl}" style="width:100%;border-radius:16px;display:block" />
        <div style="margin-top:8px;opacity:.75;font-size:12px">
          ${new Date(m.createdAt).toLocaleString()}
        </div>
      </div>
    `);

    markerLayer.set(m.id, marker);
  }

  function setDraft(lat: number, lng: number) {
    draftLatLng = { lat, lng };

    if (draftMarker) {
      try { draftMarker.remove(); } catch {}
      draftMarker = null;
    }

    const icon = L.divIcon({
      className: "",
      html: `
        <div style="
          width:18px;height:18px;border-radius:999px;
          background: rgba(255,255,255,.95);
          border: 2px solid rgba(60,255,210,.95);
          box-shadow:
            0 0 0 7px rgba(60,255,210,.18),
            0 0 0 16px rgba(180,110,255,.10),
            0 0 34px rgba(60,255,210,.55),
            0 0 46px rgba(180,110,255,.35);
        "></div>
      `,
      iconSize: [18, 18],
      iconAnchor: [9, 9]
    });

    draftMarker = L.marker([lat, lng], { icon }).addTo(map);
    window.dispatchEvent(new CustomEvent("fusch:draft", { detail: { lat, lng } }));
  }

  function clearDraft() {
    draftLatLng = null;
    if (draftMarker) {
      try { draftMarker.remove(); } catch {}
      draftMarker = null;
    }
    window.dispatchEvent(new CustomEvent("fusch:draft", { detail: null }));
  }

  async function loadInitialMarkers() {
    const res = await fetch(`${API_BASE}/api/markers`);
    const data = await res.json();
    if (!data?.ok) throw new Error(data?.error || "Failed to load markers");
    markers = data.markers as MarkerDTO[];
    markers.forEach(addMarkerToMap);
    emitMarkers();
  }

  function fitAllMarkers() {
    if (!map || !L) return;

    const points: Array<[number, number]> = [];
    for (const m of markers) points.push([m.lat, m.lng]);
    if (lastUserLatLng) points.push([lastUserLatLng.lat, lastUserLatLng.lng]);

    if (!points.length) return;

    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds.pad(0.25), { animate: true });
  }

  function invalidateSoon() {
    if (!map) return;
    setTimeout(() => {
      try { map.invalidateSize(true); } catch {}
    }, 0);
  }

  function setAddModeLocal(next: boolean) {
    addMode = next;
    if (!addMode) clearDraft();
    invalidateSoon();
  }

  function setAddModeAndBroadcast(next: boolean) {
    setAddModeLocal(next);
    window.dispatchEvent(new CustomEvent(EVT_SET_ADD_MODE, { detail: { enabled: addMode } }));
  }

  function focusMarker(id: string) {
    if (!map) return;
    const m = markerById.get(id) ?? markers.find(x => x.id === id);
    if (!m) return;

    map.setView([m.lat, m.lng], Math.max(map.getZoom?.() ?? 12, 14), { animate: true });

    const leafletMarker = markerLayer.get(id);
    if (leafletMarker) {
      setTimeout(() => {
        try { leafletMarker.openPopup(); } catch {}
      }, 150);
    }
  }

  // ✅ create/update user marker
  function setUserPosition(lat: number, lng: number, accuracy?: number) {
    lastUserLatLng = { lat, lng };

    if (!map || !L) return;

    if (!userMarker) {
      userMarker = L.marker([lat, lng], { icon: makeUserIcon(), interactive: false }).addTo(map);
    } else {
      userMarker.setLatLng([lat, lng]);
    }

    // accuracy circle (optional)
    if (typeof accuracy === "number" && Number.isFinite(accuracy)) {
      if (!userAccuracyCircle) {
        userAccuracyCircle = L.circle([lat, lng], {
          radius: Math.max(accuracy, 5),
          weight: 1,
          opacity: 0.3,
          fillOpacity: 0.08
        }).addTo(map);
      } else {
        userAccuracyCircle.setLatLng([lat, lng]);
        userAccuracyCircle.setRadius(Math.max(accuracy, 5));
      }
    }
  }

  function startWatchingUser() {
    if (!navigator.geolocation) return;

    // One immediate position for initial zoom
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setUserPosition(latitude, longitude, accuracy);
        map?.setView([latitude, longitude], 14, { animate: true });
      },
      () => {},
      { enableHighAccuracy: true, timeout: 6500 }
    );

    // Continuous updates
    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setUserPosition(latitude, longitude, accuracy);
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 10_000 }
    );
  }

  onMount(async () => {
    const mod: any = await import("leaflet");
    L = mod?.default ?? mod;

    map = L.map(mapEl!, { zoomControl: false, preferCanvas: true }).setView([53.55, 10.0], 11);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);

    invalidateSoon();
    const onResize = () => invalidateSoon();
    window.addEventListener("resize", onResize);

    map.on("click", (e: any) => {
      if (!addMode) return;
      setDraft(e.latlng.lat, e.latlng.lng);
    });

    // markers
    try { await loadInitialMarkers(); } catch (e) { console.warn(e); }

    socket = io(API_BASE, { withCredentials: true });
    socket.on("map:markers", (list: MarkerDTO[]) => {
      markers = list;
      markers.forEach(addMarkerToMap);
      emitMarkers();
    });
    socket.on("map:markerAdded", (m: MarkerDTO) => {
      markers = [...markers, m];
      addMarkerToMap(m);
      emitMarkers();
    });
    socket.emit("requestMarkers");

    // ✅ user marker
    startWatchingUser();

    // events
    const onRequestUpload = () => {
      window.dispatchEvent(new CustomEvent("fusch:uploadTarget", { detail: draftLatLng }));
    };
    const onSetAddMode = (ev: any) => setAddModeLocal(!!ev.detail?.enabled);
    const onClearDraft = () => clearDraft();
    const onFocus = (ev: any) => {
      const id = ev.detail?.id as string | undefined;
      if (id) focusMarker(id);
    };

    window.addEventListener(EVT_REQUEST_UPLOAD, onRequestUpload);
    window.addEventListener(EVT_SET_ADD_MODE, onSetAddMode);
    window.addEventListener(EVT_CLEAR_DRAFT, onClearDraft);
    window.addEventListener(EVT_FOCUS_MARKER, onFocus);

    return () => {
      try { socket?.disconnect(); } catch {}
      try { map?.remove(); } catch {}
      window.removeEventListener("resize", onResize);

      if (watchId !== null) {
        try { navigator.geolocation.clearWatch(watchId); } catch {}
      }

      window.removeEventListener(EVT_REQUEST_UPLOAD, onRequestUpload);
      window.removeEventListener(EVT_SET_ADD_MODE, onSetAddMode);
      window.removeEventListener(EVT_CLEAR_DRAFT, onClearDraft);
      window.removeEventListener(EVT_FOCUS_MARKER, onFocus);
    };
  });
</script>

<div class="relative">
  <div
    bind:this={mapEl}
    class="w-full {addMode ? 'cursor-crosshair' : 'cursor-grab'}"
    style="height: 76vh; min-height: 520px;"
  />

  <div class="absolute top-4 left-4 right-4 z-[2100] pointer-events-none">
    <div class="flex items-center justify-between gap-3">
      <div class="pointer-events-auto flex items-center gap-2">
        <button
          class="psy-btn px-4 py-2 text-sm font-bold tracking-wide {addMode ? 'psy-btn--active' : ''}"
          on:click={() => setAddModeAndBroadcast(!addMode)}
        >
          {#if addMode} ✦ ADD MODE {:else} ➕ ADD MARKER {/if}
        </button>

        {#if addMode}
          <button class="psy-btn px-4 py-2 text-sm font-semibold" on:click={() => clearDraft()}>
            Reset
          </button>
        {/if}
      </div>

      <div class="pointer-events-auto flex items-center gap-2">
        <button class="psy-btn px-4 py-2 text-sm font-semibold" on:click={() => fitAllMarkers()}>
          🗺️ Alle
        </button>
      </div>
    </div>
  </div>

  {#if addMode}
    <div class="absolute bottom-4 left-4 right-4 z-[2100] pointer-events-none">
      <div class="pointer-events-auto mx-auto max-w-[560px] rounded-2xl bg-surface-900/70 backdrop-blur border border-surface-50/10 p-3 shadow-2xl">
        <div class="text-sm text-surface-50">
          <span class="font-extrabold tracking-wide">ADD MODE</span>
          <span class="opacity-80"> — Klick auf die Karte, dann im Panel hochladen.</span>
        </div>
      </div>
    </div>
  {/if}
</div>
