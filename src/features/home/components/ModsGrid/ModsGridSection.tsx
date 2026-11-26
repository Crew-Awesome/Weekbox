import React, { useEffect, useMemo, useState } from 'react'
import { Title } from '@/ui/title/Title'
import type { ModItem } from '@/ui/mod-details-modal/types'
import { useInfiniteScroll } from '@/utils'
import type { ModFilter } from '@/services/gamebanana'
import { ModsGridSkeleton } from './ModsGridSkeleton'
import { ModsEmptyState } from './ModsEmptyState'
import { ModsPaginationFooter } from './ModsPaginationFooter'
import { ModGridCard } from './ModGridCard'

const INITIAL_RENDER_BATCH = 12
const INCREMENTAL_RENDER_BATCH = 8

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
  isError?: boolean
  onRetry?: () => void
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
  isError = false,
  onRetry,
}) => {
  const listKey = `${searchQuery}:${filter}:${items[0]?.id ?? ''}`
  const [renderedState, setRenderedState] = useState<{
    listKey: string
    count: number
  }>(() => ({
    listKey,
    count: INITIAL_RENDER_BATCH,
  }))

  const effectiveVisibleCount =
    renderedState.listKey === listKey
      ? Math.min(items.length, renderedState.count)
      : Math.min(items.length, INITIAL_RENDER_BATCH)

  useEffect(() => {
    if (effectiveVisibleCount >= items.length) return
    const nextCount = Math.min(
      items.length,
      effectiveVisibleCount + INCREMENTAL_RENDER_BATCH,
    )
    if (typeof window.requestAnimationFrame === 'function') {
      const rafId = window.requestAnimationFrame(() => {
        setRenderedState({ listKey, count: nextCount })
      })
      return () => window.cancelAnimationFrame(rafId)
    }
    const timer = window.setTimeout(() => {
      setRenderedState({ listKey, count: nextCount })
    }, 0)
    return () => window.clearTimeout(timer)
  }, [effectiveVisibleCount, items.length, listKey])

  const visibleItems = useMemo(
    () => items.slice(0, effectiveVisibleCount),
    [items, effectiveVisibleCount],
  )

  const sentinelRef = useInfiniteScroll({
    hasMore,
    isLoading:
      isLoadingMore ||
      isInitialLoading ||
      effectiveVisibleCount < items.length,
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
        <ModsEmptyState
          searchQuery={searchQuery}
          isError={isError}
          onRetry={onRetry}
        />
      ) : (
        <div className="flex flex-col w-full pb-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3.5 sm:gap-4.5 lg:gap-5 w-full">
            {visibleItems.map((mod) => (
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
