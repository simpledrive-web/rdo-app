import { useEffect, useRef, useState } from "react";

type SignaturePadProps = {
  value: string;
  onChange: (value: string) => void;
};

export default function SignaturePad({
  value,
  onChange,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  function resizeCanvas() {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;

    const previous = canvas.toDataURL("image/png");

    canvas.width = rect.width * ratio;
    canvas.height = 180 * ratio;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `180px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.scale(ratio, ratio);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, 180);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#111827";

    if (value || previous) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, 180);
      };
      img.src = value || previous;
    }
  }

  useEffect(() => {
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, []);

  useEffect(() => {
    if (!value) {
      resizeCanvas();
    }
  }, [value]);

  function getPoint(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  function handlePointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const point = getPoint(event);
    const ctx = canvas.getContext("2d");
    if (!ctx || !point) return;

    setIsDrawing(true);
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const point = getPoint(event);
    const ctx = canvas.getContext("2d");
    if (!ctx || !point) return;

    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  }

  function finishDrawing() {
    if (!isDrawing) return;

    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;

    onChange(canvas.toDataURL("image/png"));
  }

  function handleClear() {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, 180);
    onChange("");
  }

  return (
    <div ref={containerRef}>
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishDrawing}
        onPointerLeave={finishDrawing}
        style={{
          width: "100%",
          height: 180,
          border: "1px solid #d1d5db",
          borderRadius: 12,
          background: "#fff",
          touchAction: "none",
          display: "block",
          cursor: "crosshair",
        }}
      />

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
        <button
          type="button"
          className="rdo-btn rdo-btn-secondary"
          onClick={handleClear}
        >
          Limpar assinatura
        </button>
      </div>
    </div>
  );
}