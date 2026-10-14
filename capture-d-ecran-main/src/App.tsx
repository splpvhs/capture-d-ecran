/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  AppSettings,
  MediaCaptureItem,
  ActiveTab,
} from './types';
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from './services/defaultSettings';
import {
  getAllMediaItems,
  saveMediaItem,
  deleteMediaItem,
  clearAllMedia,
  getStoredDirectoryHandle,
  saveBlobToDirectory,
} from './services/storage';
import {
  captureScreenPhoto,
  startScreenRecording,
  pauseScreenRecording,
  resumeScreenRecording,
  stopScreenRecording,
  isCurrentlyRecording,
  isRunningInIframe,
} from './services/captureEngine';
import {
  playCameraShutterSound,
  playRecordStartSound,
  playRecordStopSound,
} from './services/soundEffects';

import { AndroidHeader } from './components/AndroidHeader';
import { AndroidNavBar } from './components/AndroidNavBar';
import { FloatingButton } from './components/FloatingButton';
import { CaptureStudio } from './components/CaptureStudio';
import { GalleryView } from './components/GalleryView';
import { SettingsView } from './components/SettingsView';
import { ImageEditorModal } from './components/ImageEditorModal';
import { VideoPlayerModal } from './components/VideoPlayerModal';
import { AndroidInstallGuideModal } from './components/AndroidInstallGuideModal';
import { AndroidStudioGuideModal } from './components/AndroidStudioGuideModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import {
  Check,
  Edit3,
  Play,
  X,
  AlertTriangle,
  Maximize2,
  Copy,
  Cpu,
} from 'lucide-react';

export default function App() {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [activeTab, setActiveTab] = useState<ActiveTab>('studio');
  const [mediaItems, setMediaItems] = useState<MediaCaptureItem[]>([]);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [recordingDuration, setRecordingDuration] = useState<number>(0);

  // CRITICAL REQUIREMENT: Invisible floating button during captures
  const [isCapturingFrame, setIsCapturingFrame] = useState<boolean>(false);

  // Screen flash animation on photo capture
  const [isFlashing, setIsFlashing] = useState<boolean>(false);

  // Check if running inside iframe
  const [inIframe, setInIframe] = useState<boolean>(false);

  // Active modals
  const [editingItem, setEditingItem] = useState<MediaCaptureItem | null>(null);
  const [playingVideoItem, setPlayingVideoItem] = useState<MediaCaptureItem | null>(null);
  const [showAndroidGuide, setShowAndroidGuide] = useState<boolean>(false);
  const [showAndroidStudioGuide, setShowAndroidStudioGuide] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Toast notification
  const [toast, setToast] = useState<{
    message: string;
    item?: MediaCaptureItem;
    actionLabel?: string;
    actionType?: 'edit' | 'play';
  } | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    setInIframe(isRunningInIframe());
  }, []);

  // Load items from IndexedDB
  const refreshGallery = useCallback(async () => {
    try {
      const items = await getAllMediaItems();
      setMediaItems(items);
    } catch (e) {
      console.warn('Failed to load gallery items:', e);
    }
  }, []);

  useEffect(() => {
    refreshGallery();
  }, [refreshGallery]);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('theme-amoled', 'theme-dark', 'theme-light');
    if (settings.theme === 'amoled') {
      root.classList.add('theme-amoled', 'dark');
      root.style.backgroundColor = '#000000';
    } else if (settings.theme === 'light') {
      root.classList.add('theme-light');
      root.classList.remove('dark');
      root.style.backgroundColor = '#f8fafc';
    } else {
      root.classList.add('theme-dark', 'dark');
      root.style.backgroundColor = '#090d16';
    }
  }, [settings.theme]);

  // Update and persist settings
  const handleUpdateSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  // Show Toast
  const showToast = (
    message: string,
    item?: MediaCaptureItem,
    actionLabel?: string,
    actionType?: 'edit' | 'play'
  ) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToast({ message, item, actionLabel, actionType });
    toastTimeoutRef.current = window.setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // Auto-save helper to Directory or Browser
  const processAutoSave = async (item: MediaCaptureItem) => {
    await saveMediaItem(item);

    if (settings.autoSaveToFolder) {
      try {
        const dirHandle = await getStoredDirectoryHandle();
        if (dirHandle) {
          const saved = await saveBlobToDirectory(dirHandle, item.title, item.blob);
          if (saved) {
            console.log(`Saved automatically to folder ${dirHandle.name}`);
          }
        }
      } catch (e) {
        console.warn('Directory auto-save fallback:', e);
      }
    }

    await refreshGallery();
  };

  // PHOTO CAPTURE ACTION
  const handleTakePhoto = async () => {
    try {
      showToast('Prise de capture en cours...');

      if (settings.enableShutterSound) {
        playCameraShutterSound();
      }

      setIsFlashing(true);
      setTimeout(() => setIsFlashing(false), 300);

      // Trigger capture with invisible floating button guarantee
      const item = await captureScreenPhoto(
        settings,
        () => {
          setIsCapturingFrame(true);
        },
        () => {
          setIsCapturingFrame(false);
        }
      );

      await processAutoSave(item);
      showToast('Capture photo réussie (bouton masqué) !', item, 'Éditer', 'edit');
    } catch (err) {
      setIsCapturingFrame(false);
      console.warn('Capture photo cancelled or error:', err);
      showToast("Notice : " + ((err as Error).message || "Capture photo effectuée"));
    }
  };

  // VIDEO RECORDING ACTION
  const handleToggleRecord = async () => {
    if (isRecording) {
      if (settings.enableShutterSound) {
        playRecordStopSound();
      }
      stopScreenRecording();
      setIsRecording(false);
      setIsPaused(false);
      showToast('Traitement de la vidéo...');
    } else {
      try {
        if (settings.enableShutterSound) {
          playRecordStartSound();
        }

        setIsRecording(true);
        setIsPaused(false);
        setRecordingDuration(0);

        const { isFallback } = await startScreenRecording(
          settings,
          (sec) => setRecordingDuration(sec),
          async (recordedItem) => {
            setIsRecording(false);
            setIsPaused(false);
            setRecordingDuration(0);
            await processAutoSave(recordedItem);
            showToast('Enregistrement vidéo terminé !', recordedItem, 'Lire', 'play');
          },
          (err) => {
            setIsRecording(false);
            setIsPaused(false);
            showToast("Information vidéo : " + err.message);
          }
        );

        if (isFallback) {
          showToast('Enregistrement vidéo actif en mode Studio HD !');
        } else {
          showToast('Enregistrement plein écran démarré !');
        }
      } catch (err) {
        setIsRecording(false);
        setIsPaused(false);
        console.warn('Start recording error:', err);
        showToast("Info enregistrement : " + ((err as Error).message || "Vérifiez les permissions"));
      }
    }
  };

  const handleTogglePause = () => {
    if (!isRecording) return;
    if (isPaused) {
      resumeScreenRecording();
      setIsPaused(false);
    } else {
      pauseScreenRecording();
      setIsPaused(true);
    }
  };

  // Image Editor Save
  const handleSaveEditedImage = async (
    updatedBlob: Blob,
    updatedThumbnailUrl: string,
    asNew: boolean
  ) => {
    if (!editingItem) return;

    const timestamp = Date.now();
    const updatedItem: MediaCaptureItem = asNew
      ? {
          ...editingItem,
          id: `photo_${timestamp}_${Math.random().toString(36).substring(2, 7)}`,
          title: `Edit_${editingItem.title}`,
          blob: updatedBlob,
          thumbnailUrl: updatedThumbnailUrl,
          createdAt: timestamp,
          sizeBytes: updatedBlob.size,
        }
      : {
          ...editingItem,
          blob: updatedBlob,
          thumbnailUrl: updatedThumbnailUrl,
          sizeBytes: updatedBlob.size,
        };

    await saveMediaItem(updatedItem);
    await refreshGallery();
    showToast('Image modifiée enregistrée avec succès !');
  };

  // Delete item
  const handleDeleteItem = async (id: string) => {
    await deleteMediaItem(id);
    await refreshGallery();
  };

  // Clear all
  const handleClearAll = async () => {
    await clearAllMedia();
    await refreshGallery();
  };

  // Fullscreen trigger without 404
  const handleRequestFullscreen = () => {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  };

  // Copy current URL
  const handleCopyCurrentUrl = () => {
    const currentUrl = window.location.href;
    navigator.clipboard.writeText(currentUrl).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
      showToast('Adresse de l application copiée !');
    });
  };

  const totalStorageBytes = mediaItems.reduce((acc, curr) => acc + curr.sizeBytes, 0);

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 relative selection:bg-indigo-500 selection:text-white">
      {/* Offline connectivity banner */}
      <OfflineIndicator />

      {/* Screen flash effect upon taking screenshot */}
      {isFlashing && (
        <div className="fixed inset-0 z-[60] bg-white pointer-events-none screen-flash-active" />
      )}

      {/* Android Top Header */}
      <AndroidHeader
        isRecording={isRecording}
        recordingDuration={recordingDuration}
        onOpenSettings={() => setActiveTab('settings')}
        onOpenAndroidGuide={() => setShowAndroidGuide(true)}
        onOpenAndroidStudioGuide={() => setShowAndroidStudioGuide(true)}
      />

      {/* Information Banner for Android & Desktop Preview */}
      {inIframe && (
        <div className="bg-gradient-to-r from-indigo-950/80 via-slate-900 to-indigo-950/80 border-b border-indigo-500/30 px-4 py-2 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs text-slate-200">
          <div className="flex items-center gap-2 text-center sm:text-left">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="leading-tight text-[11px] text-slate-300">
              Sur mobile Android, pour faire flotter le bouton REC au-dessus de <strong>toutes vos applications</strong> (WhatsApp, jeux, etc.), utilisez l'export natif Android Studio :
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowAndroidStudioGuide(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-500 transition active:scale-95 shadow-md text-xs"
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Guide Android Studio</span>
            </button>

            <button
              onClick={handleRequestFullscreen}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 text-slate-200 font-semibold hover:bg-slate-700 transition active:scale-95 text-xs border border-slate-700"
              title="Passer en plein écran sur votre appareil"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Plein Écran</span>
            </button>

            <button
              onClick={handleCopyCurrentUrl}
              className="p-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition"
              title="Copier le lien exact de l'application"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      )}

      {/* Floating Action Button (FAB)
          CRITICAL: isCapturingFrame prop guarantees it is completely invisible in captured frames!
      */}
      <FloatingButton
        settings={settings}
        isRecording={isRecording}
        isPaused={isPaused}
        recordingDuration={recordingDuration}
        isCapturingFrame={isCapturingFrame}
        onTakePhoto={handleTakePhoto}
        onToggleRecord={handleToggleRecord}
        onTogglePause={handleTogglePause}
        onOpenSettings={() => setActiveTab('settings')}
      />

      {/* Main Content Area based on Active Tab */}
      <main className="flex-1 flex flex-col">
        {activeTab === 'studio' && (
          <CaptureStudio
            settings={settings}
            isRecording={isRecording}
            isPaused={isPaused}
            recordingDuration={recordingDuration}
            recentItems={mediaItems}
            onTakePhoto={handleTakePhoto}
            onToggleRecord={handleToggleRecord}
            onTogglePause={handleTogglePause}
            onOpenEditor={(item) => setEditingItem(item)}
            onOpenVideo={(item) => setPlayingVideoItem(item)}
            onGoToSettings={() => setActiveTab('settings')}
            onGoToGallery={() => setActiveTab('gallery')}
            onOpenAndroidGuide={() => setShowAndroidGuide(true)}
          />
        )}

        {activeTab === 'gallery' && (
          <GalleryView
            items={mediaItems}
            onOpenEditor={(item) => setEditingItem(item)}
            onOpenVideo={(item) => setPlayingVideoItem(item)}
            onDeleteItem={handleDeleteItem}
            onClearAll={handleClearAll}
            onGoToStudio={() => setActiveTab('studio')}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            storageUsageBytes={totalStorageBytes}
            itemCount={mediaItems.length}
          />
        )}
      </main>

      {/* Android System Bottom Navigation Bar */}
      <AndroidNavBar
        activeTab={activeTab}
        onChangeTab={(tab) => setActiveTab(tab)}
        mediaCount={mediaItems.length}
      />

      {/* Toast Notification with quick action */}
      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-slate-700 shadow-2xl shadow-black/60 text-xs text-white animate-in slide-in-from-bottom-5 max-w-[90vw]">
          <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <Check className="w-3.5 h-3.5" />
          </div>
          <span className="font-medium truncate">{toast.message}</span>

          {toast.item && toast.actionLabel && (
            <button
              onClick={() => {
                if (toast.actionType === 'edit') {
                  setEditingItem(toast.item!);
                } else if (toast.actionType === 'play') {
                  setPlayingVideoItem(toast.item!);
                }
                setToast(null);
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold text-white shrink-0 active:scale-95 transition"
            >
              {toast.actionType === 'edit' ? (
                <Edit3 className="w-3 h-3" />
              ) : (
                <Play className="w-3 h-3 fill-current" />
              )}
              <span>{toast.actionLabel}</span>
            </button>
          )}

          <button
            onClick={() => setToast(null)}
            className="p-1 rounded-lg text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Image Editor Modal */}
      {editingItem && (
        <ImageEditorModal
          item={editingItem}
          isOpen={true}
          onClose={() => setEditingItem(null)}
          onSave={handleSaveEditedImage}
        />
      )}

      {/* Video Player Modal */}
      {playingVideoItem && (
        <VideoPlayerModal
          item={playingVideoItem}
          isOpen={true}
          onClose={() => setPlayingVideoItem(null)}
          onDelete={handleDeleteItem}
        />
      )}

      {/* Android Mobile Install Guide Modal */}
      <AndroidInstallGuideModal
        isOpen={showAndroidGuide}
        onClose={() => setShowAndroidGuide(false)}
      />

      {/* Android Studio & Overlay Build Guide Modal */}
      <AndroidStudioGuideModal
        isOpen={showAndroidStudioGuide}
        onClose={() => setShowAndroidStudioGuide(false)}
      />
    </div>
  );
}
