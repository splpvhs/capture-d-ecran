export type MediaType = 'photo' | 'video';

export type PhotoFormat = 'image/png' | 'image/jpeg' | 'image/webp';

export type VideoResolutionPreset = 'native' | '4k' | '1080p' | '720p';
export type PhotoResolutionPreset = 'native' | '4k' | '1080p' | '720p';

export type VideoBitrate = 'ultra' | 'high' | 'medium' | 'standard'; // 20Mbps, 12Mbps, 6Mbps, 3Mbps
export type VideoFPS = 60 | 30 | 24;

export type ThemeMode = 'amoled' | 'dark' | 'light' | 'system';

export interface AppSettings {
  // Photo settings
  photoFormat: PhotoFormat;
  photoQualityPreset: PhotoResolutionPreset;
  photoQualityJpegRatio: number; // 0.8 - 1.0

  // Video settings
  videoResolutionPreset: VideoResolutionPreset;
  videoFPS: VideoFPS;
  videoBitrate: VideoBitrate;
  includeAudio: boolean;
  audioSource: 'all' | 'system' | 'mic';

  // Storage settings
  storageMode: 'auto-folder' | 'browser-download' | 'indexeddb-only';
  autoSaveToFolder: boolean;
  destinationFolderName: string; // e.g. "Screenshots" or picked folder name

  // Floating Button settings
  floatingButtonEnabled: boolean;
  hideFloatingButtonInCaptures: boolean; // Auto-hide guarantee
  hideDuringVideoRecording: boolean;
  floatingOpacity: number; // 0.2 to 1.0
  magneticEdgeSnap: boolean;
  countdownTimerSeconds: number; // 0 (instant), 3, 5, 10
  enableShutterSound: boolean;

  // Appearance
  theme: ThemeMode;
}

export interface MediaCaptureItem {
  id: string;
  type: MediaType;
  title: string;
  blob: Blob;
  dataUrl?: string;
  thumbnailUrl: string;
  createdAt: number;
  width: number;
  height: number;
  sizeBytes: number;
  durationSeconds?: number; // for videos
  format: string; // 'png', 'jpeg', 'webm', 'mp4'
  tags?: string[];
}

export type ActiveTab = 'studio' | 'gallery' | 'settings';

export type EditorTool = 'crop' | 'brush' | 'highlighter' | 'arrow' | 'rect' | 'circle' | 'text' | 'blur';

export interface EditorFilterState {
  brightness: number; // 0 - 200, default 100
  contrast: number;   // 0 - 200, default 100
  saturation: number; // 0 - 200, default 100
  grayscale: number;  // 0 - 100, default 0
  invert: number;     // 0 - 100, default 0
}
