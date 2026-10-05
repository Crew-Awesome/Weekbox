import React from "react";
import Components from "@components";
const Shared = Components;
import { useModalDeeplink } from "../home/hooks/use-modal-deeplink";
import { ModDetailsModal } from "../home/components/mod-details-modal";
import { useLibraryStore, useFavoritesStore } from "../../store";
import { LibraryFilterPopover } from "./components/library-filter-popover";
import { LibraryHeader } from "./components/library-header";
import { LibraryGrid } from "./components/library-grid";
import { useLibraryFilters } from "./hooks/use-library-filters";
import { useLibraryModEvents } from "./hooks/use-library-mod-events";
import { useLibraryDownloads } from "./hooks/use-library-downloads";
import { extractModIdOrUrl, handleDirectModLookup } from "@utils";

/**
 * @description Library View.
 * Displays locally installed mods and active installations with dedicated dimmed cards,
 * comprehensive sorting (Recent, A-Z, Z-A, Popular, Author), engine category filters,
 * and a favorites filter covering both installed and uninstalled favorited mods.
 *
 * Refactored under S.O.L.I.D principles:
 * - Single Responsibility: Delegated event handling, download derivation, header metrics, and grid rendering to focused units.
 * - Open/Closed: Grid rendering and header badges can be enhanced without modifying view orchestration.
 * - Dependency Inversion: Relies on high-level custom hooks for domain state.
 */
export const Library: React.FC = () => {
  const installedMods = useLibraryStore((s) => s.installedMods);
  const isLoading = useLibraryStore((s) => s.isLoading);
  const loadInstalledMods = useLibraryStore((s) => s.loadInstalledMods);

  const favorites = useFavoritesStore((s) => s.favorites);
  const totalFavoritesCount = Object.keys(favorites).length;

  const { selectedCard, handleCardClick, handleCloseModal } = useModalDeeplink();

  // S.O.L.I.D: Encapsulate mod event lifecycle & store synchronization
  useLibraryModEvents();

  const [showFavoritesOnly, setShowFavoritesOnly] = React.useState(false);

  // S.O.L.I.D: Encapsulate download task keys & downloading IDs derivation
  const {
    activeFileIds,
    downloadingModIds,
    displayedDownloadingFileIds,
  } = useLibraryDownloads({
    showFavoritesOnly,
    favorites,
  });

  const {
    searchQuery,
    setSearchQuery,
    sortOption,
    setSortOption,
    engineFilter,
    setEngineFilter,
    showFavoritesOnly: filterShowFavoritesOnly,
    setShowFavoritesOnly: setFilterShowFavoritesOnly,
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

  // Sync state between useLibraryFilters and local state
  React.useEffect(() => {
    setShowFavoritesOnly(filterShowFavoritesOnly);
  }, [filterShowFavoritesOnly]);

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
      showFavoritesOnly={filterShowFavoritesOnly}
      setShowFavoritesOnly={setFilterShowFavoritesOnly}
    />
  );

  return (
    <div className="items-center -m-8 justify-center text-[var(--wb-text-main)] font-sans">
      <div className="sticky top-0 z-30 w-full">
        <Shared.molecules.Searchbar
          placeholders={
            filterShowFavoritesOnly
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
        <LibraryHeader
          dynamicTitle={dynamicTitle}
          showFavoritesOnly={filterShowFavoritesOnly}
          filteredCount={filteredMods.length}
          installedCount={installedMods.length}
          activeInstallingCount={activeFileIds.length}
        />

        <LibraryGrid
          isLoading={isLoading}
          installedMods={installedMods}
          activeFileIds={activeFileIds}
          displayedDownloadingFileIds={displayedDownloadingFileIds}
          filteredMods={filteredMods}
          favorites={favorites}
          totalFavoritesCount={totalFavoritesCount}
          showFavoritesOnly={filterShowFavoritesOnly}
          searchQuery={searchQuery}
          onCardClick={handleCardClick}
        />
      </div>

      <ModDetailsModal selectedCard={selectedCard} onClose={handleCloseModal} />
    </div>
  );
};

export default Library;
