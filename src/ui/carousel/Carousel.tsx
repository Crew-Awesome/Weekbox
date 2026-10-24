import React, { useLayoutEffect } from 'react'
import type { CarouselProps } from './types'
import { useCarousel } from './useCarousel'

/**
 * Material 3 multi-browse hero carousel with continuous scroll and GSAP auto-play.
 */
export const Carousel: React.FC<CarouselProps> = (props) => {
  const {
    className = '',
    aspectRatio,
    renderIndicators,
    isAuto = false,
    isInfinite = false,
    style,
  } = props

  const {
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
  } = useCarousel(props)

  useLayoutEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return

    let lastClientWidth = scroller.clientWidth

    if (isInfinite && totalItems > 0 && lastClientWidth > 0) {
      const middlePadding = Math.floor(25 / totalItems) * totalItems
      const targetContinuous = middlePadding + activeIndexRef.current
      scroller.scrollLeft = targetContinuous * lastClientWidth
      exactIndexRef.current = targetContinuous
    }
    updateVisuals()

    const handleResize = () => {
      if (
        !scroller ||
        scroller.clientWidth === 0 ||
        dragState.current.isAnimating ||
        dragState.current.isDown
      )
        return

      const baseMultiple =
        isInfinite && totalItems > 0
          ? Math.floor(25 / totalItems) * totalItems
          : 0
      const targetContinuous = baseMultiple + activeIndexRef.current
      scroller.scrollLeft = targetContinuous * scroller.clientWidth
      exactIndexRef.current = targetContinuous

      lastClientWidth = scroller.clientWidth
      updateVisuals()
    }

    const observer = new ResizeObserver(handleResize)

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', handleResize)
    }
  }, [
    isInfinite,
    totalItems,
    updateVisuals,
    exactIndexRef,
    dragState,
    containerRef,
    scrollerRef,
    activeIndexRef,
  ])

  useLayoutEffect(() => {
    updateVisuals()
  })

  return (
    <div
      className={`flex flex-col w-full max-w-full overflow-hidden ${className}`}
      style={style}
    >
      <div
        ref={containerRef}
        className="relative overflow-hidden w-full max-w-full h-full flex-1"
        style={{
          containerType: 'inline-size',
          ...(aspectRatio
            ? { aspectRatio, ['--m3-carousel-ratio' as string]: aspectRatio }
            : {}),
        }}
      >
        <div
          ref={scrollerRef}
          className="flex overflow-x-auto no-scrollbar w-full h-full touch-pan-y"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            cursor: isAuto ? 'default' : 'grab',
          }}
          onPointerDown={onPointerDown}
          onScroll={onScroll}
          onTouchEnd={onTouchEnd}
        >
          <div className="absolute inset-0 pointer-events-none">
            {visualChildren.map((child, idx) => (
              <div
                key={`visual-${idx}`}
                ref={(el) => {
                  visualRefs.current[idx] = el
                }}
                className="absolute h-full pointer-events-auto cursor-pointer select-none"
                style={{
                  left: '100%',
                  width: '0%',
                  visibility: 'hidden',
                  willChange: 'transform, width, left',
                }}
                onClick={() => {
                  const logicalIdx = idx % childrenArray.length
                  if (logicalIdx === api.activeIndex) {
                    props.onItemClick?.(logicalIdx)
                  } else {
                    api.goToLogicalIndex(logicalIdx)
                  }
                }}
              >
                {child}
              </div>
            ))}
          </div>

          {Array.from({ length: dummyCount }).map((_, idx) => (
            <div
              key={`dummy-${idx}`}
              className="shrink-0"
              style={{ width: '100cqw', height: '100%' }}
            />
          ))}
        </div>
      </div>

      {renderIndicators && renderIndicators(api)}
    </div>
  )
}

export default Carousel
