<script lang="ts">
    import { onMount } from 'svelte';
    import confetti from 'canvas-confetti';
    import { io } from 'socket.io-client';
  
    let confettiInterval: number | undefined;
    let socket: any;
  
    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;
  
    function stopConfetti() {
      if (confettiInterval) {
        clearInterval(confettiInterval);
        confettiInterval = undefined;
      }
    }
  
    function startConfetti() {
      stopConfetti();
      const duration = 5000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };
  
      const x1 = randomInRange(0.1, 0.3);
      const x2 = randomInRange(0.7, 0.9);
  
      confettiInterval = window.setInterval(() => {
        const timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) {
          stopConfetti();
          return;
        }
  
        const particleCount = 50 * (timeLeft / duration);
        confetti({ ...defaults, particleCount, origin: { x: x1, y: Math.random() - 0.2 } });
        confetti({ ...defaults, particleCount, origin: { x: x2, y: Math.random() - 0.2 } });
      }, 250);
    }
  
    onMount(() => {
      socket = io("https://socket.fusch.fun/");
      socket.on("partyState", (state: any) => {
        if (state) startConfetti();
        else stopConfetti();
      });
    });
  
    function toggleParty() {
      socket?.emit("togglePartyState");
    }
  </script>
  
  <button
    on:click={toggleParty}
    class="px-4 py-2 rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg hover:scale-105 transition-transform fixed top-3 right-4 z-100"
  >
    🎉 Party Mode
  </button>
  