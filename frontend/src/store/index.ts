import { create } from "zustand";
import type { ModItem } from "@contracts";

interface AppState {
  activeDeepLinkModId: number | null;
  setActiveDeepLinkModId: (id: number | null) => void;

  activeModItem: ModItem | null;
  setActiveModItem: (mod: ModItem | null) => void;

  notFoundModId: number | string | null;
  setNotFoundModId: (id: number | string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeDeepLinkModId: null,
  setActiveDeepLinkModId: (id) => set({ activeDeepLinkModId: id }),

  activeModItem: null,
  setActiveModItem: (mod) => set({ activeModItem: mod }),

  notFoundModId: null,
  setNotFoundModId: (id) => set({ notFoundModId: id }),
}));

export * from "./download";
export * from "./download-store";
export * from "./download-constants";
export * from "./library-store";
export * from "./favorites-store";
export * from "./engine-download";
export * from "./engine-download-store";
export * from "./process-store";
export * from "./settings-store";
export * from "./storage-migration-store";
