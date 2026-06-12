"use client";

import { useRef, useEffect, useState, useCallback } from "react";

type Point = { x: number; y: number };

export default function SignaturePad({ onChange }: { onChange: (signed: boolean) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing   = useRef(false);
  const lastPoint = useRef<Point | null>(null);
  const [signed, setSigned] = useState(false);

  const getCtx = () => canvasRef.current?.getContext("2d") ?? null;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth   = 2.5;
    ctx.lineCap     = "round";
    ctx.lineJoin    = "round";
  }, []);

  const toPoint = (e: React.MouseEvent | React.TouchEvent): Point => {
    const canvas = canvasRef.current!;
    const rect   = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top)  * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top)  * scaleY,
    };
  };

  const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    drawing.current   = true;
    lastPoint.current = toPoint(e);
  }, []);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!drawing.current) return;
    const ctx   = getCtx();
    const point = toPoint(e);
    if (!ctx || !lastPoint.current) return;
    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    lastPoint.current = point;
  }, []);

  const endDraw = useCallback(() => {
    if (!drawing.current) return;
    drawing.current = false;
    lastPoint.current = null;
    setSigned(true);
    onChange(true);
  }, [onChange]);

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx    = getCtx();
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSigned(false);
    onChange(false);
  };

  return (
    <div className="space-y-2">
      <div className="relative rounded-xl border-2 border-dashed border-gray-600 overflow-hidden bg-gray-800 touch-none">
        <canvas
          ref={canvasRef}
          width={600}
          height={180}
          className="w-full h-44 cursor-crosshair"
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
        {!signed && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-gray-600 text-sm select-none">Sign here</span>
          </div>
        )}
      </div>
      {signed && (
        <button
          type="button"
          onClick={clear}
          className="text-xs text-gray-500 hover:text-gray-300 transition"
        >
          Clear signature
        </button>
      )}
    </div>
  );
}
