import Core from "@core";
import { useAppStore } from "../store";
import { toast } from "./toast";
import type { ModItem } from "../features/home/types";

/**
 * @description Extracts a numeric mod ID if the input string is a pure numeric ID
 * or a valid GameBanana mod URL. Returns null if the input is a standard search query.
 * @param {string} input - The raw search input text.
 * @returns {number | null} Extracted mod ID or null.
 */
export function extractModIdOrUrl(input: string): number | null {
  if (!input) return null;
  const trimmed = input.trim();

  if (/^\d+$/.test(trimmed)) {
    const id = parseInt(trimmed, 10);
    return !isNaN(id) && id > 0 ? id : null;
  }

  const urlMatch = trimmed.match(
    /(?:gamebanana\.com|gb\.gg)\/mods\/(?:[a-zA-Z0-9_-]+\/)?(\d+)/i
  );
  if (urlMatch && urlMatch[1]) {
    const id = parseInt(urlMatch[1], 10);
    return !isNaN(id) && id > 0 ? id : null;
  }

  return null;
}

/**
 * @description Performs a direct lookup for a mod on GameBanana by its numeric ID.
 * If found, sets activeModItem in the app store to open the ModDetailsModal.
 * If not found, notifies the user via an error toast.
 * @param {number} id - The mod ID to lookup.
 * @returns {Promise<boolean>} True if the mod was successfully found and loaded.
 */
export async function handleDirectModLookup(id: number): Promise<boolean> {
  try {
    const mod = await Core.services.gamebanana.getModById(id);
    if (!mod) {
      toast.error(`Could not find any mod matching ID: ${id}`, {
        title: "Mod Not Found",
      });
      return false;
    }

    const modItem: ModItem = {
      id: mod.id,
      name: mod.title,
      description: mod.description,
      htmlBody: mod.htmlBody,
      img: mod.thumbnail || "",
      icon: mod.engineIcon,
      showIcon: Boolean(mod.engineIcon),
      previewMedia: mod.previewMedia,
      files: mod.files,
      author: mod.author,
      authors: mod.authors,
      credits: mod.credits,
      submittedAt: mod.submittedAt,
      updatedAt: mod.updatedAt,
      engineId: mod.engineId,
      version: mod.version,
      updatesCount: mod.updatesCount,
      updates: mod.updates,
      externalLinks: mod.externalLinks,
      studio: mod.studio,
      categoryName: mod.categoryName,
      views: mod.views,
      likes: mod.likes,
      downloads: mod.downloads,
    };

    useAppStore.getState().setActiveModItem(modItem);
    return true;
  } catch (error) {
    console.warn(`Direct mod lookup failed for ID ${id}:`, error);
    toast.error(`Could not find any mod matching ID: ${id}`, {
      title: "Mod Not Found",
    });
    return false;
  }
}
