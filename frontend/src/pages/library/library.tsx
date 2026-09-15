import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import Components from "@components";
const Shared = Components;
import Core from "@core";
import {
  FolderDown,
  Compass,
  RefreshCw,
  User,
  Filter,
  Clock,
  ArrowDownAZ,
  ArrowUpZA,
  Star,
  Heart,
  Download,
  Play,
  Square,
  Activity,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { useModalDeeplink } from "../home/hooks/use-modal-deeplink";
import { ModDetailsModal } from "../home/components/mod-details-modal";
import { useDownloadStore, useLibraryStore, useFavoritesStore, useProcessStore } from "../../store";
import { DownloadingModCard } from "./components/downloading-mod-card";
import { ENGINE_CATEGORIES } from "../../core/services/gamebanana/constants";
import {
  extractModIdOrUrl,
  handleDirectModLookup,
} from "@utils";
import type { ModItem } from "../home/types";

export type LibrarySortOption = "recent" | "az" | "za" | "popular" | "author";

/**
 * @description Library View.
 * Displays locally installed mods and active installations with dedicated dimmed cards,
 * comprehensive sorting (Recent, A-Z, Z-A, Popular, Author), engine category filters,
 * and a favorites filter covering both installed and uninstalled favorited mods.
 */
export const Library: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const isInitializedRef = useRef(false);

  const installedMods = useLibraryStore((s) => s.installedMods);
  const isLoading = useLibraryStore((s) => s.isLoading);
  const loadInstalledMods = useLibraryStore((s) => s.loadInstalledMods);
  const setInstalledMods = useLibraryStore((s) => s.setInstalledMods);

  const favorites = useFavoritesStore((s) => s.favorites);
  const totalFavoritesCount = Object.keys(favorites).length;

  const processInstances = useProcessStore((s) => s.instances);

  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState<LibrarySortOption>("recent");
  const [engineFilter, setEngineFilter] = useState<string[]>(["all"]);
  const [showFilters, setShowFilters] = useState(false);
  const filtersRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showFilters) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (filtersRef.current && !filtersRef.current.contains(e.target as Node)) {
        setShowFilters(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showFilters]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const dynamicTitle = useMemo(() => {
    const segments: string[] = ["Library"];

    if (showFavoritesOnly) {
      segments.push("Favorites");
    }

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
        case "az":
          segments.push("A - Z");
          break;
        case "za":
          segments.push("Z - A");
          break;
        case "popular":
          segments.push("Popular");
          break;
        case "author":
          segments.push("Author");
          break;
      }
    }

    if (searchQuery.trim()) {
      segments.push(`"${searchQuery.trim()}"`);
    }

    return segments.length === 1 ? "Library" : segments.join(" - ");
  }, [showFavoritesOnly, engineFilter, sortOption, searchQuery]);

  useEffect(() => {
    document.title =
      dynamicTitle === "Library"
        ? "Library | WeekBox"
        : `${dynamicTitle} | WeekBox`;
  }, [dynamicTitle]);

  useEffect(() => {
    const pathPart = location.pathname
      .replace(/^\/library\/?/, "")
      .toLowerCase()
      .trim();
    const pathTokens = pathPart
      .split("/")
      .map((t) => t.trim())
      .filter(Boolean);

    const filterParam =
      searchParams.get("filter")?.toLowerCase().trim() || "";
    const filterTokens = filterParam
      .split("-")
      .map((t) => t.trim())
      .filter(Boolean);

    const allTokens = [...pathTokens, ...filterTokens];

    let initialFavorites = false;
    let initialSort: LibrarySortOption = "recent";
    const initialEngines: string[] = [];

    for (const token of allTokens) {
      if (
        token === "favorites" ||
        token === "favorite" ||
        token === "fav"
      ) {
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
            (cat) =>
              cat.id.toLowerCase() === st ||
              cat.name.toLowerCase() === st
          );
          if (matchingEngine) {
            initialEngines.push(matchingEngine.id);
          }
        }
      }
    }

    if (initialFavorites) {
      setShowFavoritesOnly(true);
    }
    if (initialSort !== "recent") {
      setSortOption(initialSort);
    }
    if (initialEngines.length > 0) {
      setEngineFilter(initialEngines);
    }

    const qParam = searchParams.get("q");
    if (qParam) {
      setSearchQuery(qParam);
    }

    isInitializedRef.current = true;
  }, []);

  useEffect(() => {
    if (!isInitializedRef.current) return;

    const pathSegments: string[] = ["library"];

    if (showFavoritesOnly) {
      pathSegments.push("favorites");
    }

    if (!engineFilter.includes("all") && engineFilter.length > 0) {
      pathSegments.push(engineFilter.join(","));
    }

    if (sortOption !== "recent") {
      if (sortOption === "az") {
        pathSegments.push("a-z");
      } else if (sortOption === "za") {
        pathSegments.push("z-a");
      } else {
        pathSegments.push(sortOption);
      }
    }

    const targetPath =
      pathSegments.length > 1 ? `/${pathSegments.join("/")}` : "/library";

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

  const { selectedCard, handleCardClick, handleCloseModal } = useModalDeeplink();

  const taskFileKeys = useDownloadStore((s) => Object.keys(s.tasks).join(","));
  const activeFileIds = useMemo(
    () => (taskFileKeys ? taskFileKeys.split(",") : []),
    [taskFileKeys]
  );

  const taskModIdsString = useDownloadStore((s) =>
    Object.values(s.tasks)
      .map((t) => String(t.modId))
      .join(",")
  );
  const downloadingModIds = useMemo(
    () => new Set(taskModIdsString ? taskModIdsString.split(",") : []),
    [taskModIdsString]
  );

  const displayedDownloadingFileIds = useMemo(() => {
    if (!showFavoritesOnly) return activeFileIds;
    const allTasks = useDownloadStore.getState().tasks;
    return activeFileIds.filter((fileId) => {
      const task = allTasks[fileId];
      return task && Boolean(favorites[String(task.modId)]);
    });
  }, [activeFileIds, showFavoritesOnly, favorites]);

  useEffect(() => {
    loadInstalledMods(false);
  }, [loadInstalledMods]);

  useEffect(() => {
    const handleModsChanged = (e: Event) => {
      const detail = (e as CustomEvent<{ action: string; modId?: string; mod?: any }>).detail;
      if (!detail) {
        loadInstalledMods(true);
        return;
      }

      if (detail.action === "uninstalled" && detail.modId) {
        setInstalledMods((prev) =>
          prev.filter((m) => String(m.id) !== String(detail.modId))
        );
      } else if (detail.action === "installed" && detail.mod) {
        setInstalledMods((prev) => {
          const filtered = prev.filter(
            (m) => String(m.id) !== String(detail.mod.id)
          );
          return [detail.mod, ...filtered];
        });
      } else if (detail.action === "updated" && detail.mod) {
        setInstalledMods((prev) =>
          prev.map((m) =>
            String(m.id) === String(detail.mod.id)
              ? { ...m, ...detail.mod }
              : m
          )
        );
      } else {
        loadInstalledMods(true);
      }
    };

    window.addEventListener("wb:mods-changed", handleModsChanged);
    const unsubPlatform = Core.platform.onEvent("mods:changed", (data: any) => {
      if (data?.action === "uninstalled" && data?.modId) {
        setInstalledMods((prev) =>
          prev.filter((m) => String(m.id) !== String(data.modId))
        );
      } else if (data?.action === "installed" && data?.mod) {
        setInstalledMods((prev) => {
          const filtered = prev.filter(
            (m) => String(m.id) !== String(data.mod.id)
          );
          return [data.mod, ...filtered];
        });
      } else if (data?.action === "updated" && data?.mod) {
        setInstalledMods((prev) =>
          prev.map((m) =>
            String(m.id) === String(data.mod.id)
              ? { ...m, ...data.mod }
              : m
          )
        );
      } else {
        loadInstalledMods(true);
      }
    });

    return () => {
      window.removeEventListener("wb:mods-changed", handleModsChanged);
      unsubPlatform();
    };
  }, [loadInstalledMods, setInstalledMods]);

  const filteredMods = useMemo(() => {
    let baseList: any[] = [];
    if (showFavoritesOnly) {
      const favList = Object.values(favorites);
      baseList = favList.map((fav) => {
        const installedMatch = installedMods.find(
          (m) => String(m.id) === String(fav.id)
        );
        if (installedMatch) {
          return {
            ...installedMatch,
            isInstalled: true,
            isFavorite: true,
          };
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

  const filterButtonNode = (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => loadInstalledMods(true)}
        title="Refresh library"
        className="p-3 rounded-2xl flex items-center justify-center border bg-[var(--wb-surface-container-high)] hover:bg-[var(--wb-surface-container-highest)] border-[var(--wb-outline-variant)]/60 text-[var(--wb-on-surface)] transition-colors cursor-pointer"
      >
        <RefreshCw className={`w-6 h-6 ${isLoading ? "animate-spin" : ""}`} />
      </button>

      <div className="relative" ref={filtersRef}>
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          title="Filter & Sort"
          className={`p-3 rounded-2xl flex items-center justify-center border transition-colors cursor-pointer ${
            showFilters || isFilterActive
              ? "bg-[var(--wb-primary)] border-[var(--wb-primary)] text-[var(--wb-on-primary)] shadow-sm"
              : "bg-[var(--wb-surface-container-high)] hover:bg-[var(--wb-surface-container-highest)] border-[var(--wb-outline-variant)]/60 text-[var(--wb-on-surface)]"
          }`}
        >
          <Filter className="w-6 h-6" />
        </button>

        {showFilters && (
          <div className="absolute top-full right-0 md:left-0 md:right-auto pt-2 z-50">
            <div className="bg-[var(--wb-surface-container)] border border-[var(--wb-outline-variant)]/60 rounded-2xl p-4 shadow-2xl flex flex-row flex-wrap items-center gap-3 min-w-[320px] backdrop-blur-xl">
              <Shared.molecules.PillDropdown
                label="Sort by"
                value={sortOption}
                onChange={setSortOption}
                options={[
                  {
                    label: "Most Recent",
                    value: "recent",
                    icon: <Clock size={16} />,
                  },
                  {
                    label: "A - Z",
                    value: "az",
                    icon: <ArrowDownAZ size={16} />,
                  },
                  {
                    label: "Z - A",
                    value: "za",
                    icon: <ArrowUpZA size={16} />,
                  },
                  {
                    label: "Most Popular",
                    value: "popular",
                    icon: <Star size={16} />,
                  },
                  {
                    label: "Author",
                    value: "author",
                    icon: <User size={16} />,
                  },
                ]}
              />
              <Shared.organisms.EngineFilterPill
                value={engineFilter}
                onChange={setEngineFilter}
                isMulti={true}
              />
              <button
                type="button"
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full font-semibold transition-all duration-200 border outline-none cursor-pointer select-none ${
                  showFavoritesOnly
                    ? "bg-red-500/20 border-red-500/50 text-red-500 shadow-sm"
                    : "bg-[var(--wb-surface-container-high)] hover:bg-[var(--wb-surface-container-highest)] border-[var(--wb-outline-variant)]/60 text-[var(--wb-on-surface-variant)] hover:text-red-400"
                }`}
              >
                <Heart
                  size={16}
                  className={showFavoritesOnly ? "fill-red-500 text-red-500" : "opacity-80"}
                />
                <span>Favorites</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const handleLibrarySearch = async (query: string) => {
    const directId = extractModIdOrUrl(query);
    if (directId !== null) {
      setSearchQuery("");
      await handleDirectModLookup(directId);
      return;
    }
    setSearchQuery(query);
  };

  return (
    <div className="items-center -m-8 justify-center text-[var(--wb-text-main)] font-sans">
      <div className="sticky top-0 z-30 w-full">
        <Shared.molecules.Searchbar
          placeholders={
            showFavoritesOnly
              ? ["Search favorite mods...", "Filter by title or author..."]
              : ["Search installed mods...", "Filter by title or author..."]
          }
          initialValue={searchQuery}
          onInput={setSearchQuery}
          onSearch={handleLibrarySearch}
          filterButton={filterButtonNode}
        />
      </div>

      <div className="pt-2 sm:pt-8 px-8">
        <Shared.atoms.Titles title={dynamicTitle}>
          <div className="flex items-center gap-2">
            {showFavoritesOnly ? (
              <div className="text-xs font-semibold text-red-400 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/30 flex items-center gap-1.5">
                <Heart size={12} className="fill-red-400" />
                <span>
                  {filteredMods.length} {filteredMods.length === 1 ? "favorite" : "favorites"}
                </span>
              </div>
            ) : (
              <div className="text-xs font-semibold text-[var(--wb-on-surface-variant)] px-3 py-1.5 rounded-full bg-[var(--wb-surface-container)] border border-[var(--wb-outline-variant)]/20">
                {installedMods.length} {installedMods.length === 1 ? "mod installed" : "mods installed"}
              </div>
            )}
            {activeFileIds.length > 0 && (
              <div className="text-xs font-semibold text-[var(--wb-primary)] px-3 py-1.5 rounded-full bg-[var(--wb-primary)]/10 border border-[var(--wb-primary)]/30 animate-pulse">
                {activeFileIds.length} installing
              </div>
            )}
          </div>
        </Shared.atoms.Titles>

        {isLoading && installedMods.length === 0 && activeFileIds.length === 0 && (
          <div
            className="grid gap-4 sm:gap-6 -mx-8 sm:mx-0 h-auto w-auto grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4"
            style={{ gridAutoFlow: "row dense" }}
          >
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={`skel-lib-${i}`} className="h-full">
                <Shared.molecules.Card
                  isLoading
                  title="Loading"
                  description="Loading description"
                  thumbnail="skeleton"
                  icon="skeleton"
                />
              </div>
            ))}
          </div>
        )}

        {showFavoritesOnly && !isLoading && totalFavoritesCount === 0 && (
          <div className="flex flex-col items-center justify-center py-24 px-4 w-full text-center">
            <div className="w-20 h-20 rounded-3xl bg-[var(--wb-surface-container)] flex items-center justify-center mb-5 border border-[var(--wb-outline-variant)]/30 shadow-none">
              <Heart className="w-10 h-10 text-red-500 opacity-90" />
            </div>
            <h2 className="text-[var(--wb-on-surface)] text-2xl font-black tracking-wide">
              No favorite mods yet
            </h2>
            <p className="text-[var(--wb-on-surface-variant)] text-sm mt-2 max-w-md opacity-80 leading-relaxed">
              Open any mod details modal and tap the heart icon to save your favorite mods here, whether downloaded or not.
            </p>
            <button
              type="button"
              onClick={() => {
                setShowFavoritesOnly(false);
                navigate("/home");
              }}
              className="mt-6 flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--wb-primary)] hover:opacity-90 text-[var(--wb-on-primary)] text-sm font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-lg shadow-[var(--wb-primary)]/20"
            >
              <Compass className="w-4 h-4" />
              Discover Mods
            </button>
          </div>
        )}

        {!showFavoritesOnly &&
          !isLoading &&
          installedMods.length === 0 &&
          activeFileIds.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 px-4 w-full text-center">
              <div className="w-20 h-20 rounded-3xl bg-[var(--wb-surface-container)] flex items-center justify-center mb-5 border border-[var(--wb-outline-variant)]/30 shadow-none">
                <FolderDown className="w-10 h-10 text-[var(--wb-primary)] opacity-90" />
              </div>
              <h2 className="text-[var(--wb-on-surface)] text-2xl font-black tracking-wide">
                Your Library is empty
              </h2>
              <p className="text-[var(--wb-on-surface-variant)] text-sm mt-2 max-w-md opacity-80 leading-relaxed">
                You haven't installed any mods yet. Explore the Discover section to browse popular Friday Night Funkin' mods and download them right here.
              </p>
              <button
                type="button"
                onClick={() => navigate("/home")}
                className="mt-6 flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--wb-primary)] hover:opacity-90 text-[var(--wb-on-primary)] text-sm font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-lg shadow-[var(--wb-primary)]/20"
              >
                <Compass className="w-4 h-4" />
                Discover Mods
              </button>
            </div>
          )}

        {!isLoading &&
          (showFavoritesOnly ? totalFavoritesCount > 0 : installedMods.length > 0) &&
          filteredMods.length === 0 &&
          displayedDownloadingFileIds.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 w-full text-center">
              <span className="text-[var(--wb-on-surface)] text-2xl font-bold opacity-80">
                No matches found
              </span>
              <span className="text-[var(--wb-on-surface-variant)] text-sm mt-2 opacity-60">
                {searchQuery.trim()
                  ? `No ${showFavoritesOnly ? "favorite" : "installed"} mod matched "${searchQuery}"`
                  : "No mods match the selected engine filter"}
              </span>
            </div>
          )}

        {((!isLoading &&
          (filteredMods.length > 0 ||
            (!showFavoritesOnly && installedMods.length > 0) ||
            displayedDownloadingFileIds.length > 0)) ||
          displayedDownloadingFileIds.length > 0) && (
          <div
            className="grid gap-4 sm:gap-6 -mx-8 sm:mx-0 h-auto w-auto grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4"
            style={{ gridAutoFlow: "row dense" }}
          >
            {displayedDownloadingFileIds.map((fileId) => (
              <DownloadingModCard
                key={`downloading-${fileId}`}
                fileId={fileId}
                onCardClick={handleCardClick}
              />
            ))}

            {filteredMods.map((item) => {
              const isItemInstalled = item.isInstalled !== false;
              const isItemFavorite = Boolean(favorites[String(item.id)]);
              const modItem: ModItem = {
                id: item.id,
                name: item.title || item.name || "Unknown Mod",
                description: item.description || "",
                htmlBody: item.htmlBody,
                img: item.img || item.thumbnail || item.thumbnailBase64 || "",
                icon: item.engineIcon || item.icon,
                previewMedia:
                  Array.isArray(item.previewMedia) && item.previewMedia.length > 0
                    ? item.previewMedia
                    : item.img
                      ? [item.img]
                      : item.thumbnail
                        ? [item.thumbnail]
                        : item.thumbnailBase64
                          ? [item.thumbnailBase64]
                          : [],
                author: item.author || "Unknown",
                authors: item.authors,
                credits: item.credits,
                submittedAt: item.submittedAt,
                updatedAt: item.updatedAt,
                engineId: item.engineId,
                files: item.files,
              };

              const engineCategory = item.engineId
                ? Object.values(ENGINE_CATEGORIES).find(
                    (c) =>
                      String(c.id).toLowerCase() === String(item.engineId).toLowerCase() ||
                      c.name.toLowerCase() === String(item.engineId).toLowerCase()
                  )
                : null;
              const engineTooltip = engineCategory?.name || (item.engineId ? String(item.engineId) : undefined);
              const playStatus = processInstances[`mod:${item.id}`]?.status || "idle";

              return (
                <div key={`lib-mod-${item.id}`} className="h-full">
                  <Shared.molecules.Card
                    title={modItem.name}
                    description={modItem.description}
                    thumbnail={item.thumbnailBase64 || modItem.img}
                    icon={modItem.icon}
                    iconTooltip={engineTooltip}
                    isNsfw={item.isNsfw}
                    isFavorite={isItemFavorite}
                    clickableArea="whole-card"
                    onClick={() => handleCardClick(modItem)}
                    extractColor={true}
                    lazyLoad={false}
                  >
                    <div className="flex items-center justify-between gap-3 mt-2 pt-2 border-t border-[var(--wb-outline-variant)]/20">
                      <div className="flex items-center gap-2 overflow-hidden">
                        {item.userPfp ? (
                          <img
                            src={item.userPfp}
                            alt={modItem.author}
                            className="w-6 h-6 rounded-full object-cover shrink-0 border border-white/5"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-[var(--wb-surface-variant)] flex items-center justify-center shrink-0 text-[var(--wb-on-surface-variant)]">
                            <User size={12} />
                          </div>
                        )}
                        <span className="text-[var(--wb-on-surface-variant)] text-xs truncate">
                          {modItem.author}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {isItemInstalled ? (
                          playStatus === "launching" ? (
                            <div className="flex items-center gap-1 text-[var(--wb-primary)] text-xs font-bold animate-pulse">
                              <Loader2 size={13} className="animate-spin" />
                              <span>Launching...</span>
                            </div>
                          ) : playStatus === "playing" ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                useProcessStore.getState().stopInstance(`mod:${item.id}`);
                              }}
                              className="flex items-center gap-1 text-emerald-400 hover:text-rose-400 text-xs font-bold transition-colors cursor-pointer group/btn"
                              title="Click to stop process"
                            >
                              <Activity size={13} className="group-hover/btn:hidden text-emerald-400 animate-pulse" />
                              <Square size={13} className="hidden group-hover/btn:inline fill-current text-rose-400" />
                              <span className="group-hover/btn:hidden">Playing</span>
                              <span className="hidden group-hover/btn:inline">Stop</span>
                            </button>
                          ) : playStatus === "stopping" ? (
                            <div className="flex items-center gap-1 text-amber-400 text-xs font-bold animate-pulse">
                              <Loader2 size={13} className="animate-spin" />
                              <span>Stopping...</span>
                            </div>
                          ) : playStatus === "error" ? (
                            <div className="flex items-center gap-1 text-rose-400 text-xs font-bold">
                              <AlertTriangle size={13} />
                              <span>Error</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-[var(--wb-primary)] text-xs font-bold">
                              <Play size={13} className="fill-current" />
                              <span>Play</span>
                            </div>
                          )
                        ) : (
                          <div className="flex items-center gap-1 text-emerald-400 text-xs font-bold">
                            <Download size={13} />
                            <span>Install</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </Shared.molecules.Card>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ModDetailsModal selectedCard={selectedCard} onClose={handleCloseModal} />
    </div>
  );
};
