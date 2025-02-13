import { component$, useVisibleTask$, useSignal } from "@builder.io/qwik";
import io from "socket.io-client";

export const Canvas = component$(() => {
  const color = useSignal("#000000");

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(() => {
    const socket = io("https://fusch-backend.onrender.com");
    const canvas = document.getElementById("drawingCanvas") as HTMLCanvasElement;
    const ctx = canvas.getContext("2d");

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let drawing = false;

    // Laden des gespeicherten Canvas-Zustands
    socket.emit("requestCanvasState");

    canvas.addEventListener("pointerdown", (e) => {
      drawing = true;
      drawAndEmit(e);
    });

    canvas.addEventListener("pointerup", () => (drawing = false));
    canvas.addEventListener("pointermove", (e) => {
      if (!drawing) return;
      drawAndEmit(e);
    });

    function drawAndEmit(e: PointerEvent) {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      socket.emit("draw", { x, y, color: color.value });
      drawLine(x, y, color.value);
    }

    socket.on("draw", ({ x, y, color }) => drawLine(x, y, color));

    socket.on("canvasState", (state) => {
      const img = new Image();
      img.src = state;
      img.onload = () => {
        if (ctx) ctx.drawImage(img, 0, 0);
      };
    });

    function drawLine(x: number, y: number, color: string) {
      if (ctx) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Regelmäßiges Speichern des Canvas-Zustands
    setInterval(() => {
      const state = canvas.toDataURL();
      socket.emit("saveCanvasState", state);
    }, 5000);
  });

  return (
    <div>
      <input
        type="color"
        class="fixed top-6 right-44 z-50 rounded-md"
        value={color.value}
        onInput$={(e) => (color.value = (e.target as HTMLInputElement).value)}
      />
      <canvas
        id="drawingCanvas"
        class="w-full h-full fixed top-0 left-0 pointer-events-auto"
        style="z-index: -1;"
      ></canvas>
    </div>
  );
});