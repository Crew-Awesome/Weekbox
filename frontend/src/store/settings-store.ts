import { create } from "zustand";
import Core from "@core";

export interface SettingsState {
  modsPath: string;
  enginesPath: string;
  defaultModsPath: string;
  defaultEnginesPath: string;
  preventCloseOnActive: boolean;
  confirmWarnings: boolean;
  autoCheckUpdates: boolean;
  dismissedWarnings: Record<string, boolean>;
  isLoaded: boolean;

  loadSettings: () => Promise<void>;
  updateSetting: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => Promise<void>;
  dismissWarning: (warningId: string) => Promise<void>;
  resetDismissedWarnings: () => Promise<void>;
  isWarningDismissed: (warningId: string) => boolean;
}

const SETTINGS_STORAGE_KEY = "wb_app_settings";

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

export const useSettingsStore = create<SettingsState>((set, get) => ({
  modsPath: "",
  enginesPath: "",
  defaultModsPath: "",
  defaultEnginesPath: "",
  preventCloseOnActive: true,
  confirmWarnings: true,
  autoCheckUpdates: true,
  dismissedWarnings: {},
  isLoaded: false,

  loadSettings: async () => {
    try {
      const defaults = (await Core.services.storage.getDefaultPaths?.()) || {
        basePath: "",
        defaultModsPath: "",
        defaultEnginesPath: "",
      };

      const localSettings = readLocalSettings();
      const platformSettings = (await Core.services.settings.getSettings?.()) || {};

      // Merge: defaults -> local storage -> platform settings (settings.json overrides on desktop)
      const merged = {
        ...localSettings,
        ...platformSettings,
      };

      // Keep both local storage and platform in sync with merged state
      writeLocalSettings(merged);
      if (Core.services.settings.saveSettings) {
        await Core.services.settings.saveSettings(merged).catch(() => {});
      }

      set({
        modsPath: merged.modsPath || defaults.defaultModsPath,
        enginesPath: merged.enginesPath || defaults.defaultEnginesPath,
        defaultModsPath: defaults.defaultModsPath,
        defaultEnginesPath: defaults.defaultEnginesPath,
        preventCloseOnActive: merged.preventCloseOnActive !== false,
        confirmWarnings: merged.confirmWarnings !== false,
        autoCheckUpdates: merged.autoCheckUpdates !== false,
        dismissedWarnings: merged.dismissedWarnings || {},
        isLoaded: true,
      });
    } catch {
      set({ isLoaded: true });
    }
  },

  updateSetting: async (key, value) => {
    set((state) => ({ ...state, [key]: value }));
    try {
      const local = readLocalSettings();
      const platformSettings = (await Core.services.settings.getSettings?.()) || {};
      const updated = {
        ...local,
        ...platformSettings,
        [key]: value,
      };

      writeLocalSettings(updated);
      await Core.services.settings.saveSettings?.(updated);
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
      const platformSettings = (await Core.services.settings.getSettings?.()) || {};
      const updated = {
        ...local,
        ...platformSettings,
        dismissedWarnings: updatedWarnings,
      };

      writeLocalSettings(updated);
      await Core.services.settings.saveSettings?.(updated);
    } catch {}
  },

  resetDismissedWarnings: async () => {
    set({ dismissedWarnings: {} });
    try {
      const local = readLocalSettings();
      const platformSettings = (await Core.services.settings.getSettings?.()) || {};
      const updated = {
        ...local,
        ...platformSettings,
        dismissedWarnings: {},
      };

      writeLocalSettings(updated);
      await Core.services.settings.saveSettings?.(updated);
    } catch {}
  },

  isWarningDismissed: (warningId: string) => {
    const state = get();
    if (!state.confirmWarnings) return true;
    return Boolean(state.dismissedWarnings[warningId]);
  },
}));

/* Initialize settings eagerly on load */
if (typeof window !== "undefined") {
  useSettingsStore.getState().loadSettings().catch(() => {});
}
