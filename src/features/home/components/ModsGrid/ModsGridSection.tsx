import React, { useRef } from 'react'
import { Title } from '@/ui/title'
import type { ModItem } from '@/ui/mod-details-modal'
import { useInfiniteScroll } from '@/utils'
import { ModsGridSkeleton } from './ModsGridSkeleton'
import { ModsEmptyState } from './ModsEmptyState'
import { ModsPaginationFooter } from './ModsPaginationFooter'
import { ModGridCard } from './ModGridCard'

export interface ModsGridSectionProps {
  searchQuery: string
  items: ModItem[]
  isInitialLoading: boolean
  isLoadingMore: boolean
  hasMore: boolean
  onLoadMore: () => void
  onSelectMod: (mod: ModItem) => void
  isFavorite: (id: number | string) => boolean
  onToggleFavorite: (id: number | string) => void
}

/**
 * Displays the popular/search mods grid section with infinite scroll pagination.
 */
export const ModsGridSection: React.FC<ModsGridSectionProps> = ({
  searchQuery,
  items,
  isInitialLoading,
  isLoadingMore,
  hasMore,
  onLoadMore,
  onSelectMod,
  isFavorite,
  onToggleFavorite,
}) => {
  const sentinelRef = useRef<HTMLDivElement>(null)

  useInfiniteScroll({
    sentinelRef,
    hasMore,
    onLoadMore,
  })

  return (
    <>
      <Title
        title={
          searchQuery
            ? `Search Results for "${searchQuery}"`
            : 'Popular - Most Liked Mods'
        }
        align="left"
      />

      {isInitialLoading && items.length === 0 ? (
        <ModsGridSkeleton count={8} className="pb-12" />
      ) : items.length === 0 ? (
        <ModsEmptyState searchQuery={searchQuery} />
      ) : (
        <div className="flex flex-col w-full pb-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-4 w-full">
            {items.map((mod) => (
              <ModGridCard
                key={`ripe-card-${mod.id}`}
                mod={mod}
                isFavorite={isFavorite(mod.id)}
                onSelect={onSelectMod}
                onToggleFavorite={onToggleFavorite}
              />
            ))}
          </div>

          {isLoadingMore && <ModsGridSkeleton count={4} className="mt-4" />}

          <ModsPaginationFooter
            sentinelRef={sentinelRef}
            isLoadingMore={isLoadingMore}
            hasMore={hasMore}
          />
        </div>
      )}
    </>
  )
}
