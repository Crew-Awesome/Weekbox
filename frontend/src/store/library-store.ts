import { create } from "zustand";
import type { IModService, InstalledMod } from "@contracts";
import { container } from "../core/container";

export interface LibraryState {
  installedMods: InstalledMod[];
  isLoading: boolean;
  isInitialized: boolean;
  loadInstalledMods: (force?: boolean) => Promise<void>;
  setInstalledMods: (
    modsOrUpdater: InstalledMod[] | ((prev: InstalledMod[]) => InstalledMod[])
  ) => void;
}

export interface LibraryStoreDependencies {
  mods: IModService;
}

/**
 * Creates an instance of the Library Store with injected dependencies (DIP / ISP).
 */
export function createLibraryStore(customDeps?: Partial<LibraryStoreDependencies>) {
  const deps: LibraryStoreDependencies = {
    mods: customDeps?.mods || container.mods,
  };

  return create<LibraryState>((set, get) => ({
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
          const mods = await deps.mods.getInstalledMods();
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
        const mods = await deps.mods.getInstalledMods();
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
}

/**
 * Global default library store.
 */
export const useLibraryStore = createLibraryStore();
