import React, { useState, useRef, useEffect } from 'react'
import { Topbar } from '@/ui/topbar'
import { useTwitterNews } from './hooks/use-twitter-news'
import {
  NewsFilterChips,
  NewsMasonryGrid,
  NewsMediaModal,
} from './components'

export const NewsView: React.FC = () => {
  const {
    posts,
    sources,
    availableSources,
    selectedAccount,
    isLoading,
    isRefreshing,
    isLoadingMore,
    hasMore,
    error,
    setSelectedAccount,
    reload,
    loadMore,
    openExternal,
  } = useTwitterNews()

  const [selectedMedia, setSelectedMedia] = useState<{
    type: 'image' | 'video'
    url: string
    videoSources?: string[]
  } | null>(null)

  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!hasMore || isLoadingMore) return
    const el = sentinelRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void loadMore()
        }
      },
      { rootMargin: '600px' },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, isLoadingMore, loadMore])

  return (
    <div className="w-full min-h-full flex flex-col">
      <Topbar
        title="News"
        subtitle="Latest updates and announcements from the FNF community"
        trailing={
          <div className="flex items-center gap-2">
            <m3e-icon-button
              onClick={() => void reload()}
              title="Refresh feeds"
              style={{ cursor: 'pointer' }}
            >
              <span
                className={`material-symbols-rounded text-xl leading-none transition-transform ${
                  isRefreshing || isLoading ? 'animate-spin' : ''
                }`}
              >
                refresh
              </span>
            </m3e-icon-button>
          </div>
        }
      />

      <div className="w-full max-w-7xl mx-auto flex flex-col gap-5 p-4 sm:p-6 lg:p-8">
        {/* Account Filter Chips */}
        <NewsFilterChips
          sources={sources}
          selectedAccount={selectedAccount}
          availableSources={availableSources}
          onSelectAccount={setSelectedAccount}
        />

        {/* Loading Skeleton */}
        {isLoading && posts.length === 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-pulse">
            {[260, 380, 220, 340, 300, 240, 360, 280].map((height, idx) => (
              <div
                key={`news-skeleton-${idx}`}
                style={{ height: `${height}px` }}
                className="rounded-[22px] bg-[var(--md-sys-color-surface-container-low)] border border-[var(--md-sys-color-outline-variant)] opacity-50"
              />
            ))}
          </div>
        )}

        {/* Error State */}
        {!isLoading && error && posts.length === 0 && (
          <div className="flex flex-col items-center justify-center p-8 rounded-[24px] border border-dashed text-center min-h-[260px] border-[var(--md-sys-color-outline-variant)]">
            <span className="material-symbols-rounded text-4xl mb-2 text-rose-500 opacity-80">
              error_outline
            </span>
            <h2 className="text-base font-semibold text-[var(--md-sys-color-on-surface)]">
              Unable to load news feeds
            </h2>
            <p className="text-xs text-[var(--md-sys-color-on-surface-variant)] mt-1 max-w-sm">
              {error}
            </p>
            <div className="mt-4">
              <m3e-button
                onClick={() => void reload()}
                style={{ cursor: 'pointer' }}
              >
                <span slot="leading-icon" className="material-symbols-rounded text-base">
                  refresh
                </span>
                Try again
              </m3e-button>
            </div>
          </div>
        )}

        {/* Posts Pinterest Masonry Grid */}
        {posts.length > 0 && (
          <NewsMasonryGrid
            posts={posts}
            onOpenExternal={openExternal}
            onSelectMedia={setSelectedMedia}
          />
        )}

        {/* Empty Filter State */}
        {!isLoading && posts.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center p-8 rounded-[24px] border border-dashed text-center min-h-[240px] border-[var(--md-sys-color-outline-variant)]">
            <span className="material-symbols-rounded text-4xl mb-2 opacity-50 text-[var(--md-sys-color-on-surface-variant)]">
              feed
            </span>
            <h2 className="text-base font-semibold text-[var(--md-sys-color-on-surface)]">
              No posts found
            </h2>
            <p className="text-xs text-[var(--md-sys-color-on-surface-variant)] mt-1">
              {selectedAccount
                ? `No posts available for @${selectedAccount}.`
                : 'No posts available right now.'}
            </p>
          </div>
        )}

        {/* Infinite Scroll Automatic Trigger Sentinel */}
        {hasMore && posts.length > 0 && (
          <div
            ref={sentinelRef}
            className="w-full flex items-center justify-center py-6 min-h-[64px]"
          >
            <m3e-circular-progress-indicator
              indeterminate
              style={
                {
                  '--m3e-progress-indicator-color': 'var(--md-sys-color-primary)',
                  width: '36px',
                  height: '36px',
                } as React.CSSProperties
              }
            />
          </div>
        )}
      </div>

      {/* Media Lightbox / Video Modal */}
      <NewsMediaModal
        media={selectedMedia}
        onClose={() => setSelectedMedia(null)}
      />
    </div>
  )
}

export default NewsView
