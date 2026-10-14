import React, { useState, useEffect } from 'react';
import {
  Camera,
  Video,
  Square,
  Pause,
  Play,
  Sparkles,
  Smartphone,
  Eye,
  Folder,
  Sliders,
  Clock,
  Layers,
  Edit3,
  CheckCircle,
  HardDrive,
  Volume2,
  VolumeX,
  ExternalLink,
  ShieldCheck,
  Zap,
  Cpu,
} from 'lucide-react';
import { AppSettings, MediaCaptureItem } from '../types';
import { isNativeAndroidApp, checkAndRequestNativePermissions, toggleNativeFloatingWidget } from '../services/nativeBridge';

interface CaptureStudioProps {
  settings: AppSettings;
  isRecording: boolean;
  isPaused: boolean;
  recordingDuration: number;
  recentItems: MediaCaptureItem[];
  onTakePhoto: () => void;
  onToggleRecord: () => void;
  onTogglePause: () => void;
  onOpenEditor: (item: MediaCaptureItem) => void;
  onOpenVideo: (item: MediaCaptureItem) => void;
  onGoToSettings: () => void;
  onGoToGallery: () => void;
  onOpenAndroidGuide?: () => void;
}

export const CaptureStudio: React.FC<CaptureStudioProps> = ({
  settings,
  isRecording,
  isPaused,
  recordingDuration,
  recentItems,
  onTakePhoto,
  onToggleRecord,
  onTogglePause,
  onOpenEditor,
  onOpenVideo,
  onGoToSettings,
  onGoToGallery,
  onOpenAndroidGuide,
}) => {
  const [deviceSpecs, setDeviceSpecs] = useState<{
    width: number;
    height: number;
    pixelRatio: number;
    colorDepth: number;
  }>({
    width: 1080,
    height: 1920,
    pixelRatio: 2,
    colorDepth: 24,
  });

  const [isNative, setIsNative] = useState<boolean>(false);

  useEffect(() => {
    setIsNative(isNativeAndroidApp());
    if (typeof window !== 'undefined') {
      const dpr = window.devicePixelRatio || 1;
      setDeviceSpecs({
        width: Math.round(window.screen.width * dpr),
        height: Math.round(window.screen.height * dpr),
        pixelRatio: Number(dpr.toFixed(1)),
        colorDepth: window.screen.colorDepth || 24,
      });
    }
  }, []);

  const handleRelaunchNativeOverlay = async () => {
    await checkAndRequestNativePermissions();
    await toggleNativeFloatingWidget(true);
  };

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const latestCapture = recentItems.length > 0 ? recentItems[0] : null;

  return (
    <div className="flex-1 max-w-2xl w-full mx-auto p-4 pb-28 space-y-4">
      {/* Native APK Banner if running on Android */}
      {isNative ? (
        <div className="p-4 rounded-3xl bg-gradient-to-r from-indigo-950/80 via-slate-900 to-emerald-950/60 border border-indigo-500/50 space-y-2.5 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs">
              <Cpu className="w-4 h-4 text-indigo-400" />
              <span>Mode Android Natif Actif (Superposition Écran)</span>
            </div>
            <button
              onClick={handleRelaunchNativeOverlay}
              className="px-3 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold transition shadow-sm active:scale-95"
            >
              Activer la bulle
            </button>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            La bulle flottante Android reste affichée lorsque vous ouvrez <strong>WhatsApp, YouTube, des jeux ou l'écran d'accueil</strong>. Appuyez sur la bulle pour prendre une photo nette du vrai écran ou lancer l'enregistrement vidéo réel MP4 !
          </p>
        </div>
      ) : null}

      {/* Smartphone Display Specs Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white tracking-tight">Qualité Maximale Appareil</h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                  Prêt
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Résolution native : <strong className="text-slate-200">{deviceSpecs.width} × {deviceSpecs.height} px</strong> ({deviceSpecs.pixelRatio}x DPR)
              </p>
            </div>
          </div>

          <button
            onClick={onGoToSettings}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition"
            title="Modifier les réglages"
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>

        {/* Feature Badges */}
        <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-800/80 text-[11px]">
          <div className="flex items-center gap-1.5 text-slate-300">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="truncate">Bouton 100% invisible</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-300">
            <HardDrive className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate">{settings.destinationFolderName}</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-300">
            {settings.includeAudio ? (
              <Volume2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            )}
            <span className="truncate">{settings.includeAudio ? 'Audio actif' : 'Muet'}</span>
          </div>
        </div>
      </div>

      {/* Main Dual Trigger Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {/* PHOTO CAPTURE CARD */}
        <div
          onClick={onTakePhoto}
          className="group relative rounded-3xl bg-slate-900 border border-slate-800/90 hover:border-indigo-500/60 p-5 shadow-lg hover:shadow-indigo-500/10 transition-all cursor-pointer flex flex-col justify-between min-h-[170px]"
        >
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30 group-hover:scale-110 transition-transform">
              <Camera className="w-6 h-6" />
            </div>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/25">
              {settings.photoFormat.split('/')[1].toUpperCase()}
            </span>
          </div>

          <div>
            <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors">
              Capture Photo
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Prendre une capture haute fidélité (le bouton sera masqué)
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-indigo-400 font-semibold pt-2">
            <span>Déclencher maintenant</span>
            <span className="group-hover:translate-x-1 transition-transform">→</span>
          </div>
        </div>

        {/* VIDEO RECORDING CARD */}
        <div
          onClick={onToggleRecord}
          className={`group relative rounded-3xl border p-5 shadow-lg transition-all cursor-pointer flex flex-col justify-between min-h-[170px] ${
            isRecording
              ? 'bg-rose-950/30 border-rose-500 shadow-rose-500/20 animate-pulse'
              : 'bg-slate-900 border-slate-800/90 hover:border-rose-500/60 hover:shadow-rose-500/10'
          }`}
        >
          <div className="flex items-center justify-between">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-transform ${
                isRecording
                  ? 'bg-rose-600 text-white scale-105'
                  : 'bg-rose-600 text-white group-hover:scale-110 shadow-rose-600/30'
              }`}
            >
              {isRecording ? <Square className="w-6 h-6 fill-current" /> : <Video className="w-6 h-6" />}
            </div>

            <div className="flex items-center gap-2">
              {isRecording && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 font-mono text-xs font-bold">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  <span>{formatDuration(recordingDuration)}</span>
                </div>
              )}
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                {settings.videoFPS} FPS
              </span>
            </div>
          </div>

          <div>
            <h3 className="text-base font-bold text-white group-hover:text-rose-300 transition-colors">
              {isRecording ? 'Arrêter l\'Enregistrement' : 'Enregistrement Vidéo'}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              {isRecording
                ? 'Appuyez pour terminer et sauvegarder'
                : 'Enregistrer tout l\'écran en haute définition'}
            </p>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span
              className={`text-xs font-semibold ${
                isRecording ? 'text-rose-400' : 'text-slate-400 group-hover:text-rose-400'
              }`}
            >
              {isRecording ? 'En cours...' : 'Lancer l\'enregistrement →'}
            </span>

            {isRecording && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onTogglePause();
                }}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
              >
                {isPaused ? <Play className="w-4 h-4 fill-current" /> : <Pause className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Recent Captures Preview Section */}
      <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Dernières captures
            </h3>
          </div>
          <button
            onClick={onGoToGallery}
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition"
          >
            Tout voir ({recentItems.length})
          </button>
        </div>

        {recentItems.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs">
            <p>Aucune capture pour le moment.</p>
            <p className="text-[11px] text-slate-600 mt-0.5">
              Utilisez les boutons ci-dessus ou la bulle flottante sur votre écran.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {recentItems.slice(0, 3).map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  if (item.type === 'photo') {
                    onOpenEditor(item);
                  } else {
                    onOpenVideo(item);
                  }
                }}
                className="group relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 hover:border-indigo-500/50 cursor-pointer transition-all aspect-video"
              >
                {item.thumbnailUrl ? (
                  <img
                    src={item.thumbnailUrl}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-900 text-slate-600">
                    {item.type === 'photo' ? <Camera className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-2">
                  <div className="flex items-center justify-between text-[10px] text-white font-medium">
                    <span className="truncate max-w-[80px]">{item.title}</span>
                    <span className="uppercase text-[9px] px-1 rounded bg-black/60">
                      {item.type === 'video' ? 'Vidéo' : 'Photo'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
