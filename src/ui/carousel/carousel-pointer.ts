import type { PointerEvent } from 'react'
import gsap from 'gsap'
import { calculateVisuals } from './carouselMath'

export interface CarouselDragState {
  isDown: boolean
  startX: number
  scrollLeft: number
  isAnimating: boolean
  direction: number
  hasDragged: boolean
}

export function applyCarouselLayouts(params: {
  totalItems: number
  progress: number
  isInfinite: boolean
  isMobile: boolean
  visualRefs: (HTMLDivElement | null)[]
}): void {
  const { totalItems, progress, isInfinite, isMobile, visualRefs } = params
  const layouts = calculateVisuals(totalItems, progress, !isInfinite, isMobile)

  layouts.forEach((layout, index) => {
    const item = visualRefs[index]
    if (!item) return

    item.style.width = `${layout.w.toFixed(2)}%`
    item.style.left = `${layout.x.toFixed(2)}%`
    item.style.transform = 'translateZ(0)'
    item.style.zIndex = layout.w > 40 ? '10' : '1'

    if (layout.display === 'none') {
      item.style.visibility = 'hidden'
    } else {
      item.style.visibility = 'visible'
      const content = item.querySelector('.m3-card-content') as HTMLElement | null
      const badge = item.querySelector('.m3-card-badge') as HTMLElement | null

      const opacity = isMobile
        ? Math.max(0, (layout.w - 20) / 70).toFixed(2)
        : Math.max(0, (layout.w - 15) / 65).toFixed(2)
      if (content) content.style.opacity = opacity
      if (badge) badge.style.opacity = opacity
    }
  })
}

export function handleCarouselPointerDown(params: {
  e: PointerEvent<HTMLDivElement>
  scroller: HTMLDivElement | null
  dragState: CarouselDragState
  isInfinite: boolean
  pauseAuto: () => void
  updateVisuals: () => void
  handleInfiniteScrollWrap: () => void
  smoothScrollToIndex: (targetIndex: number, duration?: number) => void
  playAuto: () => void
}): void {
  const {
    e,
    scroller,
    dragState,
    isInfinite,
    pauseAuto,
    updateVisuals,
    handleInfiniteScrollWrap,
    smoothScrollToIndex,
    playAuto,
  } = params

  if (!scroller) return

  pauseAuto()
  dragState.isDown = true
  dragState.hasDragged = false

  if (dragState.isAnimating) {
    dragState.isAnimating = false
    gsap.killTweensOf(scroller)
    scroller.style.scrollSnapType = ''
  }

  dragState.startX = e.pageX
  const startY = e.pageY
  dragState.scrollLeft = scroller.scrollLeft

  let isHorizontalSwipe: boolean | null = null

  const onPointerMove = (moveEvent: globalThis.PointerEvent) => {
    if (!dragState.isDown) return

    const dx = Math.abs(moveEvent.pageX - dragState.startX)
    const dy = Math.abs(moveEvent.pageY - startY)

    if (dx > 5 || dy > 5) {
      dragState.hasDragged = true
    }

    if (isHorizontalSwipe === null && (dx > 5 || dy > 5)) {
      isHorizontalSwipe = dx > dy
    }

    if (isHorizontalSwipe) {
      if (moveEvent.cancelable) {
        moveEvent.preventDefault()
      }
      const walk = (dragState.startX - moveEvent.pageX) * 1.5
      scroller.scrollLeft = dragState.scrollLeft + walk
      updateVisuals()
    }
  }

  const onPointerUp = (upEvent: globalThis.PointerEvent) => {
    if (!dragState.isDown) return
    dragState.isDown = false

    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
    window.removeEventListener('pointercancel', onPointerUp)

    if (isInfinite) {
      handleInfiniteScrollWrap()
    }

    const dx = dragState.startX - upEvent.pageX
    const currentIndexFloat = scroller.scrollLeft / scroller.clientWidth

    let snapIndex = Math.round(currentIndexFloat)
    const startIndex = Math.round(dragState.scrollLeft / scroller.clientWidth)

    if (isHorizontalSwipe) {
      if (dx > 40) snapIndex = Math.max(startIndex + 1, Math.round(currentIndexFloat))
      else if (dx < -40) snapIndex = Math.min(startIndex - 1, Math.round(currentIndexFloat))
      else snapIndex = startIndex
    }

    setTimeout(() => {
      dragState.hasDragged = false
    }, 50)

    if (Math.abs(snapIndex - currentIndexFloat) > 0.001) {
      smoothScrollToIndex(snapIndex, 0.4)
    } else {
      playAuto()
    }
  }

  window.addEventListener('pointermove', onPointerMove, { passive: false })
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('pointercancel', onPointerUp)
}

export function animateCarouselScroll(params: {
  scroller: HTMLDivElement | null
  targetIndex: number
  duration: number
  isInfinite: boolean
  dragState: CarouselDragState
  pauseAuto: () => void
  updateVisuals: () => void
  handleInfiniteScrollWrap: () => void
  playAuto: () => void
}): void {
  const {
    scroller,
    targetIndex,
    duration,
    isInfinite,
    dragState,
    pauseAuto,
    updateVisuals,
    handleInfiniteScrollWrap,
    playAuto,
  } = params

  if (!scroller) return

  pauseAuto()
  dragState.isAnimating = true
  scroller.style.scrollSnapType = 'none'

  const targetScrollLeft = targetIndex * scroller.clientWidth
  const proxy = { x: scroller.scrollLeft }

  gsap.to(proxy, {
    x: targetScrollLeft,
    duration,
    ease: 'power3.inOut',
    onUpdate: () => {
      scroller.scrollLeft = proxy.x
      updateVisuals()
    },
    onComplete: () => {
      dragState.isAnimating = false
      scroller.style.scrollSnapType = ''

      if (isInfinite) {
        handleInfiniteScrollWrap()
        updateVisuals()
      }
      if (!dragState.isDown) {
        playAuto()
      }
    },
  })
}
