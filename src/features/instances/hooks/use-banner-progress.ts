import { useState, useEffect, useRef } from 'react'

export interface BannerProgressState {
  progress: number
  isScrolled: boolean
  rootRef: React.RefObject<HTMLDivElement | null>
  bannerRef: React.RefObject<HTMLElement | null>
}

export function useBannerProgress(): BannerProgressState {
  const [progress, setProgress] = useState(0)
  const [isScrolled, setIsScrolled] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const bannerRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = rootRef.current
    if (!el) return

    const findScrollParent = (node: HTMLElement | null): HTMLElement | null => {
      let current = node?.parentElement
      while (current) {
        const overflowHost = current as HTMLElement & { viewport?: HTMLElement }
        if (overflowHost.viewport) return overflowHost.viewport
        const computed = window.getComputedStyle(current)
        if (/(auto|scroll)/.test(computed.overflow + computed.overflowY)) {
          return current
        }
        current = current.parentElement
      }
      return null
    }

    const scrollContainer = findScrollParent(el)
    if (!scrollContainer) return

    let ticking = false
    const updateMetrics = () => {
      const currentY = scrollContainer.scrollTop
      const bannerEl = bannerRef.current
      const bannerHeight = bannerEl?.offsetHeight || 200
      const range = Math.max(bannerHeight, 60)
      const currentProgress = Math.min(1, Math.max(0, currentY / range))

      setProgress(currentProgress)
      setIsScrolled(currentProgress > 0.15)
      ticking = false
    }

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateMetrics)
        ticking = true
      }
    }

    window.requestAnimationFrame(updateMetrics)

    scrollContainer.addEventListener('scroll', onScroll, { passive: true })
    return () => scrollContainer.removeEventListener('scroll', onScroll)
  }, [])

  return {
    progress,
    isScrolled,
    rootRef,
    bannerRef,
  }
}
