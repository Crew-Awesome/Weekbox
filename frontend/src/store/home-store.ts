import { create } from "zustand";
import type { GameBananaMod } from "@core";

interface HomeState {
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  sortFilter: string;
  setSortFilter: (val: string) => void;

  categoryFilter: string[];
  setCategoryFilter: (val: string[]) => void;

  mods: GameBananaMod[];
  setMods: (
    mods: GameBananaMod[] | ((prev: GameBananaMod[]) => GameBananaMod[]),
  ) => void;

  featuredPool: GameBananaMod[];
  setFeaturedPool: (mods: GameBananaMod[]) => void;

  page: number;
  setPage: (page: number | ((prev: number) => number)) => void;

  hasMore: boolean;
  setHasMore: (hasMore: boolean) => void;

  scrollPosition: number;
  setScrollPosition: (pos: number) => void;

  resetState: () => void;
}

export const useHomeStore = create<HomeState>((set) => ({
  searchQuery: "",
  setSearchQuery: (query) => set({ searchQuery: query }),

  sortFilter: "popular",
  setSortFilter: (val) => set({ sortFilter: val }),

  categoryFilter: ["all"],
  setCategoryFilter: (val) => set({ categoryFilter: val }),

  mods: [],
  setMods: (updater) =>
    set((state) => ({
      mods: typeof updater === "function" ? updater(state.mods) : updater,
    })),

  featuredPool: [],
  setFeaturedPool: (mods) => set({ featuredPool: mods }),

  page: 1,
  setPage: (updater) =>
    set((state) => ({
      page: typeof updater === "function" ? updater(state.page) : updater,
    })),

  hasMore: true,
  setHasMore: (val) => set({ hasMore: val }),

  scrollPosition: 0,
  setScrollPosition: (pos) => set({ scrollPosition: pos }),

  resetState: () =>
    set((state) => ({
      searchQuery: "",
      mods: [],
      page: 1,
      hasMore: true,
      scrollPosition: 0,
      // categoryFilter and sortFilter are left untouched as requested by the user
    })),
}));
