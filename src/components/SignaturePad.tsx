import React, { useRef, useState, useEffect } from "react";
import { PenTool, Trash2 } from "lucide-react";

interface SignaturePadProps {
  onSave: (svgString: string) => void;
  onClear: () => void;
}

interface Point {
  x: number;
  y: number;
}

export default function SignaturePad({ onSave, onClear }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lines, setLines] = useState<Point[][]>([]);
  const [currentLine, setCurrentLine] = useState<Point[]>([]);

  // Redraw canvas whenever lines change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set drawing style
    ctx.strokeStyle = "#1e293b"; // Slate 800
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Draw past lines
    lines.forEach((line) => {
      if (line.length < 1) return;
      ctx.beginPath();
      ctx.moveTo(line[0].x, line[0].y);
      for (let i = 1; i < line.length; i++) {
        ctx.lineTo(line[i].x, line[i].y);
      }
      ctx.stroke();
    });

    // Draw current active line
    if (currentLine.length > 0) {
      ctx.beginPath();
      ctx.moveTo(currentLine[0].x, currentLine[0].y);
      for (let i = 1; i < currentLine.length; i++) {
        ctx.lineTo(currentLine[i].x, currentLine[i].y);
      }
      ctx.stroke();
    }
  }, [lines, currentLine]);

  // Handle canvas sizing on mount / resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Set fixed display internal dimensions for standard signature resolution
    canvas.width = 400;
    canvas.height = 200;
  }, []);

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ("touches" in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    // Map clients coordinates to canvas pixels
    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;

    return { x, y };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const pos = getCoordinates(e);
    if (!pos) return;

    setIsDrawing(true);
    setCurrentLine([pos]);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const pos = getCoordinates(e);
    if (!pos) return;

    setCurrentLine((prev) => [...prev, pos]);
  };

  const endDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    if (currentLine.length > 1) {
      const updatedLines = [...lines, currentLine];
      setLines(updatedLines);
      generateSVG(updatedLines);
    }
    setCurrentLine([]);
  };

  const clearCanvas = () => {
    setLines([]);
    setCurrentLine([]);
    onClear();
  };

  const generateSVG = (allLines: Point[][]) => {
    if (allLines.length === 0) {
      onSave("");
      return;
    }

    // Compose an inline lightweight SVG string
    let pathData = "";
    allLines.forEach((line) => {
      if (line.length < 1) return;
      pathData += `M ${line[0].x.toFixed(1)} ${line[0].y.toFixed(1)} `;
      for (let i = 1; i < line.length; i++) {
        pathData += `L ${line[i].x.toFixed(1)} ${line[i].y.toFixed(1)} `;
      }
    });

    const svgString = `<svg viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"><path d="${pathData.trim()}" fill="none" stroke="#0f172a" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    onSave(svgString);
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-1">
        <label className="text-[10px] uppercase tracking-widest text-slate-400 font-extrabold block">
          Tanda Tangan Digital <span className="text-rose-500">*</span>
        </label>
        {lines.length > 0 && (
          <button
            type="button"
            onClick={clearCanvas}
            className="text-[10px] uppercase font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 py-1 px-2 rounded-lg hover:bg-rose-50 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Reset TTD
          </button>
        )}
      </div>

      <div className="relative border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 overflow-hidden cursor-crosshair h-[140px]" id="signature-canvas-container">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={endDrawing}
          onMouseLeave={endDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={endDrawing}
          className="w-full h-full block touch-none"
        />
        {lines.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-slate-400 select-none">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Goreskan Tanda Tangan Anda di Sini</span>
            <span className="text-[9px] mt-0.5 opacity-70">(Layar Sentuh atau Mouse)</span>
          </div>
        )}
      </div>
    </div>
  );
}
