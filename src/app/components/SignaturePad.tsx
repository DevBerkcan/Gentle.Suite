"use client";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

export interface SignaturePadHandle {
  getDataUrl: () => string | null;
  clear: () => void;
}

const SignaturePad = forwardRef<SignaturePadHandle>(function SignaturePad(_props, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  function getPos(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY };
    }
    return { x: ((e as React.MouseEvent).clientX - rect.left) * scaleX, y: ((e as React.MouseEvent).clientY - rect.top) * scaleY };
  }

  function startDraw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault();
    isDrawing.current = true;
    const canvas = canvasRef.current!;
    const pos = getPos(e, canvas);
    const ctx = canvas.getContext("2d")!;
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  }

  function draw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    if (!isDrawing.current) return;
    e.preventDefault();
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1e293b";
    const pos = getPos(e, canvas);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  }

  function stopDraw() {
    isDrawing.current = false;
  }

  function clearCanvas() {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  useImperativeHandle(ref, () => ({
    clear: clearCanvas,
    getDataUrl: () => {
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext("2d")!;
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      const hasContent = Array.from(data).some((v, i) => i % 4 !== 3 && v < 250);
      if (!hasContent) return null;
      return canvas.toDataURL("image/png");
    },
  }));

  return (
    <div className="relative rounded-lg overflow-hidden bg-white border border-border" style={{ touchAction: "none" }}>
      <button
        onClick={clearCanvas}
        className="absolute top-2 right-2 z-10 text-slate-400 hover:text-slate-600 text-lg leading-none bg-white rounded-full w-7 h-7 flex items-center justify-center shadow-sm"
        title="Zurücksetzen"
        type="button"
      >
        ↺
      </button>
      <canvas
        ref={canvasRef}
        width={560}
        height={180}
        className="w-full block cursor-crosshair"
        style={{ touchAction: "none", display: "block" }}
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={stopDraw}
        onMouseLeave={stopDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={stopDraw}
      />
    </div>
  );
});

export default SignaturePad;
