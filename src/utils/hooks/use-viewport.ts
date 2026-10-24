import { useState, useEffect } from 'react'

/**
 * Tracks window dimensions and mobile/desktop breakpoints reactively.
 */
export function useViewport(breakpoint = 768) {
  const [size, setSize] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
  }))

  useEffect(() => {
    if (typeof window === 'undefined') return
    let rafId: number | null = null

    const handleResize = () => {
      if (rafId !== null) cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        setSize({
          width: window.innerWidth,
          height: window.innerHeight,
        })
      })
    }

    window.addEventListener('resize', handleResize, { passive: true })
    return () => {
      window.removeEventListener('resize', handleResize)
      if (rafId !== null) cancelAnimationFrame(rafId)
    }
  }, [])

  return {
    width: size.width,
    height: size.height,
    isMobile: size.width < breakpoint,
    isDesktop: size.width >= breakpoint,
  }
}
