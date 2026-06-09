<script>
  import Canvas from '$lib/Canvas.svelte';
  import Countdown from '$lib/Countdown.svelte';
  import PartyButton from '$lib/PartyButton.svelte';
  import PsychedelicCanvas from "$lib/PsychedelicCanvas.svelte";
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

<a href="https://wm.fusch.fun" target="_blank" rel="noopener noreferrer"
  class="fixed bottom-4 right-4 z-50 text-white/60 hover:text-white text-sm underline underline-offset-4 transition-colors">
  wm.fusch.fun
</a>

<PartyButton />

<PsychedelicCanvas />

<style>
</style>