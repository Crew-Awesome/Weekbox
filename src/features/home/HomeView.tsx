import React, { lazy, Suspense } from "react";
import { useSearchParams } from "react-router-dom";
import { Topbar } from "@/ui/topbar";
import {
  useFeaturedMods,
  useHomeMods,
  useHomeModSelection,
  useHomeFavorites,
} from "./hooks";
import {
  HomeSearchBar,
  FeaturedModsSection,
  ModsGridSection,
} from "./components";

const ModDetailsModal = lazy(() =>
  import("@/ui/mod-details-modal").then((m) => ({
    default: m.ModDetailsModal,
  })),
);

/**
 * Primary discovery view displaying the featured mods carousel and an infinite grid of most-liked (ripe) mods.
 */
export const HomeView: React.FC = () => {
  const [searchParams] = useSearchParams();
  const activeQuery = searchParams.get("q") || "";

  const { featuredList, featuredItems, isFeaturedLoading } = useFeaturedMods();

  const { isFavorite, toggleFavorite } = useHomeFavorites();

  const {
    modsList,
    modItems,
    isInitialLoading,
    isLoadingMore,
    hasMore,
    loadNextChunk,
  } = useHomeMods(activeQuery);

  const {
    searchQuery,
    selectedModData,
    handleOpenMod,
    handleCloseModal,
    handleSearch,
  } = useHomeModSelection({
    featuredList,
    modsList,
  });

  return (
    <div className="w-full min-h-full flex flex-col">
      <Topbar>
        <HomeSearchBar
          initialQuery={searchQuery}
          onSelectMod={handleOpenMod}
          onSearch={handleSearch}
        />
      </Topbar>

      <div className="w-full flex flex-col gap-6 p-4 sm:p-8">
        {!searchQuery && (
          <FeaturedModsSection
            items={featuredItems}
            isLoading={isFeaturedLoading}
            onSelectMod={handleOpenMod}
          />
        )}

        <ModsGridSection
          searchQuery={searchQuery}
          items={modItems}
          isInitialLoading={isInitialLoading}
          isLoadingMore={isLoadingMore}
          hasMore={hasMore}
          onLoadMore={loadNextChunk}
          onSelectMod={handleOpenMod}
          isFavorite={isFavorite}
          onToggleFavorite={toggleFavorite}
        />

        {Boolean(selectedModData) && (
          <Suspense fallback={null}>
            <ModDetailsModal
              selectedCard={selectedModData}
              isOpen={Boolean(selectedModData)}
              onClose={handleCloseModal}
            />
          </Suspense>
        )}
      </div>
    </div>
  );
};

export default HomeView;
