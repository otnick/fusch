import { component$, useVisibleTask$, useSignal, $ } from "@builder.io/qwik";
import confetti from "canvas-confetti";
import  {socket}  from "./Canvas"; // Importiere den bestehenden Socket aus dem Canvas-File

export default component$(() => {
  const confettiInterval = useSignal<number | undefined>(undefined);

  const stopConfetti = $(() => {
    if (confettiInterval.value) {
      clearInterval(confettiInterval.value);
      confettiInterval.value = undefined;
    }
  });

  const startConfetti = $(() => {
    stopConfetti();
    const duration = 5 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    confettiInterval.value = window.setInterval(() => {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) {
        stopConfetti();
        return;
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: Math.random(), y: Math.random() - 0.2 } });
    }, 250);
  });

  useVisibleTask$(() => {
    socket.on('partyState', (state: any) => {
      if (state) startConfetti();
      else stopConfetti();
    });
  });

  return (
    <button
      class="px-4 py-2 rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg hover:scale-105 transition-transform fixed top-4 right-4"
      onClick$={() => socket.emit('togglePartyState')}
    >
      {"🎉 Party Mode"}
    </button>
  );
});
