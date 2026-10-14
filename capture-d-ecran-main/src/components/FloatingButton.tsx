import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Video, Square, Pause, Play, Timer, Sparkles, X, ChevronRight, EyeOff } from 'lucide-react';
import { AppSettings } from '../types';

interface FloatingButtonProps {
  settings: AppSettings;
  isRecording: boolean;
  isPaused: boolean;
  recordingDuration: number;
  isCapturingFrame: boolean; // CRITICAL: When taking a screenshot, this is true => Button completely hidden!
  onTakePhoto: () => void;
  onToggleRecord: () => void;
  onTogglePause: () => void;
  onOpenSettings?: () => void;
}

export const FloatingButton: React.FC<FloatingButtonProps> = ({
  settings,
  isRecording,
  isPaused,
  recordingDuration,
  isCapturingFrame,
  onTakePhoto,
  onToggleRecord,
  onTogglePause,
}) => {
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 20, y: 180 });
  const [isDragging, setIsDragging] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isGhostMode, setIsGhostMode] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  const dragStartRef = useRef<{ mouseX: number; mouseY: number; startX: number; startY: number } | null>(null);
  const hasMovedRef = useRef(false);
  const buttonRef = useRef<HTMLDivElement>(null);

  // Initialize position to right edge like Android default
  useEffect(() => {
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;
    setPosition({
      x: Math.max(16, screenW - 76),
      y: Math.min(screenH - 180, Math.max(120, screenH / 3)),
    });
  }, []);

  // Format recording timer
  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Drag handlers
  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    dragStartRef.current = {
      mouseX: clientX,
      mouseY: clientY,
      startX: position.x,
      startY: position.y,
    };
    hasMovedRef.current = false;
    setIsDragging(true);
  };

  const handleTouchMove = useCallback((e: TouchEvent | MouseEvent) => {
    if (!dragStartRef.current) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const deltaX = clientX - dragStartRef.current.mouseX;
    const deltaY = clientY - dragStartRef.current.mouseY;

    if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
      hasMovedRef.current = true;
    }

    const maxX = window.innerWidth - 64;
    const maxY = window.innerHeight - 100;

    setPosition({
      x: Math.min(maxX, Math.max(12, dragStartRef.current.startX + deltaX)),
      y: Math.min(maxY, Math.max(60, dragStartRef.current.startY + deltaY)),
    });
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!dragStartRef.current) return;
    setIsDragging(false);
    dragStartRef.current = null;

    // Snap to nearest horizontal edge (Magnetic Android behavior)
    if (settings.magneticEdgeSnap) {
      const screenWidth = window.innerWidth;
      const snapToRight = position.x > screenWidth / 2;
      const targetX = snapToRight ? screenWidth - 72 : 16;
      setPosition((prev) => ({ ...prev, x: targetX }));
    }
  }, [position.x, settings.magneticEdgeSnap]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleTouchMove);
      window.addEventListener('mouseup', handleTouchEnd);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleTouchEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleTouchMove);
      window.removeEventListener('mouseup', handleTouchEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, handleTouchMove, handleTouchEnd]);

  const handleMainButtonClick = () => {
    if (hasMovedRef.current) return;
    if (isGhostMode) {
      setIsGhostMode(false);
      return;
    }
    setIsMenuOpen((prev) => !prev);
  };

  const handleInstantPhoto = () => {
    setIsMenuOpen(false);
    if (settings.countdownTimerSeconds > 0) {
      let count = settings.countdownTimerSeconds;
      setCountdown(count);
      const timer = setInterval(() => {
        count -= 1;
        if (count <= 0) {
          clearInterval(timer);
          setCountdown(null);
          onTakePhoto();
        } else {
          setCountdown(count);
        }
      }, 1000);
    } else {
      onTakePhoto();
    }
  };

  const handleRecordClick = () => {
    setIsMenuOpen(false);
    onToggleRecord();
  };

  // If disabled in settings, don't show
  if (!settings.floatingButtonEnabled) {
    return null;
  }

  // CRITICAL REQUIREMENT:
  // "sachant que le bouton flottant ne doit pas apparaitre dans les captures photos, ou videos."
  // When isCapturingFrame is true, this component is completely unmounted/hidden from the DOM tree!
  if (isCapturingFrame) {
    return null;
  }

  // If user enabled auto-hide during video recording and recording is active:
  const isAutoHiddenByRecording = settings.hideDuringVideoRecording && isRecording;

  return (
    <>
      {/* Visual countdown overlay if timer active */}
      {countdown !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none bg-black/20 backdrop-blur-[2px]">
          <div className="text-8xl font-black text-white drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)] animate-ping">
            {countdown}
          </div>
        </div>
      )}

      {/* Floating button container */}
      <div
        ref={buttonRef}
        data-screendroid-floating="true"
        style={{
          transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
          opacity: isGhostMode ? 0.2 : isAutoHiddenByRecording ? 0.35 : settings.floatingOpacity,
          transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.2, 0.9, 0.3, 1), opacity 0.2s ease',
        }}
        className="fixed top-0 left-0 z-50 select-none touch-none"
      >
        {/* Expanded radial / floating quick menu */}
        {isMenuOpen && (
          <div
            className={`absolute bottom-full mb-3 left-1/2 -translate-x-1/2 flex flex-col gap-2 p-2 rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 shadow-2xl shadow-black/60 min-w-[210px] animate-in fade-in zoom-in-95 duration-150`}
          >
            <div className="flex items-center justify-between px-2 py-1 border-b border-slate-800 text-[11px] font-semibold text-slate-300">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                Actions Rapides
              </span>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick Photo Capture */}
            <button
              onClick={handleInstantPhoto}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-semibold text-white bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 active:scale-95 transition"
            >
              <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
                <Camera className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <p className="leading-tight">Capture Photo</p>
                <span className="text-[10px] text-indigo-200/80 font-normal">Sans bouton flottant</span>
              </div>
            </button>

            {/* Video Record Toggle */}
            <button
              onClick={handleRecordClick}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-semibold text-white transition active:scale-95 ${
                isRecording
                  ? 'bg-rose-600/40 border border-rose-500 hover:bg-rose-600/60'
                  : 'bg-emerald-600/30 border border-emerald-500/40 hover:bg-emerald-600/50'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  isRecording ? 'bg-rose-600' : 'bg-emerald-600'
                }`}
              >
                {isRecording ? <Square className="w-3.5 h-3.5 text-white" /> : <Video className="w-4 h-4 text-white" />}
              </div>
              <div className="flex-1">
                <p className="leading-tight">{isRecording ? 'Arrêter la vidéo' : 'Enregistrer Vidéo'}</p>
                <span className="text-[10px] text-slate-300 font-normal">
                  {isRecording ? `En cours (${formatTime(recordingDuration)})` : 'Qualité Max Smartphone'}
                </span>
              </div>
            </button>

            {/* Pause / Resume if recording */}
            {isRecording && (
              <button
                onClick={onTogglePause}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-left text-xs font-medium text-amber-200 bg-amber-500/20 border border-amber-500/30 hover:bg-amber-500/30 active:scale-95 transition"
              >
                <div className="w-6 h-6 rounded-md bg-amber-500/40 flex items-center justify-center shrink-0">
                  {isPaused ? <Play className="w-3.5 h-3.5 text-amber-200" /> : <Pause className="w-3.5 h-3.5 text-amber-200" />}
                </div>
                <span>{isPaused ? 'Reprendre la vidéo' : 'Mettre en pause'}</span>
              </button>
            )}

            {/* Ghost mode / Discretion */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 px-1 text-[11px] text-slate-400">
              <button
                onClick={() => {
                  setIsGhostMode(true);
                  setIsMenuOpen(false);
                }}
                className="flex items-center gap-1.5 hover:text-slate-200"
              >
                <EyeOff className="w-3 h-3" />
                <span>Mode discret (20% opacité)</span>
              </button>
            </div>
          </div>
        )}

        {/* Main Floating Trigger Button (Bubble) */}
        <div
          onMouseDown={handleTouchStart}
          onTouchStart={handleTouchStart}
          onClick={handleMainButtonClick}
          className={`relative w-14 h-14 rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing shadow-2xl transition-transform active:scale-95 ${
            isRecording
              ? 'bg-rose-600 text-white shadow-rose-600/50 ring-4 ring-rose-500/30 animate-pulse'
              : 'bg-gradient-to-tr from-indigo-600 via-blue-600 to-indigo-500 text-white shadow-indigo-600/40 ring-4 ring-indigo-400/20'
          }`}
          title="Bouton flottant ScreenDroid"
        >
          {isRecording ? (
            <div className="flex flex-col items-center justify-center">
              <div className="w-4 h-4 rounded bg-white" />
              <span className="text-[9px] font-mono font-bold leading-none mt-1">
                {formatTime(recordingDuration)}
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center">
              <Camera className="w-6 h-6 text-white drop-shadow" />
            </div>
          )}

          {/* Quick status ring */}
          {isRecording && (
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-rose-400 border-2 border-slate-900 animate-ping" />
          )}

          {/* Small notch grip icon for dragging */}
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-full bg-slate-950/80 text-[8px] text-slate-300 font-bold uppercase tracking-widest border border-slate-700">
            REC
          </div>
        </div>
      </div>
    </>
  );
};
