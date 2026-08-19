import { create } from "zustand";
import type { ModItem } from "../features/home/types";

interface AppState {
  // Store the active mod ID we want to fetch
  activeDeepLinkModId: number | null;
  setActiveDeepLinkModId: (id: number | null) => void;

  // Store the actual loaded mod to show in the ModDetailsModal
  activeModItem: ModItem | null;
  setActiveModItem: (mod: ModItem | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeDeepLinkModId: null,
  setActiveDeepLinkModId: (id) => set({ activeDeepLinkModId: id }),
  
  activeModItem: null,
  setActiveModItem: (mod) => set({ activeModItem: mod }),
}));
