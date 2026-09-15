import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useHomeStore } from "../../../store/home-store";

/**
 * Parses URL query parameters for home filters.
 * Supports:
 * - filter=id1,id2-popular
 * - filter='id1,id2'-'popular'
 * - filter=123,456
 * - filter=popular
 */
export function parseFilterParam(param: string | null): {
  categoryFilter: string[];
  sortFilter: string;
} | null {
  if (!param) return null;
  const clean = param.trim();
  if (!clean) return null;

  const knownSorts = ["popular", "new", "ripe", "updated"];

  const dashIndex = clean.lastIndexOf("-");
  if (dashIndex !== -1) {
    const rawEngines = clean.slice(0, dashIndex).replace(/['"]/g, "").trim();
    const rawSort = clean.slice(dashIndex + 1).replace(/['"]/g, "").trim();

    const engines = rawEngines
      ? rawEngines.split(",").map((s) => s.trim()).filter(Boolean)
      : ["all"];

    return {
      categoryFilter: engines.length > 0 ? engines : ["all"],
      sortFilter: rawSort || "popular",
    };
  }

  const sanitized = clean.replace(/['"]/g, "").trim();
  if (knownSorts.includes(sanitized)) {
    return {
      categoryFilter: ["all"],
      sortFilter: sanitized,
    };
  }

  const engines = sanitized.split(",").map((s) => s.trim()).filter(Boolean);
  return {
    categoryFilter: engines.length > 0 ? engines : ["all"],
    sortFilter: "popular",
  };
}

/**
 * Hook to synchronize Home filters (engines, sort, search) with URL query parameters.
 * When filters change, updates the URL.
 * When the page loads/reloads with filters in URL, restores them into the store.
 */
export function useHomeUrlFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const {
    categoryFilter,
    setCategoryFilter,
    sortFilter,
    setSortFilter,
    searchQuery,
    setSearchQuery,
  } = useHomeStore();

  const isInitializedRef = useRef(false);

  useEffect(() => {
    const filterParam = searchParams.get("filter");
    const qParam = searchParams.get("q");

    if (filterParam) {
      const parsed = parseFilterParam(filterParam);
      if (parsed) {
        setCategoryFilter(parsed.categoryFilter);
        setSortFilter(parsed.sortFilter);
      }
    }

    if (qParam) {
      setSearchQuery(qParam);
    }

    isInitializedRef.current = true;
  }, []);

  useEffect(() => {
    if (!isInitializedRef.current) return;

    const isDefaultCategory =
      categoryFilter.length === 0 ||
      (categoryFilter.length === 1 && categoryFilter[0] === "all");
    const isDefaultSort = sortFilter === "popular";
    const hasSearch = Boolean(searchQuery.trim());

    const nextParams = new URLSearchParams(searchParams);

    if (!isDefaultCategory || !isDefaultSort) {
      const enginesPart = isDefaultCategory ? "all" : categoryFilter.join(",");
      nextParams.set("filter", `${enginesPart}-${sortFilter}`);
    } else {
      nextParams.delete("filter");
    }

    if (hasSearch) {
      nextParams.set("q", searchQuery.trim());
    } else {
      nextParams.delete("q");
    }

    if (nextParams.toString() !== searchParams.toString()) {
      setSearchParams(nextParams, { replace: true });
    }
  }, [categoryFilter, sortFilter, searchQuery, searchParams, setSearchParams]);
}
