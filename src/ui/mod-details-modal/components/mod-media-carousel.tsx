import React from 'react'
import { Carousel, type CarouselAPI } from '@/ui/carousel'
import { useViewport } from '@/utils/hooks/use-viewport'
import {
  PLACEHOLDER_IMG,
  ModThumbnailStrip,
  type ModThumbnailStripProps,
} from './mod-thumbnail-strip'

export { ModThumbnailStrip, type ModThumbnailStripProps }

export interface ModMediaCarouselProps {
  media?: string[]
  fallbackImage?: string
  title: string
  showCaption?: boolean
  activeIndex?: number
  carouselRef?: React.RefObject<HTMLDivElement | null>
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void
  onPrev?: (e?: React.MouseEvent) => void
  onNext?: (e?: React.MouseEvent) => void
  onMouseEnter?: () => void
  onMouseLeave?: () => void
  onIndexChange?: (index: number) => void
  aspectRatioClassName?: string
  roundedClassName?: string
}

export const ModMediaCarousel: React.FC<ModMediaCarouselProps> = ({
  media = [],
  fallbackImage,
  title,
  showCaption = false,
  activeIndex = 0,
  carouselRef,
  onMouseEnter,
  onMouseLeave,
  onIndexChange,
  aspectRatioClassName = 'aspect-[16/9]',
  roundedClassName = 'rounded-2xl',
}) => {
  const isCleanUrl = (url?: unknown): url is string =>
    typeof url === 'string' &&
    url.trim().length > 0 &&
    !url.includes('undefined') &&
    url !== '[object Object]'

  const validMedia = (Array.isArray(media) ? media : []).filter(isCleanUrl)
  const effectiveMedia =
    validMedia.length > 0
      ? validMedia
      : isCleanUrl(fallbackImage)
        ? [fallbackImage]
        : [PLACEHOLDER_IMG]

  const hasMultiple = effectiveMedia.length > 1
  const hasMedia = effectiveMedia.length > 0
  const carouselApiRef = React.useRef<CarouselAPI | null>(null)
  const { isMobile } = useViewport()

  React.useEffect(() => {
    if (carouselApiRef.current && carouselApiRef.current.activeIndex !== activeIndex) {
      carouselApiRef.current.goToLogicalIndex(activeIndex)
    }
  }, [activeIndex])

  return (
    <div
      ref={carouselRef}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`w-full ${aspectRatioClassName} relative ${roundedClassName} overflow-hidden bg-transparent shrink-0 select-none`}
    >
      {hasMedia ? (
        hasMultiple ? (
          <Carousel
            isInfinite={effectiveMedia.length > 2}
            isAuto={false}
            isMobile={isMobile}
            aspectRatio="16/9"
            className="w-full h-full"
            apiRef={carouselApiRef}
            onIndexChange={onIndexChange}
          >
            {effectiveMedia.map((src, i) => (
              <div key={`${src}-${i}`} className="w-full h-full p-0.5 sm:p-1 relative">
                <div
                  className="m3-card w-full h-full rounded-[20px] sm:rounded-[24px] relative border overflow-hidden cursor-pointer shadow-sm transition-transform duration-300"
                  style={{
                    backgroundColor: 'var(--md-sys-color-surface-container)',
                    borderColor: 'var(--md-sys-color-outline-variant)',
                  }}
                >
                  <div className="absolute inset-0 overflow-hidden rounded-[20px] sm:rounded-[24px] pointer-events-none z-0">
                    <img
                      src={src}
                      alt={title}
                      loading="lazy"
                      decoding="async"
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                      onError={(e) => {
                        e.currentTarget.src = PLACEHOLDER_IMG
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                  </div>

                  {showCaption && title && (
                    <div className="m3-card-content absolute inset-x-0 bottom-0 p-3 sm:p-5 flex flex-col justify-end pointer-events-none z-10">
                      <h4 className="text-sm sm:text-base font-bold text-white drop-shadow-md truncate">
                        {title}
                      </h4>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </Carousel>
        ) : (
          <div className="w-full h-full p-1 sm:p-2 relative">
            <div
              className="m3-card w-full h-full rounded-[20px] sm:rounded-[24px] relative border overflow-hidden shadow-sm"
              style={{
                backgroundColor: 'var(--md-sys-color-surface-container)',
                borderColor: 'var(--md-sys-color-outline-variant)',
              }}
            >
              <img
                src={effectiveMedia[0]}
                alt={title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = PLACEHOLDER_IMG
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent" />
            </div>
          </div>
        )
      ) : (
        <div className="w-full h-full relative overflow-hidden rounded-2xl bg-black/20">
          <img
            src={PLACEHOLDER_IMG}
            alt=""
            className="w-full h-full object-cover opacity-50"
          />
        </div>
      )}
    </div>
  )
}

export default ModMediaCarousel
