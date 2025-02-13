import { $, component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";
import confetti from "canvas-confetti";

export default component$(() => {
  const isDark = useSignal(false);
  const confettiInterval = useSignal<number | undefined>(undefined);

  // Helper-Funktion für zufällige Zahl in einem Bereich
  const randomInRange = $(
    // Helper-Funktion für zufällige Zahl in einem Bereich
    function randomInRange(min: number, max: number) {
        return Math.random() * (max - min) + min;
    }
  );

  // 🛑 Stoppt das Konfetti
  const stopConfetti = $(() => {
    if (confettiInterval.value) {
      clearInterval(confettiInterval.value);
      confettiInterval.value = undefined;
    }
  });

  // 🎉 Startet das Konfetti mit deinem gewünschten Effekt
  const startConfetti = $(() => {
    stopConfetti();
    const duration = 15 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    confettiInterval.value = window.setInterval(async () => {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) {
        stopConfetti();
        return;
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti({
        ...defaults,
        particleCount,
        origin: { x: await randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: await randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      });
    }, 250);
  });

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(() => {
    try {
      const storedTheme = localStorage.getItem("theme");
      isDark.value = storedTheme === "dark";
      document.documentElement.classList.toggle("dark", isDark.value);
      if (isDark.value) startConfetti();
    } catch (e) {
      console.warn("localStorage is not available", e);
    }
  });

  // 🔀 Toggle zwischen Party und Beach Mode
  const toggleTheme = $(() => {
    isDark.value = !isDark.value;
    document.documentElement.classList.toggle("dark", isDark.value);
    localStorage.setItem("theme", isDark.value ? "dark" : "light");

    if (isDark.value) {
      startConfetti();
    } else {
      stopConfetti();
    }
  });

  // 🎛️ Button
  return (
    <button
      class="px-4 py-2 rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg hover:scale-105 transition-transform fixed top-4 right-4"
      onClick$={toggleTheme}
    >
      {isDark.value ? "🎉 Party Mode" : "☀️ Beach Mode"}
    </button>
  );
});
