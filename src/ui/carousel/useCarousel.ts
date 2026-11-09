import {
  useRef,
  useEffect,
  useCallback,
  useState,
  useMemo,
  useImperativeHandle,
  Children,
} from 'react'
import type { PointerEvent } from 'react'
import gsap from 'gsap'
import {
  applyCarouselLayouts,
  handleCarouselPointerDown,
  animateCarouselScroll,
  type CarouselDragState,
} from './carousel-pointer'
import type { CarouselProps, CarouselAPI } from './types'
import { isCapacitor } from '@/core/host'

export function useCarousel(props: CarouselProps) {
  const {
    children,
    isInfinite = false,
    isAuto = false,
    autoInterval = 3000,
    onItemClick,
    onIndexChange,
    apiRef,
    isMobile: isMobileProp,
  } = props

  const containerRef = useRef<HTMLDivElement>(null)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const visualRefs = useRef<(HTMLDivElement | null)[]>([])

  const checkIsMobile = useCallback((): boolean => {
    if (isMobileProp !== undefined) return isMobileProp
    if (typeof window === 'undefined') return false
    if (isCapacitor()) return true
    return window.innerWidth < 768
  }, [isMobileProp])

  const dragState = useRef<CarouselDragState>({
    isDown: false,
    startX: 0,
    scrollLeft: 0,
    isAnimating: false,
    direction: 1,
    hasDragged: false,
  })

  const childrenArray = Children.toArray(children)
  let visualChildren = [...childrenArray]

  if (isInfinite && visualChildren.length > 0 && visualChildren.length < 5) {
    const setsNeeded = Math.ceil(5 / childrenArray.length)
    for (let s = 1; s < setsNeeded; s++) {
      visualChildren = [...visualChildren, ...childrenArray]
    }
  }
  const totalItems = visualChildren.length
  const dummyCount = isInfinite ? 50 : totalItems

  const handleInfiniteScrollWrap = useCallback(() => {
    const scroller = scrollerRef.current
    if (!scroller || !isInfinite || scroller.clientWidth === 0) return

    const shiftDist = scroller.clientWidth
    const p = scroller.scrollLeft / shiftDist

    if (p > 40) {
      scroller.scrollLeft -= totalItems * shiftDist
    } else if (p < 10) {
      scroller.scrollLeft += totalItems * shiftDist
    }
  }, [isInfinite, totalItems])

  const [activeIndex, setActiveIndex] = useState(0)
  const activeIndexRef = useRef(0)
  const autoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const progressTweenRef = useRef<gsap.core.Tween | null>(null)
  const progressRefs = useRef<(HTMLDivElement | null)[]>([])

  const exactIndexRef = useRef(0)
  const lastClientWidthRef = useRef(0)
  const playAutoRef = useRef<() => void>(() => {})

  const updateVisuals = useCallback(() => {
    const scroller = scrollerRef.current
    if (!scroller || scroller.clientWidth === 0 || totalItems === 0) return

    const currentWidth = scroller.clientWidth
    const baseMultiple =
      isInfinite && totalItems > 0
        ? Math.floor(25 / totalItems) * totalItems
        : 0

    if (
      lastClientWidthRef.current > 0 &&
      currentWidth !== lastClientWidthRef.current &&
      !dragState.current.isDown &&
      !dragState.current.isAnimating
    ) {
      const targetContinuous = baseMultiple + activeIndexRef.current
      scroller.scrollLeft = targetContinuous * currentWidth
      exactIndexRef.current = targetContinuous
    }
    lastClientWidthRef.current = currentWidth

    const scrollPos = scroller.scrollLeft
    const progress = scrollPos / currentWidth
    const isMobile = checkIsMobile()

    applyCarouselLayouts({
      totalItems,
      progress,
      isInfinite,
      isMobile,
      visualRefs: visualRefs.current,
    })

    const currentIndex = Math.round(progress)
    exactIndexRef.current = currentIndex
    const currentLogicalIndex =
      ((currentIndex % totalItems) + totalItems) % totalItems
    const originalIndex = currentLogicalIndex % childrenArray.length

    if (activeIndexRef.current !== originalIndex) {
      activeIndexRef.current = originalIndex
      setActiveIndex(originalIndex)

      if (
        !dragState.current.isAnimating &&
        !dragState.current.isDown &&
        isAuto
      ) {
        setTimeout(() => playAutoRef.current(), 0)
      }
    }
  }, [isInfinite, totalItems, childrenArray.length, isAuto, checkIsMobile])

  const pauseAuto = useCallback(() => {
    if (autoTimerRef.current) {
      clearTimeout(autoTimerRef.current)
      autoTimerRef.current = null
    }
    if (progressTweenRef.current) {
      progressTweenRef.current.kill()
      progressTweenRef.current = null
    }
  }, [])

  const smoothScrollToIndex = useCallback(
    (targetIndex: number, duration: number = 0.6) => {
      animateCarouselScroll({
        scroller: scrollerRef.current,
        targetIndex,
        duration,
        isInfinite,
        dragState: dragState.current,
        pauseAuto,
        updateVisuals,
        handleInfiniteScrollWrap,
        playAuto: () => playAutoRef.current(),
      })
    },
    [isInfinite, updateVisuals, handleInfiniteScrollWrap, pauseAuto],
  )

  const playAuto = useCallback(() => {
    if (!isAuto) return
    pauseAuto()

    progressRefs.current.forEach((bar, i) => {
      if (bar && i !== activeIndexRef.current) {
        gsap.set(bar, { scaleX: 0 })
      }
    })

    const activeBar = progressRefs.current[activeIndexRef.current]
    if (activeBar) {
      progressTweenRef.current = gsap.fromTo(
        activeBar,
        { scaleX: 0 },
        { scaleX: 1, duration: autoInterval / 1000, ease: 'none' },
      )
    }

    autoTimerRef.current = setTimeout(() => {
      const scroller = scrollerRef.current
      if (!scroller) return

      if (!isInfinite) {
        const maxScroll = scroller.scrollWidth - scroller.clientWidth
        if (scroller.scrollLeft >= maxScroll - 5) {
          dragState.current.direction = -1
        } else if (scroller.scrollLeft <= 5) {
          dragState.current.direction = 1
        }
      }

      const currentIndexFloat = scroller.scrollLeft / scroller.clientWidth
      const targetIndex =
        Math.round(currentIndexFloat) + dragState.current.direction
      smoothScrollToIndex(targetIndex)
    }, autoInterval)
  }, [isAuto, isInfinite, autoInterval, smoothScrollToIndex, pauseAuto])

  useEffect(() => {
    playAutoRef.current = playAuto
  }, [playAuto])

  const prev = useCallback(() => {
    const scroller = scrollerRef.current
    if (!scroller || scroller.clientWidth === 0) return
    pauseAuto()
    dragState.current.hasDragged = false
    const currentIndexFloat = scroller.scrollLeft / scroller.clientWidth
    smoothScrollToIndex(Math.round(currentIndexFloat) - 1, 0.45)
  }, [smoothScrollToIndex, pauseAuto])

  const next = useCallback(() => {
    const scroller = scrollerRef.current
    if (!scroller || scroller.clientWidth === 0) return
    pauseAuto()
    dragState.current.hasDragged = false
    const currentIndexFloat = scroller.scrollLeft / scroller.clientWidth
    smoothScrollToIndex(Math.round(currentIndexFloat) + 1, 0.45)
  }, [smoothScrollToIndex, pauseAuto])

  const goToLogicalIndex = useCallback(
    (targetUniqueIndex: number) => {
      if (dragState.current.isDown || dragState.current.hasDragged) return

      const scroller = scrollerRef.current
      if (!scroller || scroller.clientWidth === 0 || totalItems === 0) return

      const currentIndexFloat = scroller.scrollLeft / scroller.clientWidth
      const currentIndex = Math.round(currentIndexFloat)
      const currentLogicalIndex =
        ((currentIndex % totalItems) + totalItems) % totalItems
      const currentUniqueIndex = currentLogicalIndex % childrenArray.length

      let diff = targetUniqueIndex - currentUniqueIndex
      if (diff === 0) {
        if (onItemClick) onItemClick(targetUniqueIndex)
        return
      }

      if (isInfinite) {
        const uniqueCount = childrenArray.length
        if (diff > uniqueCount / 2) diff -= uniqueCount
        if (diff < -uniqueCount / 2) diff += uniqueCount
      }

      smoothScrollToIndex(currentIndex + diff, 0.6)
    },
    [
      isInfinite,
      totalItems,
      childrenArray.length,
      smoothScrollToIndex,
      onItemClick,
    ],
  )

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    handleCarouselPointerDown({
      e,
      scroller: scrollerRef.current,
      dragState: dragState.current,
      isInfinite,
      pauseAuto,
      updateVisuals,
      handleInfiniteScrollWrap,
      smoothScrollToIndex,
      playAuto,
    })
  }

  const onScroll = () => {
    if (dragState.current.isDown || dragState.current.isAnimating) return
    if (
      isInfinite &&
      scrollerRef.current &&
      scrollerRef.current.clientWidth > 0
    ) {
      handleInfiniteScrollWrap()
    }
    updateVisuals()
  }

  const onTouchEnd = () => {
    playAuto()
  }

  useEffect(() => {
    playAuto()
    return () => pauseAuto()
  }, [playAuto, pauseAuto])

  const api: CarouselAPI = useMemo(
    () => ({
      activeIndex,
      totalItems: childrenArray.length,
      goToLogicalIndex,
      prev,
      next,
      bindProgressRef: (index: number) => (el: HTMLDivElement | null) => {
        progressRefs.current[index] = el
      },
    }),
    [activeIndex, childrenArray.length, goToLogicalIndex, prev, next],
  )

  useEffect(() => {
    onIndexChange?.(activeIndex)
  }, [activeIndex, onIndexChange])

  useImperativeHandle(apiRef, () => api, [api])

  return {
    containerRef,
    scrollerRef,
    visualRefs,
    visualChildren,
    childrenArray,
    dummyCount,
    api,
    onPointerDown,
    onScroll,
    onTouchEnd,
    updateVisuals,
    dragState,
    totalItems,
    exactIndexRef,
    activeIndexRef,
  }
}
