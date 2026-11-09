import React from 'react'
import { Title } from '@/ui/title'
import type { ModItem } from '@/ui/mod-details-modal'
import { useInfiniteScroll } from '@/utils'
import type { ModFilter } from '@/services/gamebanana'
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
  filter?: ModFilter
}

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
  filter = 'ripe',
}) => {
  const sentinelRef = useInfiniteScroll({
    hasMore,
    isLoading: isLoadingMore || isInitialLoading,
    onLoadMore,
    rootMargin: '800px',
  })

  const getSectionTitle = () => {
    if (searchQuery) return `Search Results for "${searchQuery}"`
    switch (filter) {
      case 'ripe':
        return 'Popular - Most Liked Mods'
      case 'popular':
        return 'Trending Mods'
      case 'new':
        return 'Newest Releases'
      case 'updated':
        return 'Recently Updated Mods'
      default:
        return 'Mods'
    }
  }

  return (
    <>
      <Title title={getSectionTitle()} align="left" />

      {isInitialLoading && items.length === 0 ? (
        <ModsGridSkeleton count={8} className="pb-12" />
      ) : items.length === 0 ? (
        <ModsEmptyState searchQuery={searchQuery} />
      ) : (
        <div className="flex flex-col w-full pb-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3.5 sm:gap-4.5 lg:gap-5 w-full">
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

          {isLoadingMore && (
            <div style={{ overflowAnchor: 'none' }}>
              <ModsGridSkeleton count={5} className="mt-4" />
            </div>
          )}

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
