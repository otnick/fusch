<script lang="ts">
  export let API_BASE: string;

  type MarkerDTO = {
    id: string;
    lat: number;
    lng: number;
    title: string;
    imageUrl: string;
    createdAt: number;
  };

  let markers: MarkerDTO[] = [];

  function onMarkersUpdated(ev: any) {
    markers = (ev.detail as MarkerDTO[]) ?? [];
    // newest first
    markers = [...markers].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  }

  function focus(id: string) {
    window.dispatchEvent(new CustomEvent("fusch:focusMarker", { detail: { id } }));
  }

  if (typeof window !== "undefined") {
    window.addEventListener("fusch:markersUpdated", onMarkersUpdated);
  }
</script>

<div class="rounded-2xl border border-surface-50/10 bg-surface-950/30 p-4">
  <div class="flex items-center justify-between gap-3 mb-3">
    <div>
      <div class="font-extrabold tracking-tight">🌀 Galerie</div>
      <div class="text-xs opacity-70">Neueste Sticker zuerst – antippen zum Hinzoomen</div>
    </div>
    <span class="badge variant-soft-surface">{markers.length}</span>
  </div>

  {#if markers.length === 0}
    <div class="text-sm opacity-75">
      Noch keine Sticker. Sticker-Mode aktivieren und den ersten Spot pinnen ✨
    </div>
  {:else}
    <div class="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-3">
      {#each markers.slice(0, 12) as m (m.id)}
        <button
          class="group relative overflow-hidden rounded-xl border border-surface-50/10 bg-surface-900/20 aspect-square"
          on:click={() => focus(m.id)}
          title={m.title || "Spot"}
        >
          <img
            src={API_BASE + m.imageUrl}
            alt={m.title || "Spot"}
            class="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
            loading="lazy"
          />
          <div class="absolute inset-x-0 bottom-0 p-1.5 text-[11px] leading-tight bg-gradient-to-t from-black/75 to-transparent">
            <div class="truncate font-semibold">{m.title || "Untitled"}</div>
          </div>
        </button>
      {/each}
    </div>

    {#if markers.length > 12}
      <div class="mt-3 text-xs opacity-70">
        Zeige 12 von {markers.length}. (Wenn du willst, bau ich dir „Mehr anzeigen“ als Drawer.)
      </div>
    {/if}
  {/if}
</div>
