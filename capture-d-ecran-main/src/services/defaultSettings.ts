import { AppSettings } from '../types';

export const DEFAULT_SETTINGS: AppSettings = {
  // Photo
  photoFormat: 'image/png',
  photoQualityPreset: 'native',
  photoQualityJpegRatio: 0.95,

  // Video
  videoResolutionPreset: 'native',
  videoFPS: 60,
  videoBitrate: 'ultra', // Smartphone max quality 20Mbps
  includeAudio: true,
  audioSource: 'all',

  // Storage
  storageMode: 'auto-folder',
  autoSaveToFolder: true,
  destinationFolderName: "Captures d'écran",

  // Floating Button
  floatingButtonEnabled: true,
  hideFloatingButtonInCaptures: true, // Invisible in captures!
  hideDuringVideoRecording: true, // Auto-minimize or hide during video
  floatingOpacity: 0.95,
  magneticEdgeSnap: true,
  countdownTimerSeconds: 0,
  enableShutterSound: true,

  // Appearance
  theme: 'dark',
};

const SETTINGS_STORAGE_KEY = 'screendroid_settings_v1';

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (e) {
    console.warn('Failed to load settings from localStorage', e);
  }
  return DEFAULT_SETTINGS;
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn('Failed to save settings', e);
  }
}
