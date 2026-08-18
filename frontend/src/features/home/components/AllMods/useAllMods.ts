import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import Core from "@core";
import type { GameBananaMod } from "@core";

export function useAllMods() {
  const [mods, setMods] = useState<GameBananaMod[]>([]);
  const [featuredPool, setFeaturedPool] = useState<GameBananaMod[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const observer = useRef<IntersectionObserver | null>(null);

  const lastElementRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (loading || loadingMore) return;
      if (observer.current) observer.current.disconnect();

      // rootMargin: '600px' hace que cargue "media página antes"
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

  // Cargar el pool de Community Picks
  useEffect(() => {
    Core.services.gamebanana
      .getFeaturedMods()
      .then((fMods) => {
        const pool: GameBananaMod[] = [];
        const usedIds = new Set<number>();

        const tryAdd = (keyword: string) => {
          const mod = fMods.find(
            (m) =>
              m.__featuredLabel?.toLowerCase().includes(keyword) &&
              !usedIds.has(m.id),
          );
          if (mod) {
            usedIds.add(mod.id);
            pool.push({ ...mod, __isCommunityPick: true } as GameBananaMod);
          }
        };

        tryAdd("today");
        tryAdd("week");
        tryAdd("month");
        tryAdd("6 month");

        for (const mod of fMods) {
          if (pool.length >= 4) break;
          if (!usedIds.has(mod.id)) {
            usedIds.add(mod.id);
            pool.push({ ...mod, __isCommunityPick: true } as GameBananaMod);
          }
        }
        setFeaturedPool(pool);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchMods = async () => {
      try {
        if (page === 1) setLoading(true);
        else setLoadingMore(true);

        const data = await Core.services.gamebanana.getMods(
          "popular",
          page,
          45,
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
  }, [page]);

  // Inyectar matemáticamente los Community Picks entre las filas de manera infinita
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
