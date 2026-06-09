<script lang="ts">
  import FuschMap from "$lib/components/FuschMap.svelte";
  import MarkerUploadPanel from "$lib/components/MarkerUploadPanel.svelte";

  const API_BASE = "http://localhost:3000";
</script>

<div class="min-h-screen bg-surface-950 text-surface-50">
  <!-- Psychedelic header -->
  <div class="relative overflow-hidden">
    <div class="absolute inset-0">
      <div class="absolute -top-40 -left-40 w-[680px] h-[680px] rounded-full blur-3xl bg-primary-500/25"></div>
      <div class="absolute top-10 -right-40 w-[720px] h-[720px] rounded-full blur-3xl bg-tertiary-500/20"></div>
      <div class="absolute -bottom-52 left-1/3 w-[820px] h-[820px] rounded-full blur-3xl bg-secondary-500/15"></div>
      <div class="absolute inset-0 bg-gradient-to-b from-surface-950/20 via-surface-950/65 to-surface-950"></div>
      <div class="absolute inset-0 opacity-[0.08] [background-image:radial-gradient(#fff_1px,transparent_1px)] [background-size:18px_18px]"></div>
    </div>

    <div class="relative px-4 pt-6 pb-4 md:px-8 md:pt-10 md:pb-6">
      <div class="mx-auto max-w-7xl">
        <div class="flex items-start justify-between gap-6">
          <div class="space-y-2">
            <div class="inline-flex items-center gap-2 rounded-full px-3 py-1 bg-surface-50/10 backdrop-blur border border-surface-50/10">
              <span class="text-xs tracking-widest opacity-90">FUSCH</span>
              <span class="w-1.5 h-1.5 rounded-full bg-primary-400"></span>
              <span class="text-xs opacity-80">psychedelic map</span>
            </div>

            <h1 class="text-2xl md:text-4xl font-extrabold tracking-tight">
              📍 Festival-Spots
            </h1>

            <p class="opacity-80 max-w-[75ch]">
              Add-Mode aktivieren → Karte klicken → Sticker hochladen. Marker anklicken = Bild anschauen.
            </p>
          </div>

          <div class="hidden md:flex items-center gap-2">
            <a class="btn variant-soft-surface" href="/">Zurück</a>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Content -->
  <div class="px-4 pb-10 md:px-8">
    <div class="mx-auto max-w-7xl">
      <!-- Mobile: stacked -->
      <div class="grid gap-4 lg:hidden">
        <div class="card p-0 overflow-hidden border border-surface-50/10 bg-surface-900/30">
          <FuschMap {API_BASE} />
        </div>
        <MarkerUploadPanel {API_BASE} />
      </div>

      <!-- Desktop: side-by-side (panel NOT overlay) -->
      <div class="hidden lg:grid gap-4 lg:grid-cols-[minmax(0,1fr)_420px] items-start">
        <!-- Map column -->
        <div class="card p-0 overflow-hidden border border-surface-50/10 bg-surface-900/30">
          <FuschMap {API_BASE} />
        </div>

        <!-- Panel column -->
        <div class="sticky top-4">
          <MarkerUploadPanel {API_BASE} />
        </div>
      </div>
    </div>
  </div>
</div>
