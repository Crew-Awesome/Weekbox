import { useEffect, useState } from "react";
import Core from "@core";
import type { GameBananaMod } from "@core";
import Utils from "@utils";

/**
 * @description Hook to fetch and manage the state of Featured Mods (Community Picks).
 * Extracts unique categories/labels for rendering carousel indicators.
 * @returns {object} Object containing the fetched array of mods and their unique categories.
 */
export function useFeaturedMods(
  searchQuery: string = "",
  engineIds: string[] = ["all"],
) {
  const [featuredMods, setFeaturedMods] = useState<GameBananaMod[]>([]);
  const [retryTrigger, setRetryTrigger] = useState(0);

  // Auto-reload logic if connection is restored and we have no content
  Utils.hooks.useNetworkRecovery(() => {
    if (featuredMods.length === 0) {
      setRetryTrigger((prev) => prev + 1);
    }
  });

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        if (searchQuery.trim().length > 0) {
          // Fetch top 4 results for the carousel
          const mods = await Core.services.gamebanana.getMods(
            "popular",
            1,
            4,
            engineIds,
            searchQuery,
          );
          setFeaturedMods(mods);
        } else {
          const mods = await Core.services.gamebanana.getFeaturedMods();
          setFeaturedMods(mods);
        }
      } catch (e) {
        console.error("Failed to load featured mods", e);
      }
    };
    fetchFeatured();
  }, [retryTrigger, searchQuery, engineIds]);

  const categories = Array.from(
    new Set(featuredMods.map((m) => m.__featuredLabel).filter(Boolean)),
  ) as string[];

  return {
    featuredMods,
    categories,
  };
}
