import { create } from "zustand";
import Core from "@core";
import type { ModItem } from "../features/home/types";
import { SoundEffects } from "../utils/sound";

export interface FavoriteModItem {
  id: number | string;
  name: string;
  description?: string;
  htmlBody?: string;
  img?: string;
  icon?: string;
  author?: string;
  authors?: string[];
  credits?: any[];
  engineId?: string;
  files?: any[];
  previewMedia?: string[];
  addedAt: number;
}

interface FavoritesState {
  favorites: Record<string, FavoriteModItem>;
  isFavorite: (modId: number | string) => boolean;
  toggleFavorite: (mod: ModItem | any) => boolean;
  addFavorite: (mod: ModItem | any) => void;
  removeFavorite: (modId: number | string) => void;
  getFavoriteList: () => FavoriteModItem[];
}

function loadSavedFavorites(): Record<string, FavoriteModItem> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem("wb_favorite_mods");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Could not load favorite mods from storage:", e);
  }
  return {};
}

function saveFavorites(favorites: Record<string, FavoriteModItem>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("wb_favorite_mods", JSON.stringify(favorites));
  } catch (e) {
    console.warn("Could not persist favorite mods:", e);
  }
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  favorites: loadSavedFavorites(),

  isFavorite: (modId: number | string) => {
    return Boolean(get().favorites[String(modId)]);
  },

  toggleFavorite: (mod: ModItem | any) => {
    const id = String(mod.id);
    const exists = Boolean(get().favorites[id]);
    if (exists) {
      get().removeFavorite(id);
      return false;
    } else {
      get().addFavorite(mod);
      return true;
    }
  },

  addFavorite: (mod: ModItem | any) => {
    const id = String(mod.id);
    const item: FavoriteModItem = {
      id: mod.id,
      name: mod.name || mod.title || "Mod",
      description: mod.description || "",
      htmlBody: mod.htmlBody,
      img: mod.img || mod.thumbnail || "",
      icon: mod.icon || mod.engineIcon,
      author: mod.author || "Unknown",
      authors: mod.authors,
      credits: mod.credits,
      engineId: mod.engineId,
      files: mod.files || [],
      previewMedia: mod.previewMedia || [],
      addedAt: Date.now(),
    };

    const nextFavorites = { ...get().favorites, [id]: item };
    set({ favorites: nextFavorites });
    SoundEffects.playFavoriteAdd();
    saveFavorites(nextFavorites);

    Core.platform.isModInstalled(id).then((installed) => {
      if (installed && Core.platform.setModFavorite) {
        Core.platform.setModFavorite(id, true);
      }
    }).catch(() => {});
  },

  removeFavorite: (modId: number | string) => {
    const id = String(modId);
    const nextFavorites = { ...get().favorites };
    delete nextFavorites[id];
    set({ favorites: nextFavorites });
    SoundEffects.playFavoriteRemove();
    saveFavorites(nextFavorites);

    Core.platform.isModInstalled(id).then((installed) => {
      if (installed && Core.platform.setModFavorite) {
        Core.platform.setModFavorite(id, false);
      }
    }).catch(() => {});
  },

  getFavoriteList: () => {
    return Object.values(get().favorites).sort((a, b) => b.addedAt - a.addedAt);
  },
}));
