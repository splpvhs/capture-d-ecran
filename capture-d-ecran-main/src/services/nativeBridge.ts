import { Capacitor } from '@capacitor/core';

// Interface for ScreenDroidNativePlugin
interface ScreenDroidNativePluginInterface {
  isOverlayPermissionGranted(): Promise<{ granted: boolean }>;
  requestOverlayPermission(): Promise<void>;
  requestScreenCapturePermission(): Promise<{ success: boolean; error?: string }>;
  startFloatingOverlay(): Promise<{ success: boolean; needsOverlayPermission?: boolean }>;
  stopFloatingOverlay(): Promise<{ success: boolean }>;
  isOverlayRunning(): Promise<{ running: boolean }>;
}

const getNativePlugin = (): ScreenDroidNativePluginInterface | null => {
  if (Capacitor.isNativePlatform()) {
    // @ts-expect-error Capacitor plugins dynamic access
    return (Capacitor.Plugins.ScreenDroidNative as ScreenDroidNativePluginInterface) || null;
  }
  return null;
};

export const isNativeAndroidApp = (): boolean => {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
};

export const checkAndRequestNativePermissions = async (): Promise<boolean> => {
  const plugin = getNativePlugin();
  if (!plugin) return false;

  try {
    const { granted } = await plugin.isOverlayPermissionGranted();
    if (!granted) {
      await plugin.requestOverlayPermission();
      return false;
    }
    const res = await plugin.requestScreenCapturePermission();
    return res.success;
  } catch (e) {
    console.warn('Native permission check error:', e);
    return false;
  }
};

export const toggleNativeFloatingWidget = async (enable: boolean): Promise<boolean> => {
  const plugin = getNativePlugin();
  if (!plugin) return false;

  try {
    if (enable) {
      const res = await plugin.startFloatingOverlay();
      return res.success;
    } else {
      const res = await plugin.stopFloatingOverlay();
      return res.success;
    }
  } catch (e) {
    console.warn('Toggle native widget error:', e);
    return false;
  }
};

export const isNativeWidgetRunning = async (): Promise<boolean> => {
  const plugin = getNativePlugin();
  if (!plugin) return false;
  try {
    const res = await plugin.isOverlayRunning();
    return res.running;
  } catch {
    return false;
  }
};
