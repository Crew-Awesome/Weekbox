import React, { useState } from 'react'

export const PLACEHOLDER_IMG = '/imgs/images/placeholder-mini.webp'

export interface ModThumbnailStripProps {
  media: string[]
  activeIndex: number
  onSelectIndex: (index: number) => void
  stripRef?: React.RefObject<HTMLDivElement | null>
  onPrev?: (e: React.MouseEvent) => void
  onNext?: (e: React.MouseEvent) => void
  variant?: 'desktop' | 'mobile'
}

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
          ? 'border-[var(--md-sys-color-primary)] ring-2 ring-[var(--md-sys-color-primary)]/40 opacity-100 scale-105'
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
