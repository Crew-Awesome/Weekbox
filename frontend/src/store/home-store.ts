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

  loadedParamsKey: string | null;
  setLoadedParamsKey: (key: string | null) => void;

  resetState: () => void;
}

const HOME_SORT_STORAGE_KEY = "wb_home_sort";
const HOME_CATEGORIES_STORAGE_KEY = "wb_home_categories";

function loadSavedHomeSort(): string {
  if (typeof window === "undefined") return "popular";
  try {
    const raw = localStorage.getItem(HOME_SORT_STORAGE_KEY);
    if (raw && ["popular", "new", "ripe", "updated"].includes(raw)) {
      return raw;
    }
  } catch (e) {
    console.warn("Could not load home sort from storage:", e);
  }
  return "popular";
}

function loadSavedHomeCategories(): string[] {
  if (typeof window === "undefined") return ["all"];
  try {
    const raw = localStorage.getItem(HOME_CATEGORIES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Could not load home categories from storage:", e);
  }
  return ["all"];
}

export const useHomeStore = create<HomeState>((set) => ({
  searchQuery: "",
  setSearchQuery: (query) => set({ searchQuery: query }),

  sortFilter: loadSavedHomeSort(),
  setSortFilter: (val) => {
    try {
      localStorage.setItem(HOME_SORT_STORAGE_KEY, val);
    } catch {}
    set({ sortFilter: val });
  },

  categoryFilter: loadSavedHomeCategories(),
  setCategoryFilter: (val) => {
    try {
      localStorage.setItem(HOME_CATEGORIES_STORAGE_KEY, JSON.stringify(val));
    } catch {}
    set({ categoryFilter: val });
  },

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

  loadedParamsKey: null,
  setLoadedParamsKey: (key) => set({ loadedParamsKey: key }),

  resetState: () =>
    set({
      searchQuery: "",
      mods: [],
      page: 1,
      hasMore: true,
      scrollPosition: 0,
      loadedParamsKey: null,
    }),
}));
