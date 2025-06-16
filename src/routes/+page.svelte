<script>
  import Canvas from '$lib/Canvas.svelte';
  import Countdown from '$lib/Countdown.svelte';
  import PartyButton from '$lib/PartyButton.svelte';
</script>

<Canvas />

<!-- Zentrale Überschrift + Countdown -->
<div class="fixed inset-0 flex items-center justify-center pointer-events-none z-10">
  <div>
    <h1 class="text-4xl font-bold text-center mb-4 text-red-600">FUSCH</h1>
    <Countdown />
  </div>
</div>

<PartyButton />
