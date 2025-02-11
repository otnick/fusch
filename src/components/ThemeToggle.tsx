import { $, component$, useSignal, useVisibleTask$ } from "@builder.io/qwik";

export default component$(() => {
  const isDark = useSignal(false);

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(() => {
    isDark.value = localStorage.getItem("theme") === "dark";
    document.documentElement.classList.toggle("dark", isDark.value);
  });

  const toggleTheme = $(
    () => {
       isDark.value = !isDark.value;
       document.documentElement.classList.toggle("dark", isDark.value);
       localStorage.setItem("theme", isDark.value ? "dark" : "light");
     }
  );

  return (
    <button
      class="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-800 text-black dark:text-white fixed top-4 right-4"
      onClick$={toggleTheme}
    >
      {isDark.value ? "🌙 Party Mode" : "☀️ Beach Mode"}
    </button>
  );
});
