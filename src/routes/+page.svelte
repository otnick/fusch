<script>
  import Canvas from '$lib/Canvas.svelte';
  import Countdown from '$lib/Countdown.svelte';
  import PartyButton from '$lib/PartyButton.svelte';
  import PsychedelicCanvas from "$lib/PsychedelicCanvas.svelte";
  import ArrowRight from '@lucide/svelte/icons/arrow-right';
</script>

<!-- <Canvas /> -->

<!-- Zentrale Überschrift + Countdown -->
<div class="fixed inset-0 flex items-center justify-center pointer-events-none z-50">
  <div class="pointer-events-none">
    <h1 class="text-8xl font-bold text-center mb-4 text-white">FUSCH</h1>
    <h3 class="text-5xl font-bold text-center text-white">8. August 2026</h3>
    <Countdown />
  </div>
</div>

<!-- Navigation: zur Lineup-Seite (interne SvelteKit-Route) -->
<a
  href="/lineup"
  aria-label="Zum Timetable / Line-Up"
  class="fixed right-4 z-50 inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/40 px-4 py-2.5 text-sm font-semibold text-white/90 shadow-lg backdrop-blur transition hover:bg-black/60 hover:text-white active:scale-95 bottom-[calc(1rem+env(safe-area-inset-bottom))]"
>
  Line-Up
  <ArrowRight size={16} />
</a>

<PartyButton />

<PsychedelicCanvas />

<style>
</style>