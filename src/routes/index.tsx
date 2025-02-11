import { component$ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";
import Countdown from "~/components/Countdown";
import ThemeToggle from "~/components/ThemeToggle";

export default component$(() => {
  return (
    <>
      <div class="flex h-screen items-center justify-center">
        <div>
          <h1 class="text-4xl font-bold text-center mb-4">FUSCH</h1>
          <Countdown />
          <ThemeToggle />
        </div>
      </div>
    </>
  );
});

export const head: DocumentHead = {
  title: "Fusch",
  meta: [
    {
      name: "description",
      content: "Fusch Homepage",
    },
  ],
};
