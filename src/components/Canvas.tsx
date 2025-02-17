import { component$, useVisibleTask$, useSignal } from "@builder.io/qwik";
import io from "socket.io-client";

export const Canvas = component$(() => {
  const color = useSignal("#000000");
  const lineWidth = useSignal(3);
  const isDrawing = useSignal(false);  // Flag, ob der Benutzer zeichnet
  const isMoving = useSignal(false);   // Flag, ob der Benutzer das Canvas verschiebt
  const offsetX = useSignal(0);        // Offset für Verschiebung
  const offsetY = useSignal(0);        // Offset für Verschiebung
  const zoomLevel = useSignal(1);      // Zoomlevel

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

    let lastX = 0;
    let lastY = 0;

    // Start Zeichnen
    const startDrawing = (e: PointerEvent | TouchEvent) => {
      if (isMoving.value) return;  // Keine Zeichnung, wenn Verschiebung aktiv ist
      isDrawing.value = true;
      const rect = canvas.getBoundingClientRect();
      if ('touches' in e) {
        lastX = e.touches[0].clientX - rect.left - offsetX.value;
        lastY = e.touches[0].clientY - rect.top - offsetY.value;
      } else {
        lastX = e.clientX - rect.left - offsetX.value;
        lastY = e.clientY - rect.top - offsetY.value;
      }
    };

    // Zeichnen
    const draw = (e: PointerEvent | TouchEvent) => {
      if (!isDrawing.value) return;
      const rect = canvas.getBoundingClientRect();
      let x, y;
      if ('touches' in e) {
        x = e.touches[0].clientX - rect.left - offsetX.value;
        y = e.touches[0].clientY - rect.top - offsetY.value;
      } else {
        x = e.clientX - rect.left - offsetX.value;
        y = e.clientY - rect.top - offsetY.value;
      }
      socket.emit("draw", { x, y, lastX, lastY, color: color.value, lineWidth: lineWidth.value });
      drawLine(lastX, lastY, x, y, color.value, lineWidth.value);
      lastX = x;
      lastY = y;
    };

    const stopDrawing = () => {
      isDrawing.value = false;
    };

    // Verschieben des Canvas
    let startMoveX = 0;
    let startMoveY = 0;

    const startMove = (e: TouchEvent | PointerEvent) => {
      if (isDrawing.value) return; // Verhindern, dass verschoben wird, während gezeichnet wird
      isMoving.value = true;
      const rect = canvas.getBoundingClientRect();
      if ('touches' in e) {
        startMoveX = e.touches[0].clientX - rect.left - offsetX.value;
        startMoveY = e.touches[0].clientY - rect.top - offsetY.value;
      } else {
        startMoveX = e.clientX - rect.left - offsetX.value;
        startMoveY = e.clientY - rect.top - offsetY.value;
      }
    };

    const moveCanvas = (e: TouchEvent | PointerEvent) => {
      if (!isMoving.value) return;
      const rect = canvas.getBoundingClientRect();
      let dx, dy;
      if ('touches' in e) {
        dx = e.touches[0].clientX - rect.left - startMoveX;
        dy = e.touches[0].clientY - rect.top - startMoveY;
      } else {
        dx = e.clientX - rect.left - startMoveX;
        dy = e.clientY - rect.top - startMoveY;
      }
      offsetX.value += dx;
      offsetY.value += dy;
      canvas.style.transform = `translate(${offsetX.value}px, ${offsetY.value}px) scale(${zoomLevel.value})`;
      if ('touches' in e) {
        startMoveX = e.touches[0].clientX - rect.left;
        startMoveY = e.touches[0].clientY - rect.top;
      } else {
        startMoveX = e.clientX - rect.left;
        startMoveY = e.clientY - rect.top;
      }
    };

    const stopMove = () => {
      isMoving.value = false;
    };

    // Verhindern des Scrollens bei Touch-Events
    const preventScroll = (e: TouchEvent) => {
      e.preventDefault();  // Verhindert das Scrollen
    };

    // Event Listeners für Zeichnen
    canvas.addEventListener("pointerdown", (e) => startDrawing(e));
    canvas.addEventListener("pointerup", stopDrawing);
    canvas.addEventListener("pointermove", (e) => draw(e));

    // Event Listeners für Touch
    canvas.addEventListener("touchstart", (e) => startDrawing(e));
    canvas.addEventListener("touchend", stopDrawing);
    canvas.addEventListener("touchmove", (e) => {
      draw(e);
      preventScroll(e);  // Verhindert das Scrollen beim Zeichnen
    });

    // Event Listeners für Verschiebung
    canvas.addEventListener("pointerdown", startMove);
    canvas.addEventListener("pointermove", moveCanvas);
    canvas.addEventListener("pointerup", stopMove);

    canvas.addEventListener("touchstart", startMove);
    canvas.addEventListener("touchmove", (e) => {
      moveCanvas(e);
      preventScroll(e);  // Verhindert das Scrollen beim Verschieben
    });
    canvas.addEventListener("touchend", stopMove);

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
