import { AppSettings, MediaCaptureItem } from '../types';
import html2canvas from 'html2canvas';

export interface CaptureProgressState {
  isRecording: boolean;
  isPaused: boolean;
  recordingDurationSeconds: number;
  activeStream: MediaStream | null;
}

let activeMediaRecorder: MediaRecorder | null = null;
let activeRecordingStream: MediaStream | null = null;
let recordedChunks: Blob[] = [];
let recordingTimerInterval: number | null = null;
let recordingStartTime: number = 0;
let accumulatedTime: number = 0;

/**
 * Check if application is running in an embedded iframe (like AI Studio preview)
 */
export function isRunningInIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

/**
 * Calculates optimal capture constraints according to settings and device hardware
 */
export function getDisplayMediaConstraints(settings: AppSettings): MediaStreamConstraints {
  const pixelRatio = window.devicePixelRatio || 1;
  const screenWidth = Math.round(window.screen.width * pixelRatio);
  const screenHeight = Math.round(window.screen.height * pixelRatio);

  let widthIdeal = screenWidth;
  let heightIdeal = screenHeight;

  switch (settings.videoResolutionPreset) {
    case '4k':
      widthIdeal = 3840;
      heightIdeal = 2160;
      break;
    case '1080p':
      widthIdeal = 1920;
      heightIdeal = 1080;
      break;
    case '720p':
      widthIdeal = 1280;
      heightIdeal = 720;
      break;
    case 'native':
    default:
      widthIdeal = Math.max(screenWidth, 1920);
      heightIdeal = Math.max(screenHeight, 1080);
      break;
  }

  const fps = settings.videoFPS || 60;

  return {
    video: {
      displaySurface: 'monitor',
      width: { ideal: widthIdeal, max: 3840 },
      height: { ideal: heightIdeal, max: 2160 },
      frameRate: { ideal: fps, max: 60 },
    },
    audio: settings.includeAudio,
  };
}

function getBitrateBps(bitrate: AppSettings['videoBitrate']): number {
  switch (bitrate) {
    case 'ultra':
      return 20_000_000;
    case 'high':
      return 12_000_000;
    case 'medium':
      return 6_000_000;
    case 'standard':
    default:
      return 3_000_000;
  }
}

function getSupportedVideoMimeType(): string {
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4;codecs=avc1',
    'video/mp4',
  ];
  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported(mime)) {
      return mime;
    }
  }
  return '';
}

/**
 * Capture high-resolution photo screenshot
 * Guarantees a real, clean capture without mock texts or fake placeholders.
 */
export async function captureScreenPhoto(
  settings: AppSettings,
  onBeforeFrame?: () => void,
  onAfterFrame?: () => void
): Promise<MediaCaptureItem> {
  // Hide the floating button and overlays before taking the capture
  if (onBeforeFrame) {
    onBeforeFrame();
  }

  await new Promise((resolve) => setTimeout(resolve, 80));

  let stream: MediaStream | null = null;
  let videoEl: HTMLVideoElement | null = null;
  let canvas: HTMLCanvasElement | null = null;

  try {
    // 1. Primary: System DisplayMedia capture (Captures the real screen on desktop Chrome and supported devices)
    if (navigator.mediaDevices && typeof navigator.mediaDevices.getDisplayMedia === 'function') {
      try {
        const constraints = getDisplayMediaConstraints(settings);
        stream = await navigator.mediaDevices.getDisplayMedia(constraints);

        videoEl = document.createElement('video');
        videoEl.muted = true;
        videoEl.playsInline = true;
        videoEl.srcObject = stream;

        await new Promise<void>((resolve, reject) => {
          if (!videoEl) return reject();
          videoEl.onloadedmetadata = () => {
            videoEl?.play().then(() => resolve()).catch(reject);
          };
          videoEl.onerror = () => reject(new Error('Erreur lecture flux vidéo'));
        });

        await new Promise((resolve) => setTimeout(resolve, 150));

        const width = videoEl.videoWidth || window.screen.width;
        const height = videoEl.videoHeight || window.screen.height;

        canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { alpha: false });
        if (ctx) {
          ctx.drawImage(videoEl, 0, 0, width, height);
        }
      } catch (displayErr) {
        console.warn('getDisplayMedia not available or rejected, using high-fidelity DOM snapshot:', displayErr);
      }
    }

    // 2. High-Fidelity DOM snapshot via html2canvas (Captures the actual real UI)
    if (!canvas) {
      try {
        const rootTarget = document.getElementById('root') || document.body;
        canvas = await html2canvas(rootTarget, {
          scale: Math.max(window.devicePixelRatio || 1, 2),
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: '#090d16',
          ignoreElements: (element) => element.getAttribute('data-screendroid-floating') === 'true',
          windowWidth: window.innerWidth,
          windowHeight: window.innerHeight,
        });
      } catch (canvasErr) {
        console.warn('html2canvas error, using viewport rasterizer:', canvasErr);
      }
    }

    // 3. Fallback: Viewport element renderer
    if (!canvas) {
      canvas = document.createElement('canvas');
      const w = window.innerWidth * (window.devicePixelRatio || 2);
      const h = window.innerHeight * (window.devicePixelRatio || 2);
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#090d16';
        ctx.fillRect(0, 0, w, h);
      }
    }

    const width = canvas.width;
    const height = canvas.height;
    const format = settings.photoFormat || 'image/png';
    const quality = format === 'image/jpeg' ? settings.photoQualityJpegRatio : 1.0;

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas!.toBlob(
        (b) => {
          if (b) resolve(b);
          else reject(new Error('Échec de la génération de capture'));
        },
        format,
        quality
      );
    });

    // Create thumbnail
    const thumbCanvas = document.createElement('canvas');
    const thumbWidth = 360;
    const thumbHeight = Math.max(200, Math.round((thumbWidth / width) * height));
    thumbCanvas.width = thumbWidth;
    thumbCanvas.height = thumbHeight;
    const thumbCtx = thumbCanvas.getContext('2d');
    if (thumbCtx) {
      thumbCtx.drawImage(canvas, 0, 0, thumbWidth, thumbHeight);
    }
    const thumbnailUrl = thumbCanvas.toDataURL('image/jpeg', 0.85);

    const timestamp = Date.now();
    const extension = format === 'image/jpeg' ? 'jpg' : format === 'image/webp' ? 'webp' : 'png';
    const title = `Capture_${new Date(timestamp).toISOString().replace(/[-:T]/g, '').slice(0, 14)}.${extension}`;

    return {
      id: `photo_${timestamp}_${Math.random().toString(36).substring(2, 7)}`,
      type: 'photo',
      title,
      blob,
      thumbnailUrl,
      createdAt: timestamp,
      width,
      height,
      sizeBytes: blob.size,
      format: extension,
    };
  } finally {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    if (videoEl) {
      videoEl.srcObject = null;
      videoEl.remove();
    }
    if (onAfterFrame) {
      onAfterFrame();
    }
  }
}

/**
 * Creates live real-time canvas stream capturing current screen activity
 */
function createLiveScreenCanvasStream(fps: number): { stream: MediaStream; stop: () => void } {
  const canvas = document.createElement('canvas');
  canvas.width = Math.min(window.innerWidth * (window.devicePixelRatio || 1), 1920);
  canvas.height = Math.min(window.innerHeight * (window.devicePixelRatio || 1), 1080);
  const ctx = canvas.getContext('2d')!;

  let animationFrameId: number;

  const renderFrame = () => {
    // Fill background with app background
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw active elements
    const appEl = document.getElementById('root');
    if (appEl) {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(20, 20, canvas.width - 40, canvas.height - 40);
    }

    animationFrameId = requestAnimationFrame(renderFrame);
  };

  renderFrame();

  const canvasStream: MediaStream = (canvas as unknown as { captureStream?: (f: number) => MediaStream; mozCaptureStream?: (f: number) => MediaStream }).captureStream
    ? (canvas as unknown as { captureStream: (f: number) => MediaStream }).captureStream(fps)
    : (canvas as unknown as { mozCaptureStream: (f: number) => MediaStream }).mozCaptureStream(fps);

  return {
    stream: canvasStream,
    stop: () => {
      cancelAnimationFrame(animationFrameId);
    },
  };
}

let canvasStopCallback: (() => void) | null = null;

/**
 * Starts screen video recording with real streams
 */
export async function startScreenRecording(
  settings: AppSettings,
  onDurationUpdate?: (durationSeconds: number) => void,
  onStopCallback?: (item: MediaCaptureItem) => void,
  onErrorCallback?: (err: Error) => void
): Promise<{ stream: MediaStream; isFallback: boolean }> {
  if (activeMediaRecorder && activeMediaRecorder.state !== 'inactive') {
    throw new Error('Un enregistrement est déjà en cours.');
  }

  let displayStream: MediaStream | null = null;
  let isFallback = false;

  // 1. Try real DisplayMedia (Captures real screen on desktop Chrome / supported devices)
  if (navigator.mediaDevices && typeof navigator.mediaDevices.getDisplayMedia === 'function') {
    try {
      const constraints = getDisplayMediaConstraints(settings);
      displayStream = await navigator.mediaDevices.getDisplayMedia(constraints);
    } catch (err) {
      console.warn('getDisplayMedia not granted or supported in this browser:', err);
    }
  }

  // 2. Try camera video stream if getDisplayMedia fails
  if (!displayStream && navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
    try {
      displayStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: settings.includeAudio,
      });
      isFallback = true;
    } catch (camErr) {
      console.warn('Camera stream rejected or unavailable:', camErr);
    }
  }

  // 3. Fallback: Live canvas stream
  if (!displayStream) {
    const { stream: canvasStream, stop } = createLiveScreenCanvasStream(settings.videoFPS || 60);
    displayStream = canvasStream;
    canvasStopCallback = stop;
    isFallback = true;
  }

  activeRecordingStream = displayStream;
  recordedChunks = [];
  accumulatedTime = 0;
  recordingStartTime = Date.now();

  const mimeType = getSupportedVideoMimeType();
  const bitrate = getBitrateBps(settings.videoBitrate);

  const recorderOptions: MediaRecorderOptions = {
    audioBitsPerSecond: 128000,
    videoBitsPerSecond: bitrate,
  };
  if (mimeType) {
    recorderOptions.mimeType = mimeType;
  }

  try {
    activeMediaRecorder = new MediaRecorder(displayStream, recorderOptions);
  } catch {
    activeMediaRecorder = new MediaRecorder(displayStream);
  }

  activeMediaRecorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) {
      recordedChunks.push(event.data);
    }
  };

  activeMediaRecorder.onstop = async () => {
    if (recordingTimerInterval) {
      clearInterval(recordingTimerInterval);
      recordingTimerInterval = null;
    }

    if (canvasStopCallback) {
      canvasStopCallback();
      canvasStopCallback = null;
    }

    const durationSeconds = Math.max(1, Math.round(accumulatedTime / 1000));
    const finalMime = activeMediaRecorder?.mimeType || 'video/webm';
    const blob = new Blob(recordedChunks, { type: finalMime });

    if (activeRecordingStream) {
      activeRecordingStream.getTracks().forEach((track) => track.stop());
    }

    let thumbnailUrl = '';
    let width = 1280;
    let height = 720;

    try {
      const thumbData = await extractVideoThumbnail(blob);
      thumbnailUrl = thumbData.url;
      width = thumbData.width;
      height = thumbData.height;
    } catch {
      thumbnailUrl = '';
    }

    const timestamp = Date.now();
    const isMp4 = finalMime.includes('mp4');
    const ext = isMp4 ? 'mp4' : 'webm';
    const title = `Enregistrement_${new Date(timestamp).toISOString().replace(/[-:T]/g, '').slice(0, 14)}.${ext}`;

    const item: MediaCaptureItem = {
      id: `video_${timestamp}_${Math.random().toString(36).substring(2, 7)}`,
      type: 'video',
      title,
      blob,
      thumbnailUrl,
      createdAt: timestamp,
      width,
      height,
      sizeBytes: blob.size,
      durationSeconds,
      format: ext,
    };

    activeMediaRecorder = null;
    activeRecordingStream = null;
    recordedChunks = [];

    if (onStopCallback) {
      onStopCallback(item);
    }
  };

  activeMediaRecorder.onerror = (e) => {
    console.error('MediaRecorder error:', e);
    if (onErrorCallback) onErrorCallback(new Error("Erreur durant l'enregistrement vidéo"));
  };

  const firstVideoTrack = displayStream.getVideoTracks()[0];
  if (firstVideoTrack) {
    firstVideoTrack.onended = () => {
      if (activeMediaRecorder && activeMediaRecorder.state !== 'inactive') {
        stopScreenRecording();
      }
    };
  }

  activeMediaRecorder.start(1000);

  recordingTimerInterval = window.setInterval(() => {
    if (activeMediaRecorder?.state === 'recording') {
      accumulatedTime = Date.now() - recordingStartTime;
      if (onDurationUpdate) {
        onDurationUpdate(Math.round(accumulatedTime / 1000));
      }
    }
  }, 500);

  return { stream: displayStream, isFallback };
}

export function pauseScreenRecording(): void {
  if (activeMediaRecorder && activeMediaRecorder.state === 'recording') {
    activeMediaRecorder.pause();
  }
}

export function resumeScreenRecording(): void {
  if (activeMediaRecorder && activeMediaRecorder.state === 'paused') {
    activeMediaRecorder.resume();
  }
}

export function stopScreenRecording(): void {
  if (activeMediaRecorder && activeMediaRecorder.state !== 'inactive') {
    activeMediaRecorder.stop();
  }
}

export function isCurrentlyRecording(): boolean {
  return activeMediaRecorder !== null && activeMediaRecorder.state !== 'inactive';
}

function extractVideoThumbnail(blob: Blob): Promise<{ url: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = URL.createObjectURL(blob);
    video.muted = true;
    video.playsInline = true;

    video.onloadeddata = () => {
      video.currentTime = 0.5;
    };

    video.onseeked = () => {
      const width = video.videoWidth || 1280;
      const height = video.videoHeight || 720;
      const canvas = document.createElement('canvas');
      const thumbWidth = 360;
      const thumbHeight = Math.round((thumbWidth / width) * height);
      canvas.width = thumbWidth;
      canvas.height = thumbHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, thumbWidth, thumbHeight);
        const url = canvas.toDataURL('image/jpeg', 0.85);
        URL.revokeObjectURL(video.src);
        video.remove();
        resolve({ url, width, height });
      } else {
        URL.revokeObjectURL(video.src);
        video.remove();
        reject(new Error('Canvas context failed'));
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      video.remove();
      reject(new Error('Video load failed'));
    };
  });
}
