import React, { useState } from 'react';
import {
  Settings,
  Folder,
  FolderCheck,
  Camera,
  Video,
  Moon,
  Sun,
  Eye,
  Volume2,
  VolumeX,
  Smartphone,
  HardDrive,
  Sparkles,
  Info,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sliders,
  ShieldCheck,
} from 'lucide-react';
import { AppSettings, PhotoFormat, VideoResolutionPreset, VideoBitrate, VideoFPS, ThemeMode } from '../types';
import { storeDirectoryHandle } from '../services/storage';

interface SettingsViewProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  storageUsageBytes: number;
  itemCount: number;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  storageUsageBytes,
  itemCount,
}) => {
  const [folderSuccessMsg, setFolderSuccessMsg] = useState<string | null>(null);
  const [folderErrorMsg, setFolderErrorMsg] = useState<string | null>(null);

  const handlePickFolder = async () => {
    try {
      if ('showDirectoryPicker' in window) {
        // @ts-expect-error showDirectoryPicker is supported in modern browsers
        const dirHandle = await window.showDirectoryPicker({
          id: 'screendroid_save_dir',
          mode: 'readwrite',
        });
        await storeDirectoryHandle(dirHandle);
        onUpdateSettings({
          ...settings,
          destinationFolderName: dirHandle.name,
          autoSaveToFolder: true,
        });
        setFolderSuccessMsg(`Dossier connecté : "${dirHandle.name}". Les captures y seront sauvegardées automatiquement.`);
        setFolderErrorMsg(null);
      } else {
        setFolderErrorMsg("L'accès direct aux dossiers n'est pas disponible sur ce navigateur. La sauvegarde automatique passera par les téléchargements directs et le stockage interne.");
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.warn('Folder pick error:', err);
        setFolderErrorMsg("Sélection du dossier annulée ou non autorisée.");
      }
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  };

  return (
    <div className="flex-1 max-w-2xl w-full mx-auto p-4 pb-28 space-y-5">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Settings className="w-5 h-5 text-indigo-400" />
          Paramètres de Capture
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Qualité maximale, dossier de destination et options du bouton flottant
        </p>
      </div>

      {/* SECTION 1: QUALITÉ PHOTO */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-4">
        <div className="flex items-center gap-2.5 pb-2 border-b border-slate-800">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Qualité des Captures Photo</h3>
            <p className="text-[11px] text-slate-400">Format d'export et résolution d'écran</p>
          </div>
        </div>

        {/* Resolution Preset */}
        <div>
          <label className="text-xs font-semibold text-slate-300 mb-2 block">
            Résolution de capture
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'native', label: 'Maximale Smartphone', desc: 'Définition native réelle' },
              { id: '4k', label: '4K Ultra HD', desc: '3840 × 2160 px' },
              { id: '1080p', label: 'Full HD 1080p', desc: '1920 × 1080 px' },
              { id: '720p', label: 'Standard 720p', desc: '1280 × 720 px' },
            ].map((res) => (
              <button
                key={res.id}
                onClick={() =>
                  onUpdateSettings({ ...settings, photoQualityPreset: res.id as VideoResolutionPreset })
                }
                className={`p-3 rounded-2xl border text-left transition-all ${
                  settings.photoQualityPreset === res.id
                    ? 'border-indigo-500 bg-indigo-500/15 text-white shadow-sm'
                    : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700'
                }`}
              >
                <p className="text-xs font-bold leading-tight">{res.label}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{res.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Format Selection */}
        <div>
          <label className="text-xs font-semibold text-slate-300 mb-2 block">Format d'image</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'image/png', label: 'PNG', badge: 'Sans perte' },
              { id: 'image/jpeg', label: 'JPEG', badge: 'Optimisé 95%' },
              { id: 'image/webp', label: 'WebP', badge: 'Haute fidélité' },
            ].map((fmt) => (
              <button
                key={fmt.id}
                onClick={() => onUpdateSettings({ ...settings, photoFormat: fmt.id as PhotoFormat })}
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  settings.photoFormat === fmt.id
                    ? 'border-indigo-500 bg-indigo-500/15 text-white shadow-sm'
                    : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700'
                }`}
              >
                <span className="text-xs font-bold block">{fmt.label}</span>
                <span className="text-[9px] text-indigo-300">{fmt.badge}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION 2: QUALITÉ VIDÉO (MAX SMARTPHONE) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-4">
        <div className="flex items-center gap-2.5 pb-2 border-b border-slate-800">
          <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
            <Video className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Qualité des Enregistrements Vidéo</h3>
            <p className="text-[11px] text-slate-400">Qualité maximale équivalente au smartphone</p>
          </div>
        </div>

        {/* Video Resolution */}
        <div>
          <label className="text-xs font-semibold text-slate-300 mb-2 block">
            Résolution maximale
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'native', label: 'Max Smartphone', tag: 'Native / 4K' },
              { id: '1080p', label: 'Full HD 1080p', tag: 'Recommandé' },
              { id: '720p', label: 'HD 720p', tag: 'Éco espace' },
            ].map((vRes) => (
              <button
                key={vRes.id}
                onClick={() =>
                  onUpdateSettings({ ...settings, videoResolutionPreset: vRes.id as VideoResolutionPreset })
                }
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  settings.videoResolutionPreset === vRes.id
                    ? 'border-rose-500 bg-rose-500/15 text-white shadow-sm'
                    : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700'
                }`}
              >
                <span className="text-xs font-bold block">{vRes.label}</span>
                <span className="text-[9px] text-rose-300">{vRes.tag}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Video Bitrate */}
        <div>
          <label className="text-xs font-semibold text-slate-300 mb-2 block">
            Débit binaire (Bitrate)
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'ultra', label: 'Ultra (20 Mbps)', desc: 'Qualité Studio' },
              { id: 'high', label: 'Élevé (12 Mbps)', desc: 'Haute clarté' },
              { id: 'medium', label: 'Moyen (6 Mbps)', desc: 'Équilibré' },
            ].map((br) => (
              <button
                key={br.id}
                onClick={() => onUpdateSettings({ ...settings, videoBitrate: br.id as VideoBitrate })}
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  settings.videoBitrate === br.id
                    ? 'border-rose-500 bg-rose-500/15 text-white shadow-sm'
                    : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700'
                }`}
              >
                <span className="text-xs font-bold block">{br.label}</span>
                <span className="text-[9px] text-slate-400">{br.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Frame Rate (FPS) */}
        <div>
          <label className="text-xs font-semibold text-slate-300 mb-2 block">
            Fréquence d'images (Images/sec)
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { fps: 60, label: '60 FPS', note: 'Ultra Fluide' },
              { fps: 30, label: '30 FPS', note: 'Standard' },
              { fps: 24, label: '24 FPS', note: 'Cinéma' },
            ].map((f) => (
              <button
                key={f.fps}
                onClick={() => onUpdateSettings({ ...settings, videoFPS: f.fps as VideoFPS })}
                className={`p-2 rounded-xl border text-center transition-all ${
                  settings.videoFPS === f.fps
                    ? 'border-rose-500 bg-rose-500/15 text-white shadow-sm'
                    : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700'
                }`}
              >
                <span className="text-xs font-bold block">{f.label}</span>
                <span className="text-[9px] text-slate-400">{f.note}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Audio Recording */}
        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-slate-400" />
            <div>
              <p className="text-xs font-semibold text-white">Enregistrer le son</p>
              <p className="text-[10px] text-slate-400">Audio du système et microphone</p>
            </div>
          </div>
          <input
            type="checkbox"
            checked={settings.includeAudio}
            onChange={(e) => onUpdateSettings({ ...settings, includeAudio: e.target.checked })}
            className="w-5 h-5 rounded-lg accent-rose-500 cursor-pointer"
          />
        </div>
      </div>

      {/* SECTION 3: STOCKAGE & DOSSIER DE DESTINATION AUTOMATIQUE */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-4">
        <div className="flex items-center gap-2.5 pb-2 border-b border-slate-800">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
            <Folder className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Dossier de Stockage Automatique</h3>
            <p className="text-[11px] text-slate-400">Emplacement de sauvegarde sur votre appareil</p>
          </div>
        </div>

        {/* Current Folder Display */}
        <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center shrink-0">
              <FolderCheck className="w-5 h-5 text-amber-400" />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-white truncate">
                {settings.destinationFolderName || "Captures d'écran"}
              </p>
              <p className="text-[10px] text-slate-400 truncate">
                Dossier de destination actif
              </p>
            </div>
          </div>

          <button
            onClick={handlePickFolder}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition active:scale-95 shrink-0"
          >
            <span>Changer de dossier</span>
          </button>
        </div>

        {folderSuccessMsg && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{folderSuccessMsg}</span>
          </div>
        )}

        {folderErrorMsg && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{folderErrorMsg}</span>
          </div>
        )}

        {/* Auto-save Toggle */}
        <div className="flex items-center justify-between pt-1">
          <div>
            <p className="text-xs font-semibold text-white">Sauvegarde automatique</p>
            <p className="text-[10px] text-slate-400">
              Sauvegarder immédiatement dans le dossier sélectionné sans confirmation
            </p>
          </div>
          <input
            type="checkbox"
            checked={settings.autoSaveToFolder}
            onChange={(e) => onUpdateSettings({ ...settings, autoSaveToFolder: e.target.checked })}
            className="w-5 h-5 rounded-lg accent-amber-500 cursor-pointer"
          />
        </div>

        {/* Storage stats */}
        <div className="p-3 bg-slate-950/70 rounded-2xl border border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-indigo-400" />
            <span>Espace interne utilisé</span>
          </div>
          <span className="font-semibold text-slate-200">
            {formatSize(storageUsageBytes)} ({itemCount} éléments)
          </span>
        </div>
      </div>

      {/* SECTION 4: BOUTON FLOTTANT & INVISIBILITÉ DANS LES CAPTURES */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-4">
        <div className="flex items-center gap-2.5 pb-2 border-b border-slate-800">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Bouton Flottant (Widget Android)</h3>
            <p className="text-[11px] text-slate-400">Accès rapide et comportement d'invisibilité</p>
          </div>
        </div>

        {/* Guarantee Banner: bouton flottant ne doit pas apparaitre */}
        <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-start gap-2.5">
          <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-indigo-200">Garantie d'invisibilité totale</p>
            <p className="text-[11px] text-indigo-300/80 leading-relaxed mt-0.5">
              Le bouton flottant est automatiquement masqué et retiré de l'écran lors du déclenchement
              d'une capture photo ou vidéo, afin qu'il ne pollue jamais vos enregistrements.
            </p>
          </div>
        </div>

        {/* Invisibility toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-white">Masquer dans les captures</p>
            <p className="text-[10px] text-slate-400">Toujours invisible dans l'image ou la vidéo finale</p>
          </div>
          <input
            type="checkbox"
            checked={settings.hideFloatingButtonInCaptures}
            onChange={(e) =>
              onUpdateSettings({ ...settings, hideFloatingButtonInCaptures: e.target.checked })
            }
            className="w-5 h-5 rounded-lg accent-indigo-500 cursor-pointer"
          />
        </div>

        {/* Hide during recording */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-white">Discrétion pendant la vidéo</p>
            <p className="text-[10px] text-slate-400">
              Minimise le bouton au bord de l'écran pendant l'enregistrement
            </p>
          </div>
          <input
            type="checkbox"
            checked={settings.hideDuringVideoRecording}
            onChange={(e) =>
              onUpdateSettings({ ...settings, hideDuringVideoRecording: e.target.checked })
            }
            className="w-5 h-5 rounded-lg accent-indigo-500 cursor-pointer"
          />
        </div>

        {/* Countdown Timer */}
        <div>
          <label className="text-xs font-semibold text-slate-300 mb-2 block flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Retardateur avant capture</span>
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[
              { sec: 0, label: 'Instantané' },
              { sec: 3, label: '3 sec' },
              { sec: 5, label: '5 sec' },
              { sec: 10, label: '10 sec' },
            ].map((t) => (
              <button
                key={t.sec}
                onClick={() => onUpdateSettings({ ...settings, countdownTimerSeconds: t.sec })}
                className={`py-2 rounded-xl border text-xs font-bold transition-all ${
                  settings.countdownTimerSeconds === t.sec
                    ? 'border-indigo-500 bg-indigo-500/20 text-white'
                    : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Shutter sound */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-white">Bruit d'obturateur photo</p>
            <p className="text-[10px] text-slate-400">Son de clic mécanique réaliste à la capture</p>
          </div>
          <input
            type="checkbox"
            checked={settings.enableShutterSound}
            onChange={(e) =>
              onUpdateSettings({ ...settings, enableShutterSound: e.target.checked })
            }
            className="w-5 h-5 rounded-lg accent-indigo-500 cursor-pointer"
          />
        </div>
      </div>

      {/* SECTION 5: MODE SOMBRE & APPARENCE */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-4">
        <div className="flex items-center gap-2.5 pb-2 border-b border-slate-800">
          <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
            <Moon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Thème &amp; Mode Sombre</h3>
            <p className="text-[11px] text-slate-400">Optimisé pour les écrans AMOLED et le confort visuel</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { id: 'dark', label: 'Sombre Minuit', desc: 'Gris ardoise élégant', icon: Moon },
            { id: 'amoled', label: 'Noir AMOLED', desc: 'Économie batterie OLED', icon: Moon },
            { id: 'light', label: 'Mode Clair', desc: 'Lumineux & épuré', icon: Sun },
            { id: 'system', label: 'Système', desc: 'Suit les réglages Android', icon: Smartphone },
          ].map((themeOpt) => {
            const Icon = themeOpt.icon;
            return (
              <button
                key={themeOpt.id}
                onClick={() => onUpdateSettings({ ...settings, theme: themeOpt.id as ThemeMode })}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  settings.theme === themeOpt.id
                    ? 'border-purple-500 bg-purple-500/15 text-white shadow-sm'
                    : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700'
                }`}
              >
                <Icon className="w-4 h-4 mb-1 text-purple-400" />
                <p className="text-xs font-bold leading-tight">{themeOpt.label}</p>
                <p className="text-[9px] text-slate-400 mt-0.5">{themeOpt.desc}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
