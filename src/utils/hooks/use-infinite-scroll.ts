import { useCallback, useEffect, useRef, useState } from 'react'

export interface UseInfiniteScrollOptions {
  hasMore: boolean
  isLoading?: boolean
  onLoadMore: () => void
  rootMargin?: string
}

const USER_INTENT_EVENTS = ['wheel', 'touchmove', 'keydown', 'pointerdown'] as const

const isElementVisible = (el: HTMLElement | null): boolean => {
  if (!el || !el.isConnected) return false
  if (el.offsetParent === null && el.getClientRects().length === 0) return false
  return true
}

export function useInfiniteScroll({
  hasMore,
  isLoading = false,
  onLoadMore,
  rootMargin = '600px',
}: UseInfiniteScrollOptions): (node: HTMLElement | null) => void {
  const [sentinel, setSentinel] = useState<HTMLElement | null>(null)
  const [armed, setArmed] = useState(true)
  const onLoadMoreRef = useRef(onLoadMore)
  const sentinelRef = useRef<HTMLElement | null>(null)
  sentinelRef.current = sentinel

  useEffect(() => {
    onLoadMoreRef.current = onLoadMore
  }, [onLoadMore])

  useEffect(() => {
    if (armed) return
    const rearm = () => {
      if (isElementVisible(sentinelRef.current)) {
        setArmed(true)
      }
    }
    for (const evt of USER_INTENT_EVENTS) {
      window.addEventListener(evt, rearm, { capture: true, passive: true, once: true })
    }
    return () => {
      for (const evt of USER_INTENT_EVENTS) {
        window.removeEventListener(evt, rearm, { capture: true })
      }
    }
  }, [armed])

  useEffect(() => {
    if (!sentinel || !hasMore || isLoading || !armed) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          if (!isElementVisible(sentinel)) return
          observer.disconnect()
          setArmed(false)
          onLoadMoreRef.current()
        }
      },
      { root: null, rootMargin, threshold: 0 },
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [sentinel, hasMore, isLoading, armed, rootMargin])

  return useCallback((node: HTMLElement | null) => setSentinel(node), [])
}
