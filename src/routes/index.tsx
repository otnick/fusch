import { component$ } from "@builder.io/qwik";
import { Canvas } from "~/components/Canvas";
import type { DocumentHead } from "@builder.io/qwik-city";
import Countdown from "~/components/Countdown";
import PartyButton from "~/components/PartyButton";

export default component$(() => {
  return (
    <>
      <div class="absolute inset-0 z-0" >
        <Canvas />
      </div>
      <div class="flex h-screen items-center justify-center relative z-10" style="pointer-events: none;">
        <div>
          <h1 class="text-4xl font-bold text-center mb-4" style="color: red;">FUSCH</h1>
          <Countdown />
        </div>
      </div>
      <PartyButton />
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