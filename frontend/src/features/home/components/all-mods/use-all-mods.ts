import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import Core from "@core";
import type { GameBananaMod } from "@core";
import Utils from "@utils";

/**
 * @description Custom hook to manage the state, pagination, and layout injection for the AllMods grid.
 * Merges regular Discovery mods with Featured "Community Picks" injected mathematically.
 * @returns {object} State and refs required for the infinite scrolling grid.
 */
export function useAllMods(filter: string = "popular", engineId: string = "all") {
  const [mods, setMods] = useState<GameBananaMod[]>([]);
  const [featuredPool, setFeaturedPool] = useState<GameBananaMod[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Cuando cambian los filtros, reseteamos la paginación y limpiamos la lista
  useEffect(() => {
    setMods([]);
    setPage(1);
    setHasMore(true);
  }, [filter, engineId]);

  const observer = useRef<IntersectionObserver | null>(null);

  const lastElementRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (loading || loadingMore) return;
      if (observer.current) observer.current.disconnect();

      // rootMargin: '600px' triggers the next page load roughly half a screen before reaching the bottom
      observer.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasMore) {
            setPage((prev) => prev + 1);
          }
        },
        { rootMargin: "600px" },
      );

      if (node) observer.current.observe(node);
    },
    [loading, loadingMore, hasMore],
  );

  const [retryTrigger, setRetryTrigger] = useState(0);

  // Auto-reload logic if connection is restored and we have no content
  Utils.hooks.useNetworkRecovery(() => {
    if (mods.length === 0) {
      setRetryTrigger((prev) => prev + 1);
    }
  });

  // Pre-load the pool of Community Picks based on current filters
  useEffect(() => {
    Core.services.gamebanana
      .getMods(filter as any, 1, 60, engineId === "all" ? null : engineId)
      .then((ripeMods) => {
        if (!ripeMods || ripeMods.length === 0) {
          setFeaturedPool([]);
          return;
        }

        const shuffled = [...ripeMods].sort(() => 0.5 - Math.random());
        const pool = shuffled.slice(0, 50).map((mod) => ({
          ...mod,
          __isCommunityPick: true,
          __featuredLabel: "Pick of the Community",
        })) as GameBananaMod[];

        setFeaturedPool(pool);
      })
      .catch(console.error);
  }, [retryTrigger, filter, engineId]);

  useEffect(() => {
    let isMounted = true;

    const fetchMods = async () => {
      try {
        if (page === 1) setLoading(true);
        else setLoadingMore(true);

        const data = await Core.services.gamebanana.getMods(
          filter as any,
          page,
          45,
          engineId === "all" ? null : engineId
        );

        if (isMounted) {
          if (data.length === 0) {
            setHasMore(false);
          } else {
            setMods((prev) => (page === 1 ? data : [...prev, ...data]));
          }
        }
      } catch (error) {
        console.error("Failed to fetch discovery mods:", error);
      } finally {
        if (isMounted) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    };

    fetchMods();

    return () => {
      isMounted = false;
    };
  }, [page, retryTrigger, filter, engineId]);

  // Mathematically inject Community Picks between the rows infinitely
  const combinedMods = useMemo(() => {
    const result = [...mods];
    if (featuredPool.length === 0) return result;

    let injectedCount = 0;
    for (let i = 3; i < result.length; i += 16) {
      const pick = featuredPool[injectedCount % featuredPool.length];
      result.splice(i, 0, pick);
      injectedCount++;
      i++;
    }

    return result;
  }, [mods, featuredPool]);

  return {
    mods: combinedMods,
    loading,
    loadingMore,
    hasMore,
    page,
    lastElementRef,
  };
}
