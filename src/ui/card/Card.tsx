import React, { useState, useRef, useId, useLayoutEffect } from 'react'
import { useSurfaceHoverColor } from '@/utils/hooks/use-surface-hover-color'
import { getThumbnailNotchPath, getCardNotchPath } from './card-notch'
import { CardThumbnail } from './CardThumbnail'
import { CardContent } from './CardContent'

const PLACEHOLDER_IMG = '/imgs/images/placeholder-mini.webp'

export interface CardProps {
  title: string
  description?: string
  thumbnail?: string
  showThumbnail?: boolean
  icon?: string
  iconTooltip?: string
  showIcon?: boolean
  onClick?: (e: React.MouseEvent) => void
  clickableArea?: 'whole-card' | 'thumbnail' | 'none'
  children?: React.ReactNode
  className?: string
  extractColor?: boolean
  lazyLoad?: boolean
  isLoading?: boolean
  isNsfw?: boolean
  thumbnailOverlay?: React.ReactNode
  isDimmed?: boolean
  isFavorite?: boolean
  isBookmarked?: boolean
  author?: string
  authorAvatar?: string
}

export const Card: React.FC<CardProps> = ({
  title,
  description,
  thumbnail,
  showThumbnail = false,
  icon,
  iconTooltip,
  showIcon,
  onClick,
  clickableArea = 'whole-card',
  children,
  className = '',
  extractColor = true,
  lazyLoad = false,
  isLoading = false,
  isNsfw = false,
  thumbnailOverlay,
  isDimmed = false,
  isFavorite = false,
  isBookmarked = false,
  author,
  authorAvatar,
}) => {
  const rawThumbnail = thumbnail || (showThumbnail ? PLACEHOLDER_IMG : undefined)
  const displayThumbnail = rawThumbnail
    ? rawThumbnail.replace(/\\/g, '/').startsWith('mod-covers/')
      ? `/${rawThumbnail.replace(/\\/g, '/')}`
      : rawThumbnail.replace(/\\/g, '/').includes('/mod-covers/')
        ? `/mod-covers/${rawThumbnail.replace(/\\/g, '/').split('/mod-covers/').pop()}`
        : rawThumbnail
    : undefined

  const thumbContainerRef = useRef<HTMLDivElement>(null)
  const [thumbSize, setThumbSize] = useState({ w: 0, h: 0 })
  const [cardSize, setCardSize] = useState({ w: 0, h: 0 })

  const rawId = useId()
  const cleanId = rawId.replace(/:/g, '-')
  const thumbClipId = `card-thumb-clip-${cleanId}`
  const cardClipId = `card-bg-clip-${cleanId}`

  const {
    rootRef: cardRootRef,
    thumbnailRef,
    hoverBgRef,
    notchOverlayRef,
    notchSvg1Ref,
    notchSvg2Ref,
    handleMouseEnter,
    handleMouseLeave,
  } = useSurfaceHoverColor({
    imageUrl: displayThumbnail,
    enableExtractColor: extractColor,
    lazyLoad,
    animateThumbnail: false,
  })

  const isWholeCardClickable = clickableArea === 'whole-card'
  const isThumbnailClickable = clickableArea === 'thumbnail'
  const shouldRenderIcon = showIcon ?? Boolean(icon)

  useLayoutEffect(() => {
    const thumbEl = thumbContainerRef.current
    const cardEl = cardRootRef.current

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === thumbEl) {
          const { width, height } = entry.contentRect
          setThumbSize({ w: Math.round(width), h: Math.round(height) })
        } else if (entry.target === cardEl) {
          const { width, height } = entry.contentRect
          setCardSize({ w: Math.round(width), h: Math.round(height) })
        }
      }
    })

    if (thumbEl) {
      ro.observe(thumbEl)
      setThumbSize({
        w: Math.round(thumbEl.clientWidth),
        h: Math.round(thumbEl.clientHeight),
      })
    }
    if (cardEl) {
      ro.observe(cardEl)
      setCardSize({
        w: Math.round(cardEl.clientWidth),
        h: Math.round(cardEl.clientHeight),
      })
    }

    return () => ro.disconnect()
  }, [displayThumbnail, cardRootRef])

  const thumbClipPath =
    shouldRenderIcon && thumbSize.w > 0 && thumbSize.h > 0
      ? getThumbnailNotchPath(thumbSize.w, thumbSize.h, 72, 72, 10, 10, 16)
      : undefined

  const cardClipPath =
    shouldRenderIcon && cardSize.w > 0 && cardSize.h > 0
      ? getCardNotchPath(cardSize.w, cardSize.h, 72, 72, 10, 10, 16)
      : undefined

  return (
    <div
      ref={cardRootRef}
      className={`relative isolate flex flex-col shadow-none bg-transparent p-0 select-none hover:z-20 ${
        isWholeCardClickable ? 'cursor-pointer' : ''
      } ${isDimmed ? 'opacity-75 saturate-75' : ''} h-full rounded-2xl ${className}`}
      onClick={isWholeCardClickable ? onClick : undefined}
      onMouseEnter={isWholeCardClickable ? handleMouseEnter : undefined}
      onMouseLeave={isWholeCardClickable ? handleMouseLeave : undefined}
    >
      <svg
        className="absolute w-0 h-0 pointer-events-none opacity-0 -z-50"
        aria-hidden="true"
      >
        <defs>
          {thumbClipPath && (
            <clipPath id={thumbClipId} clipPathUnits="userSpaceOnUse">
              <path d={thumbClipPath} />
            </clipPath>
          )}
          {cardClipPath && (
            <clipPath id={cardClipId} clipPathUnits="userSpaceOnUse">
              <path d={cardClipPath} />
            </clipPath>
          )}
        </defs>
      </svg>

      <div
        ref={hoverBgRef}
        className={`absolute pointer-events-none z-[-1] ${
          !cardClipPath ? 'rounded-2xl' : ''
        }`}
        style={
          cardClipPath
            ? {
                clipPath: `url(#${cardClipId})`,
                WebkitClipPath: `url(#${cardClipId})`,
              }
            : undefined
        }
      />

      {displayThumbnail && (
        <CardThumbnail
          displayThumbnail={displayThumbnail}
          title={title}
          shouldRenderIcon={shouldRenderIcon}
          thumbClipPath={thumbClipPath}
          thumbClipId={thumbClipId}
          isThumbnailClickable={isThumbnailClickable}
          isWholeCardClickable={isWholeCardClickable}
          thumbnailRef={thumbnailRef}
          thumbContainerRef={thumbContainerRef}
          isLoading={isLoading}
          isDimmed={isDimmed}
          lazyLoad={lazyLoad}
          thumbnailOverlay={thumbnailOverlay}
          isFavorite={isFavorite}
          isBookmarked={isBookmarked}
          icon={icon}
          iconTooltip={iconTooltip}
          notchOverlayRef={notchOverlayRef}
          notchSvg1Ref={notchSvg1Ref}
          notchSvg2Ref={notchSvg2Ref}
          onClick={onClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        />
      )}

      <CardContent
        title={title}
        description={description}
        isLoading={isLoading}
        isNsfw={isNsfw}
        author={author}
        authorAvatar={authorAvatar}
      >
        {children}
      </CardContent>
    </div>
  )
}

export default Card
