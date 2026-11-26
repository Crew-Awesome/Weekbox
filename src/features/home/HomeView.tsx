import React, { lazy, Suspense } from "react";
import { useSearchParams } from "react-router-dom";
import { Topbar } from "@/ui/topbar/Topbar";
import {
  useFeaturedMods,
  useHomeMods,
  useHomeModSelection,
  useHomeFavorites,
  useInstalledModOverrides,
} from "./hooks";
import { HomeSearchBar } from "./components/HomeSearchBar";
import { FeaturedModsSection } from "./components/FeaturedMods/FeaturedModsSection";
import { ModsGridSection } from "./components/ModsGrid/ModsGridSection";
import { HomeFilterMenu } from "./components/HomeFilterMenu";

const ModDetailsModal = lazy(() =>
  import("@/ui/mod-details-modal/mod-details-modal").then((m) => ({
    default: m.ModDetailsModal,
  })),
);

import type { ModProviderId } from "@/services/providers";

const DEFAULT_FILTER_BY_PROVIDER: Record<ModProviderId, string> = {
  gamebanana: "ripe",
  gamejolt: "hot",
  backstage: "activity",
};

export const HomeView: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeQuery = searchParams.get("q") || "";
  const rawProvider = searchParams.get("provider");
  const provider: ModProviderId =
    rawProvider === "gamejolt" || rawProvider === "backstage"
      ? rawProvider
      : "gamebanana";

  const { featuredList, featuredItems, isFeaturedLoading } = useFeaturedMods();

  const { isFavorite, toggleFavorite } = useHomeFavorites();

  const [prevProvider, setPrevProvider] = React.useState<ModProviderId>(provider)
  const [filter, setFilter] = React.useState<string>(
    () => DEFAULT_FILTER_BY_PROVIDER[provider],
  )
  const [engineFilter, setEngineFilter] = React.useState<string | string[]>('all')

  if (prevProvider !== provider) {
    setPrevProvider(provider)
    setFilter(DEFAULT_FILTER_BY_PROVIDER[provider])
    setEngineFilter('all')
  }

  const handleSelectProvider = React.useCallback(
    (nextProvider: ModProviderId) => {
      if (nextProvider === provider) return;
      setFilter(DEFAULT_FILTER_BY_PROVIDER[nextProvider]);
      setEngineFilter("all");
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (nextProvider === "gamebanana") {
          next.delete("provider");
        } else {
          next.set("provider", nextProvider);
        }
        next.delete("mod");
        return next;
      });
    },
    [provider, setSearchParams],
  );

  const {
    modsList,
    modItems,
    isInitialLoading,
    isLoadingMore,
    hasMore,
    isError,
    loadNextChunk,
    reload,
  } = useHomeMods(activeQuery, filter, engineFilter, provider);

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

  const { applyOverride, applyOverrides } = useInstalledModOverrides();

  const resolvedFeaturedItems = React.useMemo(
    () => applyOverrides(featuredItems),
    [applyOverrides, featuredItems],
  );
  const resolvedModItems = React.useMemo(
    () => applyOverrides(modItems),
    [applyOverrides, modItems],
  );
  const resolvedSelectedModData = React.useMemo(
    () => (selectedModData ? applyOverride(selectedModData) : null),
    [applyOverride, selectedModData],
  );

  return (
    <div className="w-full min-h-full flex flex-col">
      <Topbar>
        <div className="w-full max-w-2xl mx-auto flex items-center gap-2.5">
          <HomeFilterMenu
            provider={provider}
            onSelectProvider={handleSelectProvider}
            filter={filter}
            onSelectFilter={setFilter}
            engineFilter={engineFilter}
            onSelectEngine={setEngineFilter}
          />
          <div className="flex-1 min-w-0">
            <HomeSearchBar
              initialQuery={searchQuery}
              provider={provider}
              onSelectMod={handleOpenMod}
              onSearch={handleSearch}
            />
          </div>
        </div>
      </Topbar>

      <div className="w-full flex flex-col gap-6 p-4 sm:p-8">
        {!searchQuery && (
          <FeaturedModsSection
            items={resolvedFeaturedItems}
            isLoading={isFeaturedLoading}
            onSelectMod={handleOpenMod}
          />
        )}

        {provider === 'gamejolt' && Boolean(searchQuery) && (
          <div className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)]/30 text-xs text-[var(--md-sys-color-on-surface-variant)]">
            <span className="material-symbols-rounded text-base text-[var(--md-sys-color-primary)] shrink-0">
              info
            </span>
            <span>
              GameJolt search scopes queries with #fnf, though GameJolt&apos;s API does not enforce an FNF-only tag filter on search so some unrelated games may appear.
            </span>
          </div>
        )}

        <ModsGridSection
          searchQuery={searchQuery}
          items={resolvedModItems}
          isInitialLoading={isInitialLoading}
          isLoadingMore={isLoadingMore}
          hasMore={hasMore}
          isError={isError}
          onLoadMore={loadNextChunk}
          onRetry={reload}
          onSelectMod={handleOpenMod}
          isFavorite={isFavorite}
          onToggleFavorite={toggleFavorite}
          filter={filter}
        />

        {Boolean(resolvedSelectedModData) && (
          <Suspense fallback={null}>
            <ModDetailsModal
              selectedCard={resolvedSelectedModData}
              isOpen={Boolean(resolvedSelectedModData)}
              onClose={handleCloseModal}
            />
          </Suspense>
        )}
      </div>
    </div>
  );
};

export default HomeView;
