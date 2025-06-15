<script>
    import Canvas from '$lib/Canvas.svelte';
    import Countdown from '$lib/Countdown.svelte';
    import PartyButton from '$lib/PartyButton.svelte';
  </script>
  
  <Canvas />
  
  <div class="flex h-screen items-center justify-center relative z-10" style="pointer-events: none;">
    <div>
      <h1 class="text-4xl font-bold text-center mb-4" style="color: red;">FUSCH</h1>
      <Countdown />
    </div>
  </div>
  
  <PartyButton />
  