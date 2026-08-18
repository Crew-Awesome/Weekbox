import { useEffect, useState } from "react";
import Core from "@core";
import type { GameBananaMod } from "@core";

/**
 * @description Hook to fetch and manage the state of Featured Mods (Community Picks).
 * Extracts unique categories/labels for rendering carousel indicators.
 * @returns {object} Object containing the fetched array of mods and their unique categories.
 */
export function useFeaturedMods() {
  const [featuredMods, setFeaturedMods] = useState<GameBananaMod[]>([]);

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const mods = await Core.services.gamebanana.getFeaturedMods();
        setFeaturedMods(mods);
      } catch (e) {
        console.error("Failed to load featured mods", e);
      }
    };
    fetchFeatured();
  }, []);

  const categories = Array.from(
    new Set(featuredMods.map((m) => m.__featuredLabel).filter(Boolean)),
  ) as string[];

  return {
    featuredMods,
    categories,
  };
}
