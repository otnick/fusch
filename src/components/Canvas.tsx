import { component$, useVisibleTask$, useSignal } from "@builder.io/qwik";
import io from "socket.io-client";
export const socket = io('https://socket.fusch.fun/');

export default component$(() => {
  const color = useSignal("#000000");
  const lineWidth = useSignal(3);

  // Initialisieren des Canvas
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(() => {
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

    // Funktion für den Anfang eines Zeichnens
    const startDrawing = (x: number, y: number) => {
      drawing = true;
      lastX = x;
      lastY = y;
    };

    // Funktion zum Stoppen des Zeichnens
    const stopDrawing = () => {
      drawing = false;
    };

    // Funktion für das Zeichnen der Linie
    const draw = (x: number, y: number) => {
      if (!drawing) return;

      socket.emit("draw", { x, y, lastX, lastY, color: color.value, lineWidth: lineWidth.value });
      drawLine(lastX, lastY, x, y, color.value, lineWidth.value);
      lastX = x;
      lastY = y;
    };

    // Funktion zum Zeichnen der Linie auf dem Canvas
    function drawLine(x1: number, y1: number, x2: number, y2: number, color: string | CanvasGradient | CanvasPattern, lineWidth: number) {
      ctx!.strokeStyle = color;
      ctx!.lineWidth = lineWidth;
      ctx!.lineCap = "round";
      ctx!.beginPath();
      ctx!.moveTo(x1, y1);
      ctx!.lineTo(x2, y2);
      ctx!.stroke();
    }

    // Pointer Events (Für Maus und Touch)
    const handlePointerDown = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      startDrawing(x, y);
    };

    const handlePointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      draw(x, y);
    };

    const handlePointerUp = () => {
      stopDrawing();
    };

    // Listener für Pointer Events (Maus und Touch)
    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerup", handlePointerUp);
    canvas.addEventListener("pointerout", handlePointerUp);

    // Empfangen der Zeichendaten vom Server
    socket.on("draw", ({ x, y, lastX, lastY, color, lineWidth }) => drawLine(lastX, lastY, x, y, color, lineWidth));

    // Canvas neu zeichnen mit übergebenen Befehlen
    socket.on("canvasState", (commands: { x: number, y: number, lastX: number, lastY: number, color: string, lineWidth: number }[]) => {
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
      commands.forEach(({ x, y, lastX, lastY, color, lineWidth }) => drawLine(lastX, lastY, x, y, color, lineWidth));
    });

  });

  // Verhindern des Scrollens
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(() => {
    document.body.style.overflow = 'hidden'; // Verhindert das Scrollen der Seite
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
