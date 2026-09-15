import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import Core from "@core";
import type { GameBananaMod } from "@core";
import Utils from "@utils";
import { useHomeStore } from "../../../../store/home-store";

/**
 * Custom hook to manage the state, pagination, and layout injection for the AllMods grid.
 * Merges regular Discovery mods with Featured "Community Picks" injected mathematically.
 * 
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
    loadedParamsKey,
    setLoadedParamsKey,
  } = useHomeStore();

  const currentParamsKey = useMemo(() => {
    const sortedEngines = [...engineIds].sort().join(",");
    return `${filter}::${sortedEngines}::${searchQuery.trim()}`;
  }, [filter, engineIds, searchQuery]);

  const isCurrentKeyLoaded = loadedParamsKey === currentParamsKey && mods.length > 0;
  const [loading, setLoading] = useState(!isCurrentKeyLoaded);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [retryTrigger, setRetryTrigger] = useState(0);

  const prevKeyRef = useRef(currentParamsKey);

  /**
   * Reset pagination and active loading state when search or filter parameters change.
   */
  useEffect(() => {
    if (prevKeyRef.current !== currentParamsKey) {
      prevKeyRef.current = currentParamsKey;
      setPage(1);
      setHasMore(true);
      setLoading(true);
      setHasError(false);
    }
  }, [currentParamsKey, setPage, setHasMore]);

  const observer = useRef<IntersectionObserver | null>(null);

  const lastElementRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (loading || loadingMore) return;
      if (observer.current) observer.current.disconnect();

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
    [loading, loadingMore, hasMore, setPage],
  );

  Utils.hooks.useNetworkRecovery(() => {
    if (mods.length === 0) {
      setRetryTrigger((prev) => prev + 1);
    }
  });

  useEffect(() => {
    if (featuredPool.length > 0) return;
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
          __featuredLabel: mod.__featuredLabel || "Featured",
        })) as GameBananaMod[];

        setFeaturedPool(pool);
      })
      .catch(console.error);
  }, [retryTrigger, featuredPool.length, setFeaturedPool]);

  useEffect(() => {
    if (mods.length > 0) {
      setHasError(false);
      setLoading(false);
    }
  }, [mods.length]);

  const retry = useCallback(() => {
    setLoading(true);
    setHasError(false);
    setHasMore(true);
    setRetryTrigger((prev) => prev + 1);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchMods = async () => {
      try {
        setHasError(false);

        /** Avoid re-fetching page 1 if data for the current query parameters is already loaded in store */
        if (page === 1 && loadedParamsKey === currentParamsKey && mods.length > 0) {
          setLoading(false);
          setHasError(false);
          return;
        }

        if (page === 1) {
          setLoading(true);
        } else {
          setLoadingMore(true);
        }

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
            if (page === 1) {
              setMods([]);
              setLoadedParamsKey(currentParamsKey);
            }
          } else {
            setMods((prev) => {
              if (page === 1) return data;
              const existingIds = new Set(prev.map((m) => m.id));
              const uniqueData = data.filter((m) => !existingIds.has(m.id));
              return [...prev, ...uniqueData];
            });
            setLoadedParamsKey(currentParamsKey);
          }
        }
      } catch (error) {
        console.error("Failed to fetch mods:", error);
        if (isMounted) {
          setHasError(true);
        }
        if (page === 1 && mods.length === 0) {
          Utils.toast.error(
            "Could not fetch mods from GameBanana. Check your internet connection.",
            {
              title: "Network Warning",
              duration: 5000,
            },
          );
        }
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
  }, [page, retryTrigger, currentParamsKey, filter, engineIds, searchQuery, loadedParamsKey, mods.length, setMods, setHasMore, setLoadedParamsKey]);

  const combinedMods = useMemo(() => {
    const result = [...mods];
    if (searchQuery.trim().length > 0 || featuredPool.length === 0) {
      return result;
    }

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
        i++;
      }
    }

    return result;
  }, [mods, featuredPool, searchQuery]);

  return {
    mods: combinedMods,
    loading,
    loadingMore,
    hasMore,
    hasError,
    retry,
    page,
    lastElementRef,
  };
}
