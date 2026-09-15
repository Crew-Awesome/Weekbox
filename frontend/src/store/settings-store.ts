import { create } from "zustand";
import Core from "@core";

export interface SettingsState {
  modsPath: string;
  enginesPath: string;
  defaultModsPath: string;
  defaultEnginesPath: string;
  preventCloseOnActive: boolean;
  confirmWarnings: boolean;
  dismissedWarnings: Record<string, boolean>;
  isLoaded: boolean;

  loadSettings: () => Promise<void>;
  updateSetting: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => Promise<void>;
  dismissWarning: (warningId: string) => Promise<void>;
  resetDismissedWarnings: () => Promise<void>;
  isWarningDismissed: (warningId: string) => boolean;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  modsPath: "",
  enginesPath: "",
  defaultModsPath: "",
  defaultEnginesPath: "",
  preventCloseOnActive: true,
  confirmWarnings: true,
  dismissedWarnings: {},
  isLoaded: false,

  loadSettings: async () => {
    try {
      const defaults = (await Core.platform.getDefaultPaths?.()) || {
        basePath: "",
        defaultModsPath: "",
        defaultEnginesPath: "",
      };

      const settings = (await Core.platform.getSettings?.()) || {};

      set({
        modsPath: settings.modsPath || defaults.defaultModsPath,
        enginesPath: settings.enginesPath || defaults.defaultEnginesPath,
        defaultModsPath: defaults.defaultModsPath,
        defaultEnginesPath: defaults.defaultEnginesPath,
        preventCloseOnActive: settings.preventCloseOnActive !== false,
        confirmWarnings: settings.confirmWarnings !== false,
        dismissedWarnings: settings.dismissedWarnings || {},
        isLoaded: true,
      });
    } catch {
      set({ isLoaded: true });
    }
  },

  updateSetting: async (key, value) => {
    set((state) => ({ ...state, [key]: value }));
    try {
      const current = await Core.platform.getSettings?.();
      const updated = {
        ...current,
        [key]: value,
      };
      await Core.platform.saveSettings?.(updated);
    } catch {}
  },

  dismissWarning: async (warningId: string) => {
    const updated = {
      ...get().dismissedWarnings,
      [warningId]: true,
    };
    set({ dismissedWarnings: updated });
    try {
      const current = await Core.platform.getSettings?.();
      await Core.platform.saveSettings?.({
        ...current,
        dismissedWarnings: updated,
      });
    } catch {}
  },

  resetDismissedWarnings: async () => {
    set({ dismissedWarnings: {} });
    try {
      const current = await Core.platform.getSettings?.();
      await Core.platform.saveSettings?.({
        ...current,
        dismissedWarnings: {},
      });
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
