import { useState, useEffect, useCallback } from "react";
import Core from "@core";
import { toast } from "../toast";

const OS_NOTIFY_KEY = "wb_os_notify_download";
const TOAST_NOTIFY_KEY = "wb_toast_notify_download";
const SOUND_EFFECTS_KEY = "wb_sound_effects";

type NotificationSettingListener = () => void;
const listeners = new Set<NotificationSettingListener>();

function notifyListeners() {
  listeners.forEach((fn) => fn());
}

function getStoredBoolean(key: string, defaultValue: boolean): boolean {
  if (typeof window === "undefined") return defaultValue;
  try {
    const item = localStorage.getItem(key);
    if (item === null) return defaultValue;
    return item === "true";
  } catch {
    return defaultValue;
  }
}

function setStoredBoolean(key: string, value: boolean) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, String(value));
  } catch {}
}

/**
 * Checks whether the application window is currently unfocused, blurred, or minimized.
 * Standardized across Chromium / Webview2 / WebKit runtimes.
 */
export function isWindowUnfocused(): boolean {
  if (typeof document === "undefined") return false;
  const hasFocus = typeof document.hasFocus === "function" ? document.hasFocus() : true;
  const isHidden = document.hidden || document.visibilityState === "hidden";
  return !hasFocus || isHidden;
}

/**
 * @description Hook to manage system notifications, in-app alerts, and window-focus checks.
 */
export function useNotifications() {
  const [osNotifyOnDownload, setOsNotifyState] = useState<boolean>(() =>
    getStoredBoolean(OS_NOTIFY_KEY, true)
  );
  const [toastNotifyOnDownload, setToastNotifyState] = useState<boolean>(() =>
    getStoredBoolean(TOAST_NOTIFY_KEY, true)
  );
  const [soundEffects, setSoundEffectsState] = useState<boolean>(() =>
    getStoredBoolean(SOUND_EFFECTS_KEY, true)
  );

  useEffect(() => {
    const handleSync = () => {
      setOsNotifyState(getStoredBoolean(OS_NOTIFY_KEY, true));
      setToastNotifyState(getStoredBoolean(TOAST_NOTIFY_KEY, true));
      setSoundEffectsState(getStoredBoolean(SOUND_EFFECTS_KEY, true));
    };

    listeners.add(handleSync);
    return () => {
      listeners.delete(handleSync);
    };
  }, []);

  const setOsNotifyOnDownload = useCallback((value: boolean) => {
    setStoredBoolean(OS_NOTIFY_KEY, value);
    setOsNotifyState(value);
    notifyListeners();
  }, []);

  const setToastNotifyOnDownload = useCallback((value: boolean) => {
    setStoredBoolean(TOAST_NOTIFY_KEY, value);
    setToastNotifyState(value);
    notifyListeners();
  }, []);

  const setSoundEffects = useCallback((value: boolean) => {
    setStoredBoolean(SOUND_EFFECTS_KEY, value);
    setSoundEffectsState(value);
    notifyListeners();
  }, []);

  /**
   * Directly sends a native OS notification via the Node ESM backend module.
   */
  const sendOSNotification = useCallback(
    async (title: string, content: string, icon: "INFO" | "WARNING" | "ERROR" = "INFO") => {
      return await Core.notification.showNotification({
        title,
        content,
        icon,
      });
    },
    []
  );

  /**
   * Called when a mod download completes.
   * If the user is outside or the window is unfocused, dispatches an OS notification (Windows, macOS, Linux).
   * Also triggers in-app toast if configured.
   */
  const notifyDownloadComplete = useCallback(
    async (modName: string) => {
      if (osNotifyOnDownload) {
        try {
          await Core.notification.showNotification({
            title: "WeekBox - Download Complete",
            content: `"${modName}" has been successfully downloaded and installed.`,
            icon: "INFO",
          });
        } catch (err) {
          console.warn("[useNotifications] Failed to send OS notification:", err);
        }
      }

      if (toastNotifyOnDownload) {
        toast.success(`"${modName}" downloaded successfully!`, {
          title: "Mod Installed",
        });
      }
    },
    [osNotifyOnDownload, toastNotifyOnDownload]
  );

  return {
    osNotifyOnDownload,
    setOsNotifyOnDownload,
    toastNotifyOnDownload,
    setToastNotifyOnDownload,
    soundEffects,
    setSoundEffects,
    isWindowUnfocused,
    sendOSNotification,
    notifyDownloadComplete,
  };
}

if (typeof window !== "undefined") {
  (window as unknown as {
    sendOSNotification: (title?: string, content?: string) => Promise<any>;
    isWindowUnfocused: () => boolean;
  }).sendOSNotification = async (title = "WeekBox", content = "Notificación de prueba del sistema") => {
    return await Core.notification.showNotification({ title, content, icon: "INFO" });
  };
  (window as unknown as {
    isWindowUnfocused: () => boolean;
  }).isWindowUnfocused = isWindowUnfocused;
}

export default useNotifications;
