import { create } from "zustand";
import type { IStorageService, ISettingsService } from "@contracts";
import { container } from "../core/container";

export interface SettingsState {
  modsPath: string;
  enginesPath: string;
  defaultModsPath: string;
  defaultEnginesPath: string;
  preventCloseOnActive: boolean;
  confirmWarnings: boolean;
  autoCheckUpdates: boolean;
  dismissedWarnings: Record<string, boolean>;
  uiScale: number;
  isLoaded: boolean;

  loadSettings: () => Promise<void>;
  updateSetting: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => Promise<void>;
  dismissWarning: (warningId: string) => Promise<void>;
  resetDismissedWarnings: () => Promise<void>;
  isWarningDismissed: (warningId: string) => boolean;
}

export interface SettingsStoreDependencies {
  storage: IStorageService;
  settings: ISettingsService;
}

const SETTINGS_STORAGE_KEY = "wb_app_settings";

/**
 * Detects whether the current runtime is a mobile platform or device.
 */
export function isMobileDeviceOrPlatform(): boolean {
  if (typeof window === "undefined") return false;

  const isCapacitor = Boolean(
    (window as any).Capacitor?.isNativePlatform?.() ||
      ((window as any).Capacitor?.getPlatform &&
        ["android", "ios"].includes((window as any).Capacitor.getPlatform()))
  );
  if (isCapacitor) return true;

  if (typeof navigator !== "undefined" && navigator.userAgent) {
    return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  }
  return false;
}

/**
 * Applies the UI scale percentage to document.documentElement.style.fontSize.
 * Only applied on PC (desktop / web on PC). On mobile, fontSize is cleared/reset.
 * Also explicitly resets any inline document zoom to prevent viewport clipping.
 */
export function applyUiScale(scale: number): void {
  if (typeof document === "undefined") return;

  // Clear any existing zoom style so the viewport canvas never shrinks or bugs out
  document.documentElement.style.zoom = "";

  if (isMobileDeviceOrPlatform()) {
    document.documentElement.style.fontSize = "";
    return;
  }

  const validScale = typeof scale === "number" && !isNaN(scale) ? scale : 100;
  const clamped = Math.min(Math.max(validScale, 70), 150);

  if (clamped === 100) {
    document.documentElement.style.fontSize = "";
  } else {
    document.documentElement.style.fontSize = `${clamped}%`;
  }
}

function readLocalSettings(): Record<string, any> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeLocalSettings(settings: Record<string, any>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {}
}

const initialLocalSettings = readLocalSettings();
const initialUiScale =
  typeof initialLocalSettings.uiScale === "number" && !isNaN(initialLocalSettings.uiScale)
    ? initialLocalSettings.uiScale
    : 100;

if (typeof document !== "undefined") {
  applyUiScale(initialUiScale);
}

/**
 * Creates an instance of the Settings Store with injected dependencies (DIP / ISP).
 */
export function createSettingsStore(customDeps?: Partial<SettingsStoreDependencies>) {
  const deps: SettingsStoreDependencies = {
    storage: customDeps?.storage || container.storage,
    settings: customDeps?.settings || container.settings,
  };

  return create<SettingsState>((set, get) => ({
    modsPath: "",
    enginesPath: "",
    defaultModsPath: "",
    defaultEnginesPath: "",
    preventCloseOnActive: true,
    confirmWarnings: true,
    autoCheckUpdates: true,
    dismissedWarnings: {},
    uiScale: initialUiScale,
    isLoaded: false,

    loadSettings: async () => {
      try {
        const defaults = (await deps.storage.getDefaultPaths?.()) || {
          basePath: "",
          defaultModsPath: "",
          defaultEnginesPath: "",
        };

        const localSettings = readLocalSettings();
        const platformSettings = (await deps.settings.getSettings?.()) || {};

        // Merge: defaults -> local storage -> platform settings (settings.json overrides on desktop)
        const merged = {
          ...localSettings,
          ...platformSettings,
        };

        const isWindows =
          typeof window !== "undefined" &&
          (window.NL_OS === "Windows" || navigator.userAgent.includes("Windows"));

        let finalModsPath = merged.modsPath;
        let finalEnginesPath = merged.enginesPath;

        if (!isWindows) {
          if (finalModsPath && finalModsPath.includes("%APPDATA%")) {
            finalModsPath = "";
          }
          if (finalEnginesPath && finalEnginesPath.includes("%APPDATA%")) {
            finalEnginesPath = "";
          }
        }

        const resolvedMods = finalModsPath || defaults.defaultModsPath;
        const resolvedEngines = finalEnginesPath || defaults.defaultEnginesPath;
        const resolvedUiScale =
          typeof merged.uiScale === "number" && !isNaN(merged.uiScale)
            ? merged.uiScale
            : 100;

        applyUiScale(resolvedUiScale);

        // Keep both local storage and platform in sync with merged state
        const sanitizedMerged = {
          ...merged,
          modsPath: resolvedMods,
          enginesPath: resolvedEngines,
          uiScale: resolvedUiScale,
        };

        writeLocalSettings(sanitizedMerged);
        if (deps.settings.saveSettings) {
          await deps.settings.saveSettings(sanitizedMerged).catch(() => {});
        }

        set({
          modsPath: resolvedMods,
          enginesPath: resolvedEngines,
          defaultModsPath: defaults.defaultModsPath,
          defaultEnginesPath: defaults.defaultEnginesPath,
          preventCloseOnActive: merged.preventCloseOnActive !== false,
          confirmWarnings: merged.confirmWarnings !== false,
          autoCheckUpdates: merged.autoCheckUpdates !== false,
          dismissedWarnings: merged.dismissedWarnings || {},
          uiScale: resolvedUiScale,
          isLoaded: true,
        });
      } catch {
        set({ isLoaded: true });
      }
    },

    updateSetting: async (key, value) => {
      set((state) => ({ ...state, [key]: value }));
      if (key === "uiScale") {
        applyUiScale(value as number);
      }
      try {
        const local = readLocalSettings();
        const platformSettings = (await deps.settings.getSettings?.()) || {};
        const updated = {
          ...local,
          ...platformSettings,
          [key]: value,
        };

        writeLocalSettings(updated);
        await deps.settings.saveSettings?.(updated);
      } catch {}
    },

    dismissWarning: async (warningId: string) => {
      const updatedWarnings = {
        ...get().dismissedWarnings,
        [warningId]: true,
      };
      set({ dismissedWarnings: updatedWarnings });
      try {
        const local = readLocalSettings();
        const platformSettings = (await deps.settings.getSettings?.()) || {};
        const updated = {
          ...local,
          ...platformSettings,
          dismissedWarnings: updatedWarnings,
        };

        writeLocalSettings(updated);
        await deps.settings.saveSettings?.(updated);
      } catch {}
    },

    resetDismissedWarnings: async () => {
      set({ dismissedWarnings: {} });
      try {
        const local = readLocalSettings();
        const platformSettings = (await deps.settings.getSettings?.()) || {};
        const updated = {
          ...local,
          ...platformSettings,
          dismissedWarnings: {},
        };

        writeLocalSettings(updated);
        await deps.settings.saveSettings?.(updated);
      } catch {}
    },

    isWarningDismissed: (warningId: string) => {
      return Boolean(get().dismissedWarnings[warningId]);
    },
  }));
}

/**
 * Global default settings store.
 */
export const useSettingsStore = createSettingsStore();
