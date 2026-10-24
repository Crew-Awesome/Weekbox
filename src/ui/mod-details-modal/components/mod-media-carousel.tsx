import React, { useState } from 'react'
import { Carousel, type CarouselAPI } from '@/ui/carousel'
import { useViewport } from '@/utils/hooks/use-viewport'

const PLACEHOLDER_IMG = '/imgs/images/placeholder-mini.webp'

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

/**
 * Preview media carousel for mod screenshots and banners.
 */
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

export interface ModThumbnailStripProps {
  media: string[]
  activeIndex: number
  onSelectIndex: (index: number) => void
  stripRef?: React.RefObject<HTMLDivElement | null>
  onPrev?: (e: React.MouseEvent) => void
  onNext?: (e: React.MouseEvent) => void
  variant?: 'desktop' | 'mobile'
}

/**
 * Horizontal thumbnail navigation strip for the mod media carousel.
 */
export const ModThumbnailStrip: React.FC<ModThumbnailStripProps> = ({
  media,
  activeIndex,
  onSelectIndex,
  stripRef: externalRef,
  onPrev,
  onNext,
  variant = 'desktop',
}) => {
  const internalRef = React.useRef<HTMLDivElement>(null)
  const stripRef = externalRef || internalRef

  const validMedia = (Array.isArray(media) ? media : []).filter(
    (item): item is string => typeof item === 'string' && item.trim().length > 0,
  )

  React.useEffect(() => {
    if (stripRef.current && validMedia.length > 0) {
      const container = stripRef.current
      const activeButton = container.children[activeIndex] as HTMLElement | undefined
      if (activeButton) {
        const scrollLeft =
          activeButton.offsetLeft -
          container.clientWidth / 2 +
          activeButton.clientWidth / 2
        container.scrollTo({ left: scrollLeft, behavior: 'smooth' })
      }
    }

    const handleResize = () => {
      if (stripRef.current && validMedia.length > 0) {
        const container = stripRef.current
        const activeButton = container.children[activeIndex] as HTMLElement | undefined
        if (activeButton) {
          const scrollLeft =
            activeButton.offsetLeft -
            container.clientWidth / 2 +
            activeButton.clientWidth / 2
          container.scrollTo({ left: scrollLeft, behavior: 'auto' })
        }
      }
    }

    window.addEventListener('resize', handleResize, { passive: true })
    return () => window.removeEventListener('resize', handleResize)
  }, [activeIndex, stripRef, validMedia.length])

  if (validMedia.length <= 1) return null

  if (variant === 'mobile') {
    return (
      <div
        ref={stripRef}
        className="flex gap-2 w-full overflow-x-auto touch-pan-x pb-3 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      >
        {validMedia.map((src, i) => (
          <ThumbnailItem
            key={`mobile-thumb-${i}`}
            src={src}
            isActive={activeIndex === i}
            onClick={() => onSelectIndex(i)}
            className="shrink-0 h-12 aspect-[16/9] w-auto rounded-lg overflow-hidden border-[2px]"
          />
        ))}
      </div>
    )
  }

  return (
    <div className="relative w-full h-14 md:h-16 group flex items-center">
      <div
        ref={stripRef}
        className="flex gap-2.5 w-full h-full items-center overflow-x-auto touch-pan-x pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      >
        {validMedia.map((src, i) => (
          <ThumbnailItem
            key={`desktop-thumb-${i}`}
            src={src}
            isActive={activeIndex === i}
            onClick={() => onSelectIndex(i)}
            className="shrink-0 h-12 md:h-14 aspect-[16/9] w-auto rounded-xl overflow-hidden border-[2px] transition-all shadow-md"
          />
        ))}
      </div>
      {onPrev && (
        <m3e-icon-button
          onClick={onPrev}
          className="absolute left-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 shadow-md cursor-pointer z-10"
          aria-label="Previous thumbnail"
        >
          <span className="material-symbols-rounded text-base leading-none">
            chevron_left
          </span>
        </m3e-icon-button>
      )}
      {onNext && (
        <m3e-icon-button
          onClick={onNext}
          className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 shadow-md cursor-pointer z-10"
          aria-label="Next thumbnail"
        >
          <span className="material-symbols-rounded text-base leading-none">
            chevron_right
          </span>
        </m3e-icon-button>
      )}
    </div>
  )
}

interface ThumbnailItemProps {
  src: string
  isActive: boolean
  onClick: () => void
  className?: string
}

const ThumbnailItem: React.FC<ThumbnailItemProps> = ({
  src,
  isActive,
  onClick,
  className = '',
}) => {
  const safeSrc =
    src && typeof src === 'string' && src.trim().length > 0
      ? src
      : PLACEHOLDER_IMG
  const [loaded, setLoaded] = useState(false)
  const [currentSrc, setCurrentSrc] = useState(safeSrc)
  const [prevSafeSrc, setPrevSafeSrc] = useState(safeSrc)
  const imgRef = React.useRef<HTMLImageElement>(null)

  if (safeSrc !== prevSafeSrc) {
    setPrevSafeSrc(safeSrc)
    setCurrentSrc(safeSrc)
    setLoaded(false)
  }

  React.useEffect(() => {
    if (
      imgRef.current &&
      imgRef.current.complete &&
      imgRef.current.naturalWidth > 0
    ) {
      setLoaded(true)
    }
  }, [safeSrc])

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative cursor-pointer ${className} ${
        isActive
          ? 'border-[var(--wb-primary)] ring-2 ring-[var(--wb-primary)]/40 opacity-100 scale-105'
          : 'border-transparent opacity-60 hover:opacity-100 hover:scale-105'
      }`}
    >
      {!loaded && (
        <img
          src={PLACEHOLDER_IMG}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-40"
          draggable={false}
        />
      )}
      <img
        ref={imgRef}
        src={currentSrc}
        alt=""
        draggable={false}
        onLoad={() => setLoaded(true)}
        onError={() => {
          if (currentSrc !== PLACEHOLDER_IMG) {
            setCurrentSrc(PLACEHOLDER_IMG)
            setLoaded(true)
          }
        }}
        className={`w-full h-full object-cover transition-opacity duration-200 ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </button>
  )
}

export default ModMediaCarousel
