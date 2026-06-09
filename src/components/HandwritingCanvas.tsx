/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from 'react';
import { HandwritingStroke, StrokePoint } from '../types';
import { Undo2, Redo2, Eraser, Trash2, Edit } from 'lucide-react';

interface HandwritingCanvasProps {
  strokes: HandwritingStroke[];
  onChange: (strokes: HandwritingStroke[]) => void;
  inkColor: string;
  penThickness: number;
}

export default function HandwritingCanvas({
  strokes,
  onChange,
  inkColor,
  penThickness
}: HandwritingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<StrokePoint[]>([]);
  const [isEraserMode, setIsEraserMode] = useState(false);
  const [redoStack, setRedoStack] = useState<HandwritingStroke[]>([]);

  // Redraw the canvas content on input strokes changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Render strokes
    strokes.forEach((stroke) => {
      if (stroke.points.length < 1) return;
      ctx.beginPath();
      ctx.globalCompositeOperation = stroke.isEraser ? 'destination-out' : 'source-over';
      ctx.strokeStyle = stroke.isEraser ? 'rgba(0,0,0,1)' : stroke.color;
      ctx.lineWidth = stroke.thickness;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    });
    ctx.globalCompositeOperation = 'source-over'; // Reset
  }, [strokes]);

  // Always keep canvas size set to 800x570 for stable high-resolution coordinates
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = 800;
    canvas.height = 570;
  }, []);

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>): StrokePoint | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();

    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    // Scale precisely into the 800x570 design grid
    const scaleX = 800 / rect.width;
    const scaleY = 570 / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const coords = getCoordinates(e);
    if (!coords) return;

    setIsDrawing(true);
    setCurrentStroke([coords]);
    setRedoStack([]); // Clear redo on new action
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const coords = getCoordinates(e);
    if (!coords) return;

    setCurrentStroke((prev) => [...prev, coords]);

    // Live draw on top for low latency
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.globalCompositeOperation = isEraserMode ? 'destination-out' : 'source-over';
    ctx.strokeStyle = isEraserMode ? 'rgba(0,0,0,1)' : inkColor;
    ctx.lineWidth = isEraserMode ? penThickness * 3 : penThickness;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const points = [...currentStroke, coords];
    if (points.length > 1) {
      ctx.beginPath();
      ctx.moveTo(points[points.length - 2].x, points[points.length - 2].y);
      ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.globalCompositeOperation = 'source-over';
    }

    if (currentStroke.length > 0) {
      const newStroke: HandwritingStroke = {
        points: currentStroke,
        color: isEraserMode ? 'transparent' : inkColor,
        thickness: isEraserMode ? penThickness * 3 : penThickness,
        isEraser: isEraserMode
      };
      onChange([...strokes, newStroke]);
    }
    setCurrentStroke([]);
  };

  const handleUndo = () => {
    if (strokes.length === 0) return;
    const last = strokes[strokes.length - 1];
    setRedoStack((prev) => [...prev, last]);
    onChange(strokes.slice(0, -1));
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));
    onChange([...strokes, next]);
  };

  const handleClear = () => {
    setRedoStack([]);
    onChange([]);
  };

  return (
    <div className="flex flex-col h-full w-full bg-transparent">
      {/* Brass Handwriting Desk Panel */}
      <div className="flex items-center justify-between p-3 border-b border-[#a67c52]/30 bg-[#7a4e2d]/5 rounded-t-lg select-none">
        <span className="text-xs font-mono text-[#7a4e2d] tracking-wide inline-flex items-center gap-1.5">
          <Edit className="w-3.5 h-3.5 text-[#a67c52]" /> Handwriting Parlour
        </span>
        <div className="flex items-center gap-1.5">
          {/* Editor Tools */}
          <button
            id="eraser-btn"
            onClick={() => setIsEraserMode(!isEraserMode)}
            className={`p-1.5 rounded transition ${
              isEraserMode
                ? 'bg-[#8b0000] text-white'
                : 'text-[#7a4e2d] hover:bg-[#a67c52]/10'
            }`}
            title="Toggle Eraser"
          >
            <Eraser className="w-4 h-4" />
          </button>
          
          <div className="w-[1px] h-4 bg-[#a67c52]/30" />

          <button
            id="undo-btn"
            disabled={strokes.length === 0}
            onClick={handleUndo}
            className="p-1.5 rounded text-[#7a4e2d] hover:bg-[#a67c52]/10 disabled:opacity-30 transition"
            title="Undo"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            id="redo-btn"
            disabled={redoStack.length === 0}
            onClick={handleRedo}
            className="p-1.5 rounded text-[#7a4e2d] hover:bg-[#a67c52]/10 disabled:opacity-30 transition"
            title="Redo"
          >
            <Redo2 className="w-4 h-4" />
          </button>
          <button
            id="clear-btn"
            disabled={strokes.length === 0}
            onClick={handleClear}
            className="p-1.5 rounded text-[#8b0000] hover:bg-[#8b0000]/10 disabled:opacity-30 transition"
            title="Reset Desk"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Canvas Drawing Area */}
      <div className="relative flex-1 bg-transparent min-h-[300px] cursor-crosshair">
        <canvas
          id="handwriting-canvas"
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="absolute inset-0 w-full h-full bg-transparent touch-none"
        />
        {strokes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none opacity-20">
            <p className="text-center text-sm font-mono tracking-wider text-[#7a4e2d]">
              Draw directly upon the paper using your stylus, touchscreen, or mouse...
            </p>
          </div>
        )}
      </div>

      {/* Thickness settings bar */}
      <div className="p-2.5 border-t border-[#a67c52]/20 bg-[#7a4e2d]/5 flex items-center justify-between rounded-b-lg">
        <label className="text-[10px] font-mono text-[#7a4e2d] uppercase tracking-wider flex items-center gap-1.5">
          <span>Nib Width:</span>
          <span className="font-bold text-[#8b0000]">{penThickness}px</span>
        </label>
        <span className="text-[9px] font-mono italic text-[#a67c52]">
          {isEraserMode ? 'Eraser Mode Active' : 'Ink Flowing...'}
        </span>
      </div>
    </div>
  );
}
