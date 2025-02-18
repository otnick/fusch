import { $, component$, useSignal, useVisibleTask$, noSerialize } from "@builder.io/qwik";
import confetti from "canvas-confetti";
import io from "socket.io-client";

export default component$(() => {
  const confettiInterval = useSignal<number | undefined>(undefined);
  const socket = useSignal<any>(noSerialize(undefined));  // 👈 Wichtig: noSerialize verwenden

  const randomInRange = $(async (min: number, max: number) => Math.random() * (max - min) + min);

  const stopConfetti = $(() => {
    if (confettiInterval.value) {
      clearInterval(confettiInterval.value);
      confettiInterval.value = undefined;
    }
  });

  const startConfetti = $(() => {
    stopConfetti();
    const duration = 5000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    const getRandomValues = async () => ({
      x1: await randomInRange(0.1, 0.3),
      x2: await randomInRange(0.7, 0.9),
    });

    getRandomValues().then(({ x1, x2 }) => {
      confettiInterval.value = window.setInterval(() => {
        const timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) {
          stopConfetti();
          return;
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti({ ...defaults, particleCount, origin: { x: x1, y: Math.random() - 0.2 } });
        confetti({ ...defaults, particleCount, origin: { x: x2, y: Math.random() - 0.2 } });
      }, 250);
    });
  });

  // Socket.IO initialisieren
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(() => {
    socket.value = noSerialize(io("https://socket.fusch.fun/"));  // 👈 Hier auch noSerialize

    socket.value.on('partyState', (state: any) => {
      if (state) startConfetti();
      else stopConfetti();
    });
  });

  // Toggle-Party-Event für den Button
  const toggleParty = $(() => {
    socket.value?.emit('togglePartyState');
  });

  return (
    <button
      class="px-4 py-2 rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg hover:scale-105 transition-transform fixed top-4 right-4"
      onClick$={toggleParty}
    >
      {"🎉 Party Mode"}
    </button>
  );
});
