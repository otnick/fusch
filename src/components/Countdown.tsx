import { component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";

export default component$(() => {
  const targetDate = new Date("2025-07-26T12:00:00").getTime();
  const timeLeft = useSignal(calculateTimeLeft(targetDate));

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(() => {
    const interval = setInterval(() => {
      timeLeft.value = calculateTimeLeft(targetDate);
      if (timeLeft.value.total <= 0) clearInterval(interval);
    }, 1000);
  });

  return (
    <div>
      <div class="text-4xl font-bold flex gap-4">
        <span>{timeLeft.value.days}d</span>
        <span>{timeLeft.value.hours}h</span>
        <span>{timeLeft.value.minutes}m</span>
        <span>{timeLeft.value.seconds}s</span>
      </div>
    </div>
  );
});

function calculateTimeLeft(target: number) {
  const now = new Date().getTime();
  const difference = target - now;

  return {
    total: difference,
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / (1000 * 60)) % 60),
    seconds: Math.floor((difference / 1000) % 60),
  };
}
