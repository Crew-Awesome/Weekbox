import { create } from "zustand";
import Core from "@core";

interface LibraryState {
  installedMods: any[];
  isLoading: boolean;
  isInitialized: boolean;
  loadInstalledMods: (force?: boolean) => Promise<void>;
  setInstalledMods: (modsOrUpdater: any[] | ((prev: any[]) => any[])) => void;
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  installedMods: [],
  isLoading: true,
  isInitialized: false,

  setInstalledMods: (modsOrUpdater) => {
    if (typeof modsOrUpdater === "function") {
      set({ installedMods: modsOrUpdater(get().installedMods) });
    } else {
      set({ installedMods: modsOrUpdater });
    }
  },

  loadInstalledMods: async (force: boolean = false) => {
    if (get().isInitialized && !force) {
      try {
        const mods = await Core.services.mods.getInstalledMods();
        const sorted = Array.isArray(mods)
          ? [...mods].sort(
              (a, b) => (Number(b.installedAt) || 0) - (Number(a.installedAt) || 0)
            )
          : [];
        set({ installedMods: sorted });
      } catch (e) {
        console.warn("Could not refresh installed mods silently:", e);
      }
      return;
    }

    try {
      if (!get().isInitialized) {
        set({ isLoading: true });
      }
      const mods = await Core.services.mods.getInstalledMods();
      const sorted = Array.isArray(mods)
        ? [...mods].sort(
            (a, b) => (Number(b.installedAt) || 0) - (Number(a.installedAt) || 0)
          )
        : [];
      set({ installedMods: sorted, isInitialized: true });
    } catch (e) {
      console.warn("Could not load installed mods:", e);
      set({ installedMods: [], isInitialized: true });
    } finally {
      set({ isLoading: false });
    }
  },
}));
