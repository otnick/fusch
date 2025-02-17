import { $, component$, useSignal } from "@builder.io/qwik";
import confetti from "canvas-confetti";

export default component$(() => {
  const confettiInterval = useSignal<number | undefined>(undefined);

  // Helper-Funktion für zufällige Zahl in einem Bereich (asynchron)
  const randomInRange = $(async function randomInRange(min: number, max: number) {
    return Math.random() * (max - min) + min;
  });

  // 🛑 Stoppt das Konfetti
  const stopConfetti = $(() => {
    if (confettiInterval.value) {
      clearInterval(confettiInterval.value);
      confettiInterval.value = undefined;
    }
  });

  // 🎉 Startet das Konfetti mit deinem gewünschten Effekt
  const startConfetti = $(() => {
    console.log("🎉 Party Mode activated!");
    stopConfetti();
    const duration = 5 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    // Den Zufallswert für die Ursprungskoodinaten vor dem Start holen
    const getRandomValues = async () => {
      const x1 = await randomInRange(0.1, 0.3);
      const x2 = await randomInRange(0.7, 0.9);
      return { x1, x2 };
    };

    getRandomValues().then(({ x1, x2 }) => {
      confettiInterval.value = window.setInterval(() => {
        const timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) {
          stopConfetti();
          return;
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti({
          ...defaults,
          particleCount,
          origin: { x: x1, y: Math.random() - 0.2 },
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: x2, y: Math.random() - 0.2 },
        });
      }, 250);
    });
  });

  // 🎛️ Button
  return (
    <button
      class="px-4 py-2 rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg hover:scale-105 transition-transform fixed top-4 right-4"
      onClick$={startConfetti}
    >
      {"🎉 Party Mode"}
    </button>
  );
});
