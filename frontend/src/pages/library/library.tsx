import React, { useEffect, useMemo } from "react";
import Components from "@components";
const Shared = Components;
import Core from "@core";
import { Heart } from "lucide-react";
import { useModalDeeplink } from "../home/hooks/use-modal-deeplink";
import { ModDetailsModal } from "../home/components/mod-details-modal";
import { useDownloadStore, useLibraryStore, useFavoritesStore } from "../../store";
import { DownloadingModCard } from "./components/downloading-mod-card";
import { LibraryModCard } from "./components/library-mod-card";
import { LibraryEmptyState } from "./components/library-empty-state";
import { LibraryFilterPopover } from "./components/library-filter-popover";
import { useLibraryFilters } from "./hooks/use-library-filters";
import { extractModIdOrUrl, handleDirectModLookup } from "@utils";

/**
 * @description Library View.
 * Displays locally installed mods and active installations with dedicated dimmed cards,
 * comprehensive sorting (Recent, A-Z, Z-A, Popular, Author), engine category filters,
 * and a favorites filter covering both installed and uninstalled favorited mods.
 */
export const Library: React.FC = () => {
  const installedMods = useLibraryStore((s) => s.installedMods);
  const isLoading = useLibraryStore((s) => s.isLoading);
  const loadInstalledMods = useLibraryStore((s) => s.loadInstalledMods);
  const setInstalledMods = useLibraryStore((s) => s.setInstalledMods);

  const favorites = useFavoritesStore((s) => s.favorites);
  const totalFavoritesCount = Object.keys(favorites).length;

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

  const {
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
  } = useLibraryFilters({
    installedMods,
    favorites,
    downloadingModIds,
  });

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
            String(m.id) === String(detail.mod.id) ? { ...m, ...detail.mod } : m
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
            String(m.id) === String(data.mod.id) ? { ...m, ...data.mod } : m
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

  const handleLibrarySearch = async (query: string) => {
    const directId = extractModIdOrUrl(query);
    if (directId !== null) {
      setSearchQuery("");
      await handleDirectModLookup(directId);
      return;
    }
    setSearchQuery(query);
  };

  const filterButtonNode = (
    <LibraryFilterPopover
      isLoading={isLoading}
      onRefresh={() => loadInstalledMods(true)}
      showFilters={showFilters}
      setShowFilters={setShowFilters}
      isFilterActive={isFilterActive}
      sortOption={sortOption}
      setSortOption={setSortOption}
      engineFilter={engineFilter}
      setEngineFilter={setEngineFilter}
      showFavoritesOnly={showFavoritesOnly}
      setShowFavoritesOnly={setShowFavoritesOnly}
    />
  );

  const hasItemsToDisplay =
    (!isLoading &&
      (filteredMods.length > 0 ||
        (!showFavoritesOnly && installedMods.length > 0) ||
        displayedDownloadingFileIds.length > 0)) ||
    displayedDownloadingFileIds.length > 0;

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
          <LibraryEmptyState type="empty-favorites" />
        )}

        {!showFavoritesOnly &&
          !isLoading &&
          installedMods.length === 0 &&
          activeFileIds.length === 0 && (
            <LibraryEmptyState type="empty-library" />
          )}

        {!isLoading &&
          filteredMods.length === 0 &&
          displayedDownloadingFileIds.length === 0 &&
          (showFavoritesOnly
            ? totalFavoritesCount > 0
            : installedMods.length > 0) && (
            <LibraryEmptyState
              type="no-matches"
              searchQuery={searchQuery}
              showFavoritesOnly={showFavoritesOnly}
            />
          )}

        {hasItemsToDisplay && (
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

            {filteredMods.map((item) => (
              <LibraryModCard
                key={`lib-mod-${item.id}`}
                item={item}
                isFavorite={Boolean(favorites[String(item.id)])}
                onCardClick={handleCardClick}
              />
            ))}
          </div>
        )}
      </div>

      <ModDetailsModal selectedCard={selectedCard} onClose={handleCloseModal} />
    </div>
  );
};
export default Library;
