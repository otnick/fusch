<script>
  import Canvas from '$lib/Canvas.svelte';
  import Countdown from '$lib/Countdown.svelte';
  import PartyButton from '$lib/PartyButton.svelte';
  import PsychedelicCanvas from "$lib/PsychedelicCanvas.svelte";
</script>

<!-- <Canvas /> -->

<!-- Zentrale Überschrift + Countdown -->
<div class="fixed inset-0 flex items-center justify-center pointer-events-none container">
  <div>
    <h1 class="text-8xl font-bold text-center mb-4 text-white">FUSCH</h1>
    <Countdown />
  </div>
</div>

<PartyButton />
<PsychedelicCanvas />
<style>
  .container {
    z-index: 1000;
    width: 100vw;
    height: 100vh;
    max-width: none;
    max-height: none;
  }
</style>