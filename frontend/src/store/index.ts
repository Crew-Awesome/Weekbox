import { create } from "zustand";
import type { ModItem } from "../features/home/types";

interface AppState {
  activeDeepLinkModId: number | null;
  setActiveDeepLinkModId: (id: number | null) => void;

  activeModItem: ModItem | null;
  setActiveModItem: (mod: ModItem | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeDeepLinkModId: null,
  setActiveDeepLinkModId: (id) => set({ activeDeepLinkModId: id }),

  activeModItem: null,
  setActiveModItem: (mod) => set({ activeModItem: mod }),
}));

export * from "./download-store";
export * from "./download-constants";
