import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Check,
  Undo2,
  Redo2,
  Crop,
  PenTool,
  Highlighter,
  MoveRight,
  Square,
  Circle,
  Type,
  EyeOff,
  Sliders,
  Download,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { MediaCaptureItem, EditorTool, EditorFilterState } from '../types';
import { downloadOrShareMediaItem } from '../services/storage';

interface ImageEditorModalProps {
  item: MediaCaptureItem;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedBlob: Blob, updatedThumbnailUrl: string, asNew: boolean) => Promise<void>;
}

const COLORS = [
  '#ef4444', // Red
  '#f97316', // Orange
  '#eab308', // Yellow
  '#22c55e', // Green
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#a855f7', // Purple
  '#ffffff', // White
  '#000000', // Black
];

const STROKE_WIDTHS = [2, 4, 8, 14];

export const ImageEditorModal: React.FC<ImageEditorModalProps> = ({
  item,
  isOpen,
  onClose,
  onSave,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeTool, setActiveTool] = useState<EditorTool>('brush');
  const [currentColor, setCurrentColor] = useState<string>('#ef4444');
  const [strokeWidth, setStrokeWidth] = useState<number>(4);
  const [textInput, setTextInput] = useState<string>('Note');
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [filters, setFilters] = useState<EditorFilterState>({
    brightness: 100,
    contrast: 100,
    saturation: 100,
    grayscale: 0,
    invert: 0,
  });

  // History stack for undo / redo
  const historyRef = useRef<ImageData[]>([]);
  const historyStepRef = useRef<number>(-1);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Drawing state
  const isDrawingRef = useRef(false);
  const startPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const snapshotRef = useRef<ImageData | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Crop overlay state
  const [isCropping, setIsCropping] = useState(false);
  const [cropRect, setCropRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  // Push current canvas state to history
  const pushHistory = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    // Truncate redo history
    historyRef.current = historyRef.current.slice(0, historyStepRef.current + 1);
    historyRef.current.push(data);
    historyStepRef.current += 1;
    setCanUndo(historyStepRef.current > 0);
    setCanRedo(false);
  }, []);

  // Initialize image on canvas
  useEffect(() => {
    if (!isOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    const objectUrl = URL.createObjectURL(item.blob);
    img.src = objectUrl;

    img.onload = () => {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(objectUrl);

      // Reset history
      historyRef.current = [];
      historyStepRef.current = -1;
      pushHistory();
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [isOpen, item.blob, pushHistory]);

  // Undo / Redo
  const handleUndo = () => {
    if (historyStepRef.current <= 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    historyStepRef.current -= 1;
    const prevData = historyRef.current[historyStepRef.current];
    canvas.width = prevData.width;
    canvas.height = prevData.height;
    ctx.putImageData(prevData, 0, 0);

    setCanUndo(historyStepRef.current > 0);
    setCanRedo(historyStepRef.current < historyRef.current.length - 1);
  };

  const handleRedo = () => {
    if (historyStepRef.current >= historyRef.current.length - 1) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    historyStepRef.current += 1;
    const nextData = historyRef.current[historyStepRef.current];
    canvas.width = nextData.width;
    canvas.height = nextData.height;
    ctx.putImageData(nextData, 0, 0);

    setCanUndo(true);
    setCanRedo(historyStepRef.current < historyRef.current.length - 1);
  };

  // Get mouse/touch coordinate in Canvas pixel space
  const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  // Pointer Down
  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (isCropping) {
      const coords = getCanvasCoords(e);
      isDrawingRef.current = true;
      startPosRef.current = coords;
      setCropRect({ x: coords.x, y: coords.y, w: 0, h: 0 });
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const coords = getCanvasCoords(e);
    isDrawingRef.current = true;
    startPosRef.current = coords;
    snapshotRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);

    if (activeTool === 'brush' || activeTool === 'highlighter') {
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
      ctx.strokeStyle = currentColor;
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = activeTool === 'highlighter' ? 0.35 : 1.0;
    }
  };

  // Pointer Move
  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const currentPos = getCanvasCoords(e);

    if (isCropping) {
      const x = Math.min(startPosRef.current.x, currentPos.x);
      const y = Math.min(startPosRef.current.y, currentPos.y);
      const w = Math.abs(currentPos.x - startPosRef.current.x);
      const h = Math.abs(currentPos.y - startPosRef.current.y);
      setCropRect({ x, y, w, h });
      return;
    }

    if (activeTool === 'brush' || activeTool === 'highlighter') {
      ctx.lineTo(currentPos.x, currentPos.y);
      ctx.stroke();
    } else {
      // For shapes, arrow, blur, text: restore snapshot and re-draw preview
      if (snapshotRef.current) {
        ctx.putImageData(snapshotRef.current, 0, 0);
      }

      ctx.strokeStyle = currentColor;
      ctx.fillStyle = currentColor;
      ctx.lineWidth = strokeWidth;
      ctx.globalAlpha = 1.0;

      const sx = startPosRef.current.x;
      const sy = startPosRef.current.y;
      const ex = currentPos.x;
      const ey = currentPos.y;

      if (activeTool === 'rect') {
        ctx.strokeRect(Math.min(sx, ex), Math.min(sy, ey), Math.abs(ex - sx), Math.abs(ey - sy));
      } else if (activeTool === 'circle') {
        const radius = Math.sqrt((ex - sx) ** 2 + (ey - sy) ** 2);
        ctx.beginPath();
        ctx.arc(sx, sy, radius, 0, Math.PI * 2);
        ctx.stroke();
      } else if (activeTool === 'arrow') {
        // Draw directional arrow
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.stroke();

        // Arrow head
        const angle = Math.atan2(ey - sy, ex - sx);
        const headLen = Math.max(16, strokeWidth * 3);
        ctx.beginPath();
        ctx.moveTo(ex, ey);
        ctx.lineTo(ex - headLen * Math.cos(angle - Math.PI / 6), ey - headLen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(ex - headLen * Math.cos(angle + Math.PI / 6), ey - headLen * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();
      } else if (activeTool === 'blur') {
        // Draw dashed privacy censor preview
        ctx.setLineDash([6, 6]);
        ctx.strokeStyle = '#ef4444';
        ctx.strokeRect(Math.min(sx, ex), Math.min(sy, ey), Math.abs(ex - sx), Math.abs(ey - sy));
        ctx.setLineDash([]);
      }
    }
  };

  // Pointer Up
  const handleEnd = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    if (isCropping) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const currentPos = getCanvasCoords(e);
    const sx = startPosRef.current.x;
    const sy = startPosRef.current.y;
    const ex = currentPos.x;
    const ey = currentPos.y;

    if (activeTool === 'text') {
      ctx.font = `bold ${Math.max(20, strokeWidth * 6)}px sans-serif`;
      ctx.fillStyle = currentColor;
      ctx.fillText(textInput || 'Note', sx, sy);
    } else if (activeTool === 'blur') {
      // Apply pixelated blur on the selected zone
      const bx = Math.round(Math.min(sx, ex));
      const by = Math.round(Math.min(sy, ey));
      const bw = Math.round(Math.abs(ex - sx));
      const bh = Math.round(Math.abs(ey - sy));

      if (bw > 4 && bh > 4 && snapshotRef.current) {
        ctx.putImageData(snapshotRef.current, 0, 0);
        applyPixelate(ctx, bx, by, bw, bh, 14);
      }
    }

    ctx.globalAlpha = 1.0;
    pushHistory();
  };

  // Pixelate algorithm for privacy
  const applyPixelate = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    pixelSize: number
  ) => {
    const imgData = ctx.getImageData(x, y, w, h);
    const data = imgData.data;

    for (let py = 0; py < h; py += pixelSize) {
      for (let px = 0; px < w; px += pixelSize) {
        const pIndex = (py * w + px) * 4;
        const r = data[pIndex];
        const g = data[pIndex + 1];
        const b = data[pIndex + 2];
        const a = data[pIndex + 3];

        for (let subY = 0; subY < pixelSize && py + subY < h; subY++) {
          for (let subX = 0; subX < pixelSize && px + subX < w; subX++) {
            const curIndex = ((py + subY) * w + (px + subX)) * 4;
            data[curIndex] = r;
            data[curIndex + 1] = g;
            data[curIndex + 2] = b;
            data[curIndex + 3] = a;
          }
        }
      }
    }
    ctx.putImageData(imgData, x, y);
  };

  // Apply Crop
  const applyCrop = () => {
    if (!cropRect || cropRect.w < 10 || cropRect.h < 10) {
      setIsCropping(false);
      setCropRect(null);
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const croppedData = ctx.getImageData(cropRect.x, cropRect.y, cropRect.w, cropRect.h);
    canvas.width = cropRect.w;
    canvas.height = cropRect.h;
    ctx.putImageData(croppedData, 0, 0);

    setIsCropping(false);
    setCropRect(null);
    pushHistory();
  };

  // Apply Filter adjustments to Canvas
  const applyCanvasFilters = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx || historyRef.current.length === 0) return;

    // Reset to base snapshot before applying color matrix
    const base = historyRef.current[historyStepRef.current];
    canvas.width = base.width;
    canvas.height = base.height;

    // Offscreen rendering with CSS filter
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = base.width;
    tempCanvas.height = base.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;
    tempCtx.putImageData(base, 0, 0);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.filter = `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturation}%) grayscale(${filters.grayscale}%) invert(${filters.invert}%)`;
    ctx.drawImage(tempCanvas, 0, 0);
    ctx.filter = 'none';

    pushHistory();
    setShowFilters(false);
  };

  // Save changes
  const handleSave = async (asNew: boolean) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsSaving(true);

    try {
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Erreur de conversion de l image'))),
          'image/png',
          1.0
        );
      });

      // Quick thumbnail
      const thumbCanvas = document.createElement('canvas');
      const tw = 360;
      const th = Math.round((tw / canvas.width) * canvas.height);
      thumbCanvas.width = tw;
      thumbCanvas.height = th;
      const tctx = thumbCanvas.getContext('2d');
      if (tctx) {
        tctx.drawImage(canvas, 0, 0, tw, th);
      }
      const thumbUrl = thumbCanvas.toDataURL('image/jpeg', 0.85);

      await onSave(blob, thumbUrl, asNew);
      onClose();
    } catch (e) {
      console.error('Save failed:', e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownload = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob(async (blob) => {
      if (blob) {
        await downloadOrShareMediaItem(blob, `screendroid_edit_${Date.now()}.png`);
      }
    }, 'image/png');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-slate-100 select-none animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-sm font-bold text-white leading-tight">Éditeur Rapide</h2>
            <p className="text-[11px] text-slate-400">Retouchez &amp; annotez votre capture</p>
          </div>
        </div>

        {/* Undo / Redo & Save Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleUndo}
            disabled={!canUndo}
            className={`p-2 rounded-xl transition ${
              canUndo ? 'text-slate-200 hover:bg-slate-800' : 'text-slate-600 cursor-not-allowed'
            }`}
            title="Annuler"
          >
            <Undo2 className="w-4 h-4" />
          </button>

          <button
            onClick={handleRedo}
            disabled={!canRedo}
            className={`p-2 rounded-xl transition ${
              canRedo ? 'text-slate-200 hover:bg-slate-800' : 'text-slate-600 cursor-not-allowed'
            }`}
            title="Rétablir"
          >
            <Redo2 className="w-4 h-4" />
          </button>

          <button
            onClick={handleDownload}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition"
            title="Télécharger"
          >
            <Download className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1.5 ml-1">
            <button
              onClick={() => handleSave(false)}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/25 active:scale-95 transition"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isSaving ? '...' : 'Enregistrer'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Canvas Viewport */}
      <div className="relative flex-1 overflow-hidden flex items-center justify-center p-3 bg-slate-950/90">
        <canvas
          ref={canvasRef}
          onMouseDown={handleStart}
          onMouseMove={handleMove}
          onMouseUp={handleEnd}
          onTouchStart={handleStart}
          onTouchMove={handleMove}
          onTouchEnd={handleEnd}
          className="max-w-full max-h-full object-contain rounded-lg shadow-2xl border border-slate-800 cursor-crosshair touch-none"
        />

        {/* Cropping visual boundary */}
        {isCropping && cropRect && (
          <div
            style={{
              position: 'absolute',
              left: `${cropRect.x}px`,
              top: `${cropRect.y}px`,
              width: `${cropRect.w}px`,
              height: `${cropRect.h}px`,
            }}
            className="border-2 border-indigo-400 bg-indigo-500/10 pointer-events-none"
          />
        )}
      </div>

      {/* Floating Crop Confirmation Toolbar */}
      {isCropping && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-700 shadow-xl text-xs">
          <span className="text-slate-300">Glissez sur l'image pour cadrer</span>
          <button
            onClick={applyCrop}
            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg"
          >
            Valider Recadrage
          </button>
          <button
            onClick={() => {
              setIsCropping(false);
              setCropRect(null);
            }}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
          >
            Annuler
          </button>
        </div>
      )}

      {/* Bottom Tool Panels */}
      <div className="bg-slate-900 border-t border-slate-800 p-3 flex flex-col gap-2.5">
        {/* Colors & Stroke Size */}
        <div className="flex items-center justify-between gap-3 overflow-x-auto pb-1">
          <div className="flex items-center gap-1.5">
            {COLORS.map((color) => (
              <button
                key={color}
                onClick={() => setCurrentColor(color)}
                style={{ backgroundColor: color }}
                className={`w-6 h-6 rounded-full transition-transform ${
                  currentColor === color ? 'scale-125 ring-2 ring-white shadow-md' : 'opacity-80 hover:opacity-100'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-800">
            {STROKE_WIDTHS.map((size) => (
              <button
                key={size}
                onClick={() => setStrokeWidth(size)}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition ${
                  strokeWidth === size ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                <div
                  style={{ width: `${Math.min(18, size + 4)}px`, height: `${Math.min(18, size + 4)}px` }}
                  className="rounded-full bg-current"
                />
              </button>
            ))}
          </div>
        </div>

        {/* Text tool input field if active */}
        {activeTool === 'text' && (
          <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-400">Texte :</span>
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Tapez le texte puis cliquez sur l'image..."
              className="flex-1 bg-transparent text-xs text-white outline-none px-2 py-1"
            />
          </div>
        )}

        {/* Filters popup */}
        {showFilters && (
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex flex-col gap-2.5 text-xs text-slate-300">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white">Ajustements Image</span>
              <button
                onClick={applyCanvasFilters}
                className="px-2.5 py-1 rounded bg-indigo-600 text-white font-bold text-[11px]"
              >
                Appliquer
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-slate-400">Luminosité : {filters.brightness}%</label>
                <input
                  type="range"
                  min="50"
                  max="150"
                  value={filters.brightness}
                  onChange={(e) => setFilters((prev) => ({ ...prev, brightness: Number(e.target.value) }))}
                  className="w-full h-1 bg-slate-800 rounded-lg accent-indigo-500"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400">Contraste : {filters.contrast}%</label>
                <input
                  type="range"
                  min="50"
                  max="150"
                  value={filters.contrast}
                  onChange={(e) => setFilters((prev) => ({ ...prev, contrast: Number(e.target.value) }))}
                  className="w-full h-1 bg-slate-800 rounded-lg accent-indigo-500"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400">Saturation : {filters.saturation}%</label>
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={filters.saturation}
                  onChange={(e) => setFilters((prev) => ({ ...prev, saturation: Number(e.target.value) }))}
                  className="w-full h-1 bg-slate-800 rounded-lg accent-indigo-500"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400">Noir &amp; Blanc : {filters.grayscale}%</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={filters.grayscale}
                  onChange={(e) => setFilters((prev) => ({ ...prev, grayscale: Number(e.target.value) }))}
                  className="w-full h-1 bg-slate-800 rounded-lg accent-indigo-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Primary Tool Buttons */}
        <div className="flex items-center justify-around gap-1 pt-1">
          <button
            onClick={() => {
              setIsCropping(true);
              setActiveTool('crop');
            }}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition ${
              isCropping ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Crop className="w-5 h-5" />
            <span className="text-[10px]">Rogner</span>
          </button>

          <button
            onClick={() => {
              setIsCropping(false);
              setActiveTool('brush');
            }}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition ${
              activeTool === 'brush' && !isCropping ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <PenTool className="w-5 h-5" />
            <span className="text-[10px]">Pinceau</span>
          </button>

          <button
            onClick={() => {
              setIsCropping(false);
              setActiveTool('highlighter');
            }}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition ${
              activeTool === 'highlighter' && !isCropping ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Highlighter className="w-5 h-5" />
            <span className="text-[10px]">Surligneur</span>
          </button>

          <button
            onClick={() => {
              setIsCropping(false);
              setActiveTool('arrow');
            }}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition ${
              activeTool === 'arrow' && !isCropping ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <MoveRight className="w-5 h-5" />
            <span className="text-[10px]">Flèche</span>
          </button>

          <button
            onClick={() => {
              setIsCropping(false);
              setActiveTool('rect');
            }}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition ${
              activeTool === 'rect' && !isCropping ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Square className="w-5 h-5" />
            <span className="text-[10px]">Cadre</span>
          </button>

          <button
            onClick={() => {
              setIsCropping(false);
              setActiveTool('circle');
            }}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition ${
              activeTool === 'circle' && !isCropping ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Circle className="w-5 h-5" />
            <span className="text-[10px]">Cercle</span>
          </button>

          <button
            onClick={() => {
              setIsCropping(false);
              setActiveTool('blur');
            }}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition ${
              activeTool === 'blur' && !isCropping ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
            title="Masquer / Flouter des données privées"
          >
            <EyeOff className="w-5 h-5" />
            <span className="text-[10px]">Flouter</span>
          </button>

          <button
            onClick={() => {
              setIsCropping(false);
              setActiveTool('text');
            }}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition ${
              activeTool === 'text' && !isCropping ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Type className="w-5 h-5" />
            <span className="text-[10px]">Texte</span>
          </button>

          <button
            onClick={() => setShowFilters((prev) => !prev)}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition ${
              showFilters ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sliders className="w-5 h-5" />
            <span className="text-[10px]">Filtres</span>
          </button>
        </div>
      </div>
    </div>
  );
};
