import { useState, useEffect, useMemo, useRef } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { ENGINE_CATEGORIES } from "../../../core/services/gamebanana/constants";

export type LibrarySortOption = "recent" | "az" | "za" | "popular" | "author";

export interface UseLibraryFiltersParams {
  installedMods: any[];
  favorites: Record<string, any>;
  downloadingModIds: Set<string>;
}

export function useLibraryFilters({
  installedMods,
  favorites,
  downloadingModIds,
}: UseLibraryFiltersParams) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const isInitializedRef = useRef(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState<LibrarySortOption>("recent");
  const [engineFilter, setEngineFilter] = useState<string[]>(["all"]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Parse initial state from URL on mount
  useEffect(() => {
    const pathPart = location.pathname
      .replace(/^\/library\/?/, "")
      .toLowerCase()
      .trim();
    const pathTokens = pathPart
      .split("/")
      .map((t) => t.trim())
      .filter(Boolean);

    const filterParam = searchParams.get("filter")?.toLowerCase().trim() || "";
    const filterTokens = filterParam
      .split("-")
      .map((t) => t.trim())
      .filter(Boolean);

    const allTokens = [...pathTokens, ...filterTokens];

    let initialFavorites = false;
    let initialSort: LibrarySortOption = "recent";
    const initialEngines: string[] = [];

    for (const token of allTokens) {
      if (token === "favorites" || token === "favorite" || token === "fav") {
        initialFavorites = true;
      } else if (token === "az" || token === "a-z") {
        initialSort = "az";
      } else if (token === "za" || token === "z-a") {
        initialSort = "za";
      } else if (token === "popular") {
        initialSort = "popular";
      } else if (token === "author") {
        initialSort = "author";
      } else {
        const subTokens = token.split(",");
        for (const st of subTokens) {
          const matchingEngine = Object.values(ENGINE_CATEGORIES).find(
            (cat) => cat.id.toLowerCase() === st || cat.name.toLowerCase() === st
          );
          if (matchingEngine) {
            initialEngines.push(matchingEngine.id);
          }
        }
      }
    }

    if (initialFavorites) setShowFavoritesOnly(true);
    if (initialSort !== "recent") setSortOption(initialSort);
    if (initialEngines.length > 0) setEngineFilter(initialEngines);

    const qParam = searchParams.get("q");
    if (qParam) setSearchQuery(qParam);

    isInitializedRef.current = true;
  }, []);

  // Sync state changes back to URL
  useEffect(() => {
    if (!isInitializedRef.current) return;

    const pathSegments: string[] = ["library"];

    if (showFavoritesOnly) pathSegments.push("favorites");
    if (!engineFilter.includes("all") && engineFilter.length > 0) {
      pathSegments.push(engineFilter.join(","));
    }

    if (sortOption !== "recent") {
      if (sortOption === "az") pathSegments.push("a-z");
      else if (sortOption === "za") pathSegments.push("z-a");
      else pathSegments.push(sortOption);
    }

    const targetPath = pathSegments.length > 1 ? `/${pathSegments.join("/")}` : "/library";

    const nextParams = new URLSearchParams(searchParams);
    if (searchQuery.trim()) {
      nextParams.set("q", searchQuery.trim());
    } else {
      nextParams.delete("q");
    }
    nextParams.delete("filter");

    const qs = nextParams.toString();
    const targetUrl = qs ? `${targetPath}?${qs}` : targetPath;
    const currentUrl = `${location.pathname}${location.search ? location.search : ""}`;

    if (currentUrl !== targetUrl) {
      navigate(targetUrl, { replace: true });
    }
  }, [
    showFavoritesOnly,
    engineFilter,
    sortOption,
    searchQuery,
    location.pathname,
    location.search,
    searchParams,
    navigate,
  ]);

  // Compute dynamic title
  const dynamicTitle = useMemo(() => {
    const segments: string[] = ["Library"];

    if (showFavoritesOnly) segments.push("Favorites");

    if (!engineFilter.includes("all") && engineFilter.length > 0) {
      const engineNames = engineFilter
        .map((id) => {
          const found = Object.values(ENGINE_CATEGORIES).find(
            (cat) => cat.id.toLowerCase() === id.toLowerCase()
          );
          return found ? found.name : id;
        })
        .filter(Boolean);

      if (engineNames.length > 0) {
        segments.push(engineNames.join(", "));
      }
    }

    if (sortOption !== "recent") {
      switch (sortOption) {
        case "az": segments.push("A - Z"); break;
        case "za": segments.push("Z - A"); break;
        case "popular": segments.push("Popular"); break;
        case "author": segments.push("Author"); break;
      }
    }

    if (searchQuery.trim()) {
      segments.push(`"${searchQuery.trim()}"`);
    }

    return segments.length === 1 ? "Library" : segments.join(" - ");
  }, [showFavoritesOnly, engineFilter, sortOption, searchQuery]);

  // Document title effect
  useEffect(() => {
    document.title =
      dynamicTitle === "Library"
        ? "Library | WeekBox"
        : `${dynamicTitle} | WeekBox`;
  }, [dynamicTitle]);

  // Filtered and sorted mods
  const filteredMods = useMemo(() => {
    let baseList: any[] = [];
    if (showFavoritesOnly) {
      const favList = Object.values(favorites);
      baseList = favList.map((fav) => {
        const installedMatch = installedMods.find((m) => String(m.id) === String(fav.id));
        if (installedMatch) {
          return { ...installedMatch, isInstalled: true, isFavorite: true };
        }
        return {
          id: fav.id,
          title: fav.name,
          name: fav.name,
          description: fav.description,
          htmlBody: fav.htmlBody,
          thumbnail: fav.img,
          img: fav.img,
          engineIcon: fav.icon,
          icon: fav.icon,
          author: fav.author,
          authors: fav.authors,
          credits: fav.credits,
          engineId: fav.engineId,
          files: fav.files,
          previewMedia: fav.previewMedia,
          installedAt: fav.addedAt,
          isInstalled: false,
          isFavorite: true,
        };
      });
    } else {
      baseList = installedMods.map((m) => ({
        ...m,
        isInstalled: true,
        isFavorite: Boolean(favorites[String(m.id)]),
      }));
    }

    let result = baseList.filter((m) => !downloadingModIds.has(String(m.id)));

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        (m) =>
          (m.title && m.title.toLowerCase().includes(query)) ||
          (m.name && m.name.toLowerCase().includes(query)) ||
          (m.author && m.author.toLowerCase().includes(query))
      );
    }

    if (!engineFilter.includes("all") && engineFilter.length > 0) {
      const selectedEngines = engineFilter.map(String);
      result = result.filter(
        (m) => m.engineId && selectedEngines.includes(String(m.engineId))
      );
    }

    switch (sortOption) {
      case "az":
        result = [...result].sort((a, b) =>
          (a.title || a.name || "").localeCompare(b.title || b.name || "")
        );
        break;
      case "za":
        result = [...result].sort((a, b) =>
          (b.title || b.name || "").localeCompare(a.title || a.name || "")
        );
        break;
      case "popular":
        result = [...result].sort(
          (a, b) =>
            ((Number(b.downloads) || 0) + (Number(b.likes) || 0)) -
            ((Number(a.downloads) || 0) + (Number(a.likes) || 0))
        );
        break;
      case "author":
        result = [...result].sort((a, b) =>
          (a.author || "").localeCompare(b.author || "")
        );
        break;
      case "recent":
      default:
        result = [...result].sort(
          (a, b) => (Number(b.installedAt) || 0) - (Number(a.installedAt) || 0)
        );
        break;
    }

    return result;
  }, [
    installedMods,
    downloadingModIds,
    favorites,
    showFavoritesOnly,
    searchQuery,
    engineFilter,
    sortOption,
  ]);

  const isFilterActive =
    showFavoritesOnly ||
    sortOption !== "recent" ||
    (!engineFilter.includes("all") && engineFilter.length > 0);

  return {
    searchQuery,
    setSearchQuery,
    sortOption,
    setSortOption,
    engineFilter,
    setEngineFilter,
    showFavoritesOnly,
    setShowFavoritesOnly,
    showFilters,
    setShowFilters,
    dynamicTitle,
    filteredMods,
    isFilterActive,
  };
}
