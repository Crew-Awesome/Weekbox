import { useEffect, useState } from "react";
import Core from "@core";
import type { GameBananaMod } from "@core";
import Utils from "@utils";
import { useHomeStore } from "../../../../store/home-store";

/**
 * @description Hook to fetch and manage the state of Featured Mods (Community Picks).
 * Extracts unique categories/labels for rendering carousel indicators.
 * @returns {object} Object containing the fetched array of mods and their unique categories.
 */
export function useFeaturedMods(
  searchQuery: string = "",
  engineIds: string[] = ["all"],
) {
  const featuredPool = useHomeStore((state) => state.featuredPool);
  const [featuredMods, setFeaturedMods] = useState<GameBananaMod[]>(featuredPool);
  const [retryTrigger, setRetryTrigger] = useState(0);

  useEffect(() => {
    if (!searchQuery.trim() && featuredPool.length > 0) {
      setFeaturedMods(featuredPool);
    }
  }, [featuredPool, searchQuery]);

  Utils.hooks.useNetworkRecovery(() => {
    if (featuredMods.length === 0 && featuredPool.length === 0) {
      setRetryTrigger((prev) => prev + 1);
    }
  });

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        if (searchQuery.trim().length > 0) {
          const mods = await Core.services.gamebanana.getMods(
            "popular",
            1,
            4,
            engineIds,
            searchQuery,
          );
          setFeaturedMods(mods);
        } else {
          if (featuredPool.length > 0) {
            setFeaturedMods(featuredPool);
            return;
          }
          const mods = await Core.services.gamebanana.getFeaturedMods();
          setFeaturedMods(mods);
          if (mods && mods.length > 0) {
            useHomeStore.getState().setFeaturedPool(
              mods.map((m) => ({
                ...m,
                __isCommunityPick: true,
                __featuredLabel: m.__featuredLabel || "Featured",
              })) as any
            );
          }
        }
      } catch (e) {
        console.error("Failed to load featured mods", e);
      }
    };
    fetchFeatured();
  }, [retryTrigger, searchQuery, engineIds, featuredPool.length]);

  const categories = Array.from(
    new Set(featuredMods.map((m) => m.__featuredLabel).filter(Boolean)),
  ) as string[];

  return {
    featuredMods,
    categories,
  };
}
