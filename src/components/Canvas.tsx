import { component$, useVisibleTask$, useSignal } from "@builder.io/qwik";
import io from "socket.io-client";

export const Canvas = component$(() => {
  const color = useSignal("#000000");
  const lineWidth = useSignal(3);

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(() => {
    const socket = io("https://socket.fusch.fun/");
    const canvas = document.getElementById("drawingCanvas") as HTMLCanvasElement;
    const ctx = canvas.getContext("2d");

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      socket.emit("requestCanvasState");
    };
    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();

    let drawing = false;
    let lastX = 0;
    let lastY = 0;

    // pointer events
    const startDrawing = (e: PointerEvent | TouchEvent, start: boolean) => {
      drawing = start;
      const rect = canvas.getBoundingClientRect();
      if ('touches' in e) {
        // For touch events, use the first touch point
        lastX = e.touches[0].clientX - rect.left;
        lastY = e.touches[0].clientY - rect.top;
      } else {
        // For pointer events
        lastX = e.clientX - rect.left;
        lastY = e.clientY - rect.top;
      }
    };

    const draw = (e: PointerEvent | TouchEvent) => {
      if (!drawing) return;
      const rect = canvas.getBoundingClientRect();
      let x, y;
      if ('touches' in e) {
        x = e.touches[0].clientX - rect.left;
        y = e.touches[0].clientY - rect.top;
      } else {
        x = e.clientX - rect.left;
        y = e.clientY - rect.top;
      }
      socket.emit("draw", { x, y, lastX, lastY, color: color.value, lineWidth: lineWidth.value });
      drawLine(lastX, lastY, x, y, color.value, lineWidth.value);
      lastX = x;
      lastY = y;
    };

    const stopDrawing = () => {
      drawing = false;
    };

    // Pointer events for drawing
    canvas.addEventListener("pointerdown", (e) => startDrawing(e, true));
    canvas.addEventListener("pointerup", stopDrawing);
    canvas.addEventListener("pointermove", (e) => draw(e));

    // Touch events for mobile support
    canvas.addEventListener("touchstart", (e) => startDrawing(e, true));
    canvas.addEventListener("touchend", stopDrawing);
    canvas.addEventListener("touchmove", (e) => draw(e));

    socket.on("draw", ({ x, y, lastX, lastY, color, lineWidth }) => drawLine(lastX, lastY, x, y, color, lineWidth));
    socket.on("canvasState", (commands: { x: number, y: number, lastX: number, lastY: number, color: string, lineWidth: number }[]) => {
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
      commands.forEach(({ x, y, lastX, lastY, color, lineWidth }) => drawLine(lastX, lastY, x, y, color, lineWidth));
    });

    function drawLine(x1: number, y1: number, x2: number, y2: number, color: string | CanvasGradient | CanvasPattern, lineWidth: number) {
      ctx!.strokeStyle = color;
      ctx!.lineWidth = lineWidth;
      ctx!.lineCap = "round";
      ctx!.beginPath();
      ctx!.moveTo(x1, y1);
      ctx!.lineTo(x2, y2);
      ctx!.stroke();
    }
  });

  return (
    <div>
      <input type="color" class="fixed bottom-6 right-4 z-50" value={color.value} onInput$={(e) => {
        const target = e.target as HTMLInputElement | null;
        if (target) {
          color.value = target.value;
        }
      }} />
      <input type="range" min="1" max="20" value={lineWidth.value} class="fixed bottom-7 right-24 z-50" onInput$={(e) => {
        const target = e.target as HTMLInputElement;
        lineWidth.value = parseInt(target.value);
      }} />
      <canvas id="drawingCanvas" class="w-full h-full fixed top-0 left-0 pointer-events-auto" style="z-index: -1;"></canvas>
    </div>
  );
});
