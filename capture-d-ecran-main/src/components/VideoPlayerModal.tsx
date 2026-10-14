import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Download,
  Trash2,
  RotateCcw,
  Film,
  Calendar,
  HardDrive,
  Monitor,
} from 'lucide-react';
import { MediaCaptureItem } from '../types';
import { downloadOrShareMediaItem } from '../services/storage';

interface VideoPlayerModalProps {
  item: MediaCaptureItem;
  isOpen: boolean;
  onClose: () => void;
  onDelete: (id: string) => void;
}

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({
  item,
  isOpen,
  onClose,
  onDelete,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(item.durationSeconds || 0);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [videoUrl, setVideoUrl] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;
    const url = URL.createObjectURL(item.blob);
    setVideoUrl(url);
    setIsPlaying(false);
    setCurrentTime(0);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [isOpen, item.blob]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration || item.durationSeconds || 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const changeSpeed = () => {
    const speeds = [1, 1.25, 1.5, 2, 0.5];
    const nextIdx = (speeds.indexOf(playbackRate) + 1) % speeds.length;
    const nextSpeed = speeds[nextIdx];
    setPlaybackRate(nextSpeed);
    if (videoRef.current) {
      videoRef.current.playbackRate = nextSpeed;
    }
  };

  const handleFullscreen = () => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      }
    }
  };

  const handleDownload = async () => {
    await downloadOrShareMediaItem(item.blob, item.title);
  };

  const formatSec = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 select-none animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 border-b border-slate-800">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
              <Film className="w-4 h-4" />
            </div>
            <div className="overflow-hidden">
              <h3 className="text-sm font-bold text-white truncate">{item.title}</h3>
              <p className="text-[11px] text-slate-400">
                {new Date(item.createdAt).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition"
              title="Télécharger la vidéo"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                if (confirm('Supprimer cet enregistrement définitivement ?')) {
                  onDelete(item.id);
                  onClose();
                }
              }}
              className="p-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition"
              title="Supprimer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Video Screen */}
        <div className="relative bg-black flex-1 flex items-center justify-center min-h-[260px] group">
          <video
            ref={videoRef}
            src={videoUrl}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={() => setIsPlaying(false)}
            onClick={togglePlay}
            playsInline
            className="w-full max-h-[55vh] object-contain cursor-pointer"
          />

          {/* Large Center Play button when paused */}
          {!isPlaying && (
            <button
              onClick={togglePlay}
              className="absolute w-16 h-16 rounded-full bg-indigo-600/90 text-white flex items-center justify-center shadow-2xl backdrop-blur-sm hover:scale-110 active:scale-95 transition"
            >
              <Play className="w-8 h-8 ml-1" />
            </button>
          )}
        </div>

        {/* Player Controls */}
        <div className="px-5 py-3.5 bg-slate-900 border-t border-slate-800/80 flex flex-col gap-2.5">
          {/* Progress Seek Bar */}
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono text-slate-400 w-10 text-right">
              {formatSec(currentTime)}
            </span>
            <input
              type="range"
              min="0"
              max={duration || 100}
              step="0.1"
              value={currentTime}
              onChange={handleSeek}
              className="flex-1 h-1.5 bg-slate-800 rounded-lg accent-indigo-500 cursor-pointer"
            />
            <span className="text-[11px] font-mono text-slate-400 w-10">
              {formatSec(duration)}
            </span>
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={togglePlay}
                className="w-9 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center transition"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>

              <button
                onClick={() => {
                  if (videoRef.current) {
                    videoRef.current.currentTime = 0;
                    setCurrentTime(0);
                  }
                }}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
                title="Recommencer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                onClick={toggleMute}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
              </button>

              <button
                onClick={changeSpeed}
                className="px-2.5 py-1 rounded-lg bg-slate-800 text-xs font-mono font-semibold text-slate-300 hover:text-white hover:bg-slate-700"
                title="Vitesse de lecture"
              >
                {playbackRate}x
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleFullscreen}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
                title="Plein écran"
              >
                <Maximize className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Video Metadata specs bar */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5">
              <Monitor className="w-3.5 h-3.5 text-indigo-400" />
              <span>{item.width} × {item.height} px</span>
            </div>
            <div className="flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-indigo-400" />
              <span>{formatBytes(item.sizeBytes)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="uppercase font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300">
                {item.format}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
