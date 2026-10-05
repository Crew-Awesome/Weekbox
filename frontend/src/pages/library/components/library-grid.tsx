import React from "react";
import Components from "@components";
const Shared = Components;
import { DownloadingModCard } from "./downloading-mod-card";
import { LibraryModCard } from "./library-mod-card";
import { LibraryEmptyState } from "./library-empty-state";

export interface LibraryGridProps {
  isLoading: boolean;
  installedMods: any[];
  activeFileIds: string[];
  displayedDownloadingFileIds: string[];
  filteredMods: any[];
  favorites: Record<string, any>;
  totalFavoritesCount: number;
  showFavoritesOnly: boolean;
  searchQuery: string;
  onCardClick: (card: any) => void;
}

/**
 * Main content area for the Library page.
 * Handles loading spinner, empty states (empty library, empty favorites, no search matches),
 * and the responsive grid of downloading and installed mod cards.
 */
export const LibraryGrid: React.FC<LibraryGridProps> = ({
  isLoading,
  installedMods,
  activeFileIds,
  displayedDownloadingFileIds,
  filteredMods,
  favorites,
  totalFavoritesCount,
  showFavoritesOnly,
  searchQuery,
  onCardClick,
}) => {
  const hasItemsToDisplay =
    (!isLoading &&
      (filteredMods.length > 0 ||
        (!showFavoritesOnly && installedMods.length > 0) ||
        displayedDownloadingFileIds.length > 0)) ||
    displayedDownloadingFileIds.length > 0;

  return (
    <>
      {isLoading && installedMods.length === 0 && activeFileIds.length === 0 && (
        <Shared.atoms.LoadingContent text="library" size="lg" />
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
              onCardClick={onCardClick}
            />
          ))}

          {filteredMods.map((item) => (
            <LibraryModCard
              key={`lib-mod-${item.id}`}
              item={item}
              isFavorite={Boolean(favorites[String(item.id)])}
              onCardClick={onCardClick}
            />
          ))}
        </div>
      )}
    </>
  );
};
