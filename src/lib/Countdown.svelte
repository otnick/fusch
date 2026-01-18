<script lang="ts">
    import { onMount } from 'svelte';
    import { writable } from 'svelte/store';
  
    const targetDate = new Date("2026-08-08T12:00:00").getTime();
  
    function calculateTimeLeft() {
      const now = new Date().getTime();
      const difference = targetDate - now;
  
      return {
        total: difference,
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / (1000 * 60)) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    }
  
    const timeLeft = writable(calculateTimeLeft());
  
    onMount(() => {
      const interval = setInterval(() => {
        const val = calculateTimeLeft();
        timeLeft.set(val);
        if (val.total <= 0) clearInterval(interval);
      }, 1000);
    });
  </script>
  
  <div class="text-4xl font-bold flex gap-4 text-shadow-white">
    {#if $timeLeft}
      <span>{$timeLeft.days}d</span>
      <span>{$timeLeft.hours}h</span>
      <span>{$timeLeft.minutes}m</span>
      <span>{$timeLeft.seconds}s</span>
    {/if}
  </div>
  