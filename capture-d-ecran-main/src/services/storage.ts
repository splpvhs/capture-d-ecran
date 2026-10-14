import { MediaCaptureItem } from '../types';

const DB_NAME = 'screendroid_db';
const DB_VERSION = 2;
const STORE_MEDIA = 'media_items';
const STORE_HANDLES = 'file_handles';

interface FileHandleStoreItem {
  id: string;
  handle: FileSystemDirectoryHandle;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_MEDIA)) {
        const store = db.createObjectStore(STORE_MEDIA, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('type', 'type', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_HANDLES)) {
        db.createObjectStore(STORE_HANDLES, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save a media item into IndexedDB
 */
export async function saveMediaItem(item: MediaCaptureItem): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_MEDIA, 'readwrite');
    const store = tx.objectStore(STORE_MEDIA);
    const req = store.put(item);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Retrieve all media items, sorted newest first
 */
export async function getAllMediaItems(): Promise<MediaCaptureItem[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_MEDIA, 'readonly');
    const store = tx.objectStore(STORE_MEDIA);
    const req = store.getAll();
    req.onsuccess = () => {
      const items: MediaCaptureItem[] = req.result || [];
      items.sort((a, b) => b.createdAt - a.createdAt);
      resolve(items);
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Delete a media item by ID
 */
export async function deleteMediaItem(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_MEDIA, 'readwrite');
    const store = tx.objectStore(STORE_MEDIA);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Clear all media items
 */
export async function clearAllMedia(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_MEDIA, 'readwrite');
    const store = tx.objectStore(STORE_MEDIA);
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Directory handle storage for modern File System Access API
 */
export async function storeDirectoryHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_HANDLES, 'readwrite');
    const store = tx.objectStore(STORE_HANDLES);
    const req = store.put({ id: 'destination_folder', handle });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getStoredDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_HANDLES, 'readonly');
      const store = tx.objectStore(STORE_HANDLES);
      const req = store.get('destination_folder');
      req.onsuccess = () => {
        const result = req.result as FileHandleStoreItem | undefined;
        resolve(result ? result.handle : null);
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Save blob directly to the user's selected file system folder
 */
export async function saveBlobToDirectory(
  dirHandle: FileSystemDirectoryHandle,
  filename: string,
  blob: Blob
): Promise<boolean> {
  try {
    // @ts-expect-error queryPermission is on FileSystemHandle
    if (dirHandle.queryPermission && (await dirHandle.queryPermission({ mode: 'readwrite' })) !== 'granted') {
      // @ts-expect-error requestPermission is on FileSystemHandle
      if ((await dirHandle.requestPermission({ mode: 'readwrite' })) !== 'granted') {
        return false;
      }
    }

    const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();
    return true;
  } catch (err) {
    console.warn('Failed to save to directory handle:', err);
    return false;
  }
}

/**
 * Trigger robust browser download or Android system save
 */
export async function downloadOrShareMediaItem(
  blob: Blob,
  filename: string,
  forceDownload: boolean = false
): Promise<void> {
  const isMobile = /android|iphone|ipad|ipod/i.test(navigator.userAgent);

  // If on mobile and user didn't force file download, try Android native Web Share API
  if (isMobile && !forceDownload && typeof navigator.share === 'function') {
    try {
      const file = new File([blob], filename, { type: blob.type || 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: filename,
        });
        return;
      }
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
      console.warn('Web Share failed, fallback to direct download:', e);
    }
  }

  // Direct download fallback
  triggerBrowserDownload(blob, filename);
}

/**
 * Trigger direct download with fallbacks for Android and iframes
 */
export function triggerBrowserDownload(blob: Blob, filename: string): void {
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
      try {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch {
        // ignore
      }
    }, 4000);
  } catch (err) {
    console.warn('Download dispatch error:', err);
    // Convert to reader fallback
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => document.body.removeChild(a), 2000);
    };
    reader.readAsDataURL(blob);
  }
}
