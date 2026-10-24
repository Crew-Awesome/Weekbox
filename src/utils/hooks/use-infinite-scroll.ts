import { useEffect, type RefObject } from 'react'
import { findScrollableParent } from '../scroll'

export interface UseInfiniteScrollOptions {
  sentinelRef: RefObject<HTMLElement | null>
  hasMore: boolean
  onLoadMore: () => void
  rootMargin?: string
  scrollThresholdPx?: number
}

/**
 * Observes a sentinel element via IntersectionObserver and attaches a fallback scroll listener
 * on the nearest scrollable parent / `m3e-overflow` viewport to trigger infinite pagination.
 */
export function useInfiniteScroll({
  sentinelRef,
  hasMore,
  onLoadMore,
  rootMargin = '600px',
  scrollThresholdPx = 650,
}: UseInfiniteScrollOptions): void {
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || !hasMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          onLoadMore()
        }
      },
      {
        rootMargin,
        threshold: 0.05,
      },
    )

    observer.observe(sentinel)

    const scrollContainer = findScrollableParent(sentinel)
    let ticking = false

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (!scrollContainer) return
          const { scrollTop, clientHeight, scrollHeight } = scrollContainer
          if (scrollTop + clientHeight >= scrollHeight - scrollThresholdPx) {
            onLoadMore()
          }
          ticking = false
        })
        ticking = true
      }
    }

    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll, { passive: true })
    }

    return () => {
      observer.disconnect()
      scrollContainer?.removeEventListener('scroll', handleScroll)
    }
  }, [sentinelRef, hasMore, onLoadMore, rootMargin, scrollThresholdPx])
}
