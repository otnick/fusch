<script lang="ts">
    import { onMount } from 'svelte';
    import { io } from 'socket.io-client';
    let color = '#000000';
    let lineWidth = 3;
    let canvas: HTMLCanvasElement;
    let socket: ReturnType<typeof io>;
  
    onMount(() => {
      socket = io("https://socket.fusch.fun/");
  
      const ctx = canvas.getContext("2d")!;
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
  
      const startDrawing = (x: number, y: number) => {
        drawing = true;
        lastX = x;
        lastY = y;
      };
  
      const stopDrawing = () => {
        drawing = false;
      };
  
      const draw = (x: number, y: number) => {
        if (!drawing) return;
        socket.emit("draw", { x, y, lastX, lastY, color, lineWidth });
        drawLine(lastX, lastY, x, y, color, lineWidth);
        lastX = x;
        lastY = y;
      };
  
      function drawLine(x1: number, y1: number, x2: number, y2: number, color: string, lineWidth: number) {
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
  
      const getCoords = (e: PointerEvent) => {
        const rect = canvas.getBoundingClientRect();
        return [e.clientX - rect.left, e.clientY - rect.top];
      };
  
      canvas.addEventListener("pointerdown", (e) => {
        const [x, y] = getCoords(e);
        startDrawing(x, y);
      });
      canvas.addEventListener("pointermove", (e) => {
        const [x, y] = getCoords(e);
        draw(x, y);
      });
      canvas.addEventListener("pointerup", stopDrawing);
      canvas.addEventListener("pointerout", stopDrawing);
  
      socket.on("draw", ({ x, y, lastX, lastY, color, lineWidth }) =>
        drawLine(lastX, lastY, x, y, color, lineWidth)
      );
  
      socket.on("canvasState", (commands) => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        commands.forEach(({ x, y, lastX, lastY, color, lineWidth }) =>
          drawLine(lastX, lastY, x, y, color, lineWidth)
        );
      });
  
      document.body.style.overflow = 'hidden';
    });
  </script>
  
  <div class="bg-secondary-50 w-42 h-7 fixed top-4 left-4 z-50 rounded-md shadow-lg flex items-center justify-center">
    <input type="color" bind:value={color} class="fixed top-4 left-5 z-50" />
  </div>
  <input type="range" min="1" max="20" bind:value={lineWidth} class="fixed top-5.5 left-24 z-50 w-20" />
  
  <canvas
    bind:this={canvas}
    class="w-full h-full"
    style="z-index: 0; pointer-events: auto; background-color: rgba(255, 255, 255, 0.05);"
  >
  </canvas>