import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import Core from "@core";
import type { GameBananaMod } from "@core";
import Utils from "@utils";
import { useHomeStore } from "../../../../store/home-store";

/**
 * @description Custom hook to manage the state, pagination, and layout injection for the AllMods grid.
 * Merges regular Discovery mods with Featured "Community Picks" injected mathematically.
 * @returns {object} State and refs required for the infinite scrolling grid.
 */
export function useAllMods(
  filter: string = "popular",
  engineIds: string[] = ["all"],
  searchQuery: string = "",
) {
  const {
    mods,
    setMods,
    featuredPool,
    setFeaturedPool,
    page,
    setPage,
    hasMore,
    setHasMore,
  } = useHomeStore();

  const [loading, setLoading] = useState(mods.length === 0);
  const [loadingMore, setLoadingMore] = useState(false);

  const prevFilter = useRef(filter);
  const prevEngineIds = useRef(engineIds.join(","));
  const prevSearch = useRef(searchQuery);

  // Cuando cambian los filtros o la búsqueda, reseteamos la paginación y limpiamos la lista
  useEffect(() => {
    const filtersChanged =
      prevFilter.current !== filter ||
      prevEngineIds.current !== engineIds.join(",") ||
      prevSearch.current !== searchQuery;

    if (filtersChanged) {
      setMods([]);
      setPage(1);
      setHasMore(true);

      prevFilter.current = filter;
      prevEngineIds.current = engineIds.join(",");
      prevSearch.current = searchQuery;
    }
  }, [filter, engineIds, searchQuery, setMods, setPage, setHasMore]);

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

  // Pre-load the pool of Community Picks from the official featured list
  useEffect(() => {
    Core.services.gamebanana
      .getFeaturedMods()
      .then((featuredItems) => {
        if (!featuredItems || featuredItems.length === 0) {
          setFeaturedPool([]);
          return;
        }

        const pool = featuredItems.map((mod) => ({
          ...mod,
          __isCommunityPick: true,
          __featuredLabel: "Community Pick",
        })) as GameBananaMod[];

        setFeaturedPool(pool);
      })
      .catch(console.error);
  }, [retryTrigger]);

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
          engineIds,
          searchQuery,
        );

        if (isMounted) {
          if (data.length === 0) {
            setHasMore(false);
          } else {
            setMods((prev) => {
              if (page === 1) return data;
              // Prevenir duplicados a nivel de paginación
              const existingIds = new Set(prev.map((m) => m.id));
              const uniqueData = data.filter((m) => !existingIds.has(m.id));
              return [...prev, ...uniqueData];
            });
          }
        }
      } catch (error) {
        console.error("Failed to fetch mods:", error);
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
  }, [page, retryTrigger, filter, engineIds, searchQuery]);

  // Mathematically inject Community Picks between the rows infinitely
  const combinedMods = useMemo(() => {
    const result = [...mods];
    if (featuredPool.length === 0) return result;

    const existingIds = new Set(result.map((m) => m.id));
    let injectedCount = 0;

    for (let i = 3; i < result.length; i += 16) {
      let pick: GameBananaMod | null = null;
      let attempts = 0;

      while (attempts < featuredPool.length) {
        const potentialPick =
          featuredPool[(injectedCount + attempts) % featuredPool.length];
        if (!existingIds.has(potentialPick.id)) {
          pick = potentialPick;
          injectedCount += attempts + 1;
          break;
        }
        attempts++;
      }

      if (pick) {
        existingIds.add(pick.id);
        result.splice(i, 0, pick);
        i++; // Skip the newly injected item
      }
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
