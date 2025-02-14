import { component$, useVisibleTask$, useSignal } from "@builder.io/qwik";
import io from "socket.io-client";

export const Canvas = component$(() => {
  const color = useSignal("#000000");
  const lineWidth = useSignal(3);

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(() => {
    const socket = io("https://fusch-backend.onrender.com");
    const canvas = document.getElementById("drawingCanvas") as HTMLCanvasElement;
    const ctx = canvas.getContext("2d");

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.touchAction = "none";

    let drawing = false;
    let lastX = 0;
    let lastY = 0;

    // Laden des gespeicherten Canvas-Zustands
    socket.emit("requestCanvasState");

    canvas.addEventListener("pointerdown", (e) => {
      drawing = true;
      const rect = canvas.getBoundingClientRect();
      lastX = e.clientX - rect.left;
      lastY = e.clientY - rect.top;
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
      socket.emit("draw", { x, y, color: color.value, lastX, lastY, lineWidth: lineWidth.value });
      drawLine(lastX, lastY, x, y, color.value, lineWidth.value);
      lastX = x;
      lastY = y;
    }

    socket.on("draw", ({ x, y, lastX, lastY, color, lineWidth }) => drawLine(lastX, lastY, x, y, color, lineWidth));

    socket.on("canvasState", (state) => {
      const img = new Image();
      img.src = state;
      img.onload = () => {
        if (ctx) ctx.drawImage(img, 0, 0);
      };
    });

    function drawLine(x1: number, y1: number, x2: number, y2: number, color: string, lineWidth: number) {
      if (ctx) {
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    }

    // Regelmäßiges Speichern des Canvas-Zustands
    setInterval(() => {
      const state = canvas.toDataURL();
      socket.emit("saveCanvasState", state);
    }, 1000);
  });

  return (
    <div>
      <input
        type="color"
        class="fixed bottom-6 right-4 z-50 rounded-md"
        value={color.value}
        onInput$={(e) => (color.value = (e.target as HTMLInputElement).value)}
      />
      <input
        type="range"
        min="1"
        max="20"
        value={lineWidth.value}
        class="fixed bottom-7 right-24 z-50"
        onInput$={(e) => (lineWidth.value = parseInt((e.target as HTMLInputElement).value))}
      />
      <canvas
        id="drawingCanvas"
        class="w-full h-full fixed top-0 left-0 pointer-events-auto"
        style="z-index: -1;"
      ></canvas>
    </div>
  );
});
