import { useRef, useState, useEffect, useCallback } from 'react'
import gsap from 'gsap'
import {
  extractColor,
  useExtractColor,
  getFallbackHoverColor,
} from '../extract-color'

export interface UseSurfaceHoverColorOptions {
  imageUrl?: string
  enableExtractColor?: boolean
  lazyLoad?: boolean
  animateThumbnail?: boolean
}

/**
 * Manages GSAP hover expansion and dynamic dominant color extraction for surface cards.
 */
export function useSurfaceHoverColor({
  imageUrl,
  enableExtractColor = false,
  lazyLoad = false,
  animateThumbnail = false,
}: UseSurfaceHoverColorOptions) {
  const rootRef = useRef<HTMLDivElement>(null)
  const thumbnailRef = useRef<HTMLDivElement>(null)
  const hoverBgRef = useRef<HTMLDivElement>(null)
  const notchOverlayRef = useRef<HTMLDivElement>(null)
  const notchSvg1Ref = useRef<SVGSVGElement>(null)
  const notchSvg2Ref = useRef<SVGSVGElement>(null)

  const [extractedColor, setExtractedColor] = useState<string | null>(null)
  const isHoveredRef = useRef(false)
  const [isInView, setIsInView] = useState(!lazyLoad)
  const { isExtractActive } = useExtractColor()

  const shouldExtract = Boolean(
    isInView && enableExtractColor && isExtractActive && imageUrl,
  )
  const hoverColor = shouldExtract ? extractedColor : null

  useEffect(() => {
    if (!lazyLoad) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsInView(true)
          observer.disconnect()
        }
      },
      { rootMargin: '400px' },
    )
    if (rootRef.current) observer.observe(rootRef.current)
    return () => observer.disconnect()
  }, [lazyLoad])

  const getDefaultHoverColor = useCallback(() => {
    if (typeof window === 'undefined') return 'var(--wb-card-hover-bg)'
    const style = getComputedStyle(rootRef.current || document.documentElement)
    const val =
      style.getPropertyValue('--wb-card-hover-bg').trim() ||
      style.getPropertyValue('--wb-card-hover-default').trim() ||
      style.getPropertyValue('--md-sys-color-surface-container-high').trim()
    return val || getFallbackHoverColor()
  }, [])

  useEffect(() => {
    let isMounted = true
    if (shouldExtract && imageUrl) {
      extractColor(imageUrl, 0.15)
        .then((color: string | null) => {
          if (isMounted) {
            setExtractedColor(color || null)
          }
        })
        .catch(console.error)
    }
    return () => {
      isMounted = false
    }
  }, [shouldExtract, imageUrl])

  useEffect(() => {
    const hoverBgEl = hoverBgRef.current
    const thumbnailEl = thumbnailRef.current

    if (hoverBgEl) {
      gsap.set(hoverBgEl, {
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        opacity: 0,
      })
    }

    return () => {
      if (hoverBgEl) gsap.killTweensOf(hoverBgEl)
      if (thumbnailEl) gsap.killTweensOf(thumbnailEl)
    }
  }, [])

  useEffect(() => {
    if (isHoveredRef.current && hoverColor && hoverBgRef.current) {
      hoverBgRef.current.style.backgroundColor = hoverColor
    }
  }, [hoverColor])

  const handleMouseEnter = useCallback(() => {
    if (window.matchMedia('(hover: none)').matches) return
    isHoveredRef.current = true

    if (thumbnailRef.current && animateThumbnail) {
      gsap.killTweensOf(thumbnailRef.current)
      gsap.to(thumbnailRef.current, {
        scale: 1.05,
        duration: 0.35,
        ease: 'power2.out',
        overwrite: true,
      })
    }

    const finalColor = hoverColor || getDefaultHoverColor()
    if (hoverBgRef.current) {
      hoverBgRef.current.style.backgroundColor = finalColor
      gsap.killTweensOf(hoverBgRef.current)
      gsap.to(hoverBgRef.current, {
        opacity: 1,
        duration: 0.25,
        ease: 'power2.out',
        overwrite: true,
      })
    }
  }, [hoverColor, getDefaultHoverColor, animateThumbnail])

  const handleMouseLeave = useCallback(() => {
    if (window.matchMedia('(hover: none)').matches) return
    isHoveredRef.current = false

    if (thumbnailRef.current && animateThumbnail) {
      gsap.killTweensOf(thumbnailRef.current)
      gsap.to(thumbnailRef.current, {
        scale: 1,
        duration: 0.2,
        ease: 'power2.out',
        overwrite: true,
      })
    }

    if (hoverBgRef.current) {
      gsap.killTweensOf(hoverBgRef.current)
      gsap.to(hoverBgRef.current, {
        opacity: 0,
        duration: 0.25,
        ease: 'power2.out',
        overwrite: true,
      })
    }
  }, [animateThumbnail])

  return {
    rootRef,
    thumbnailRef,
    hoverBgRef,
    notchOverlayRef,
    notchSvg1Ref,
    notchSvg2Ref,
    handleMouseEnter,
    handleMouseLeave,
  }
}
