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
  HomeFilterMenu,
} from "./components";

const ModDetailsModal = lazy(() =>
  import("@/ui/mod-details-modal").then((m) => ({
    default: m.ModDetailsModal,
  })),
);

export const HomeView: React.FC = () => {
  const [searchParams] = useSearchParams();
  const activeQuery = searchParams.get("q") || "";

  const { featuredList, featuredItems, isFeaturedLoading } = useFeaturedMods();

  const { isFavorite, toggleFavorite } = useHomeFavorites();

  const [filter, setFilter] = React.useState<import("@/services/gamebanana").ModFilter>("ripe");
  const [engineFilter, setEngineFilter] = React.useState<string | string[]>("all");

  const {
    modsList,
    modItems,
    isInitialLoading,
    isLoadingMore,
    hasMore,
    loadNextChunk,
  } = useHomeMods(activeQuery, filter, engineFilter);

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
        <div className="w-full max-w-2xl mx-auto flex items-center gap-2.5">
          <HomeFilterMenu
            filter={filter}
            onSelectFilter={setFilter}
            engineFilter={engineFilter}
            onSelectEngine={setEngineFilter}
          />
          <div className="flex-1 min-w-0">
            <HomeSearchBar
              initialQuery={searchQuery}
              onSelectMod={handleOpenMod}
              onSearch={handleSearch}
            />
          </div>
        </div>
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
          filter={filter}
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
