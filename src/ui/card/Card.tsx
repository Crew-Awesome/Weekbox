import React, { useState, useRef, useId, useLayoutEffect } from 'react'
import { NotchCornerOverlay } from './NotchCornerOverlay'
import { useSurfaceHoverColor } from '@/utils/hooks/use-surface-hover-color'

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
  author?: string
  authorAvatar?: string
}

/**
 * Generates an SVG path for clipping the top-left corner of the card thumbnail.
 */
function getThumbnailNotchPath(
  w: number,
  h: number,
  nw = 72,
  nh = 72,
  r = 10,
  f = 10,
  cr = 16,
): string {
  if (w <= 0 || h <= 0) return ''
  const actualNw = Math.min(nw, w * 0.45)
  const actualNh = Math.min(nh, h * 0.48)
  const actualCr = Math.min(cr, w * 0.1, h * 0.1)

  return (
    `M ${actualNw + f} 0 ` +
    `L ${w - actualCr} 0 ` +
    `A ${actualCr} ${actualCr} 0 0 1 ${w} ${actualCr} ` +
    `L ${w} ${h} ` +
    `L 0 ${h} ` +
    `L 0 ${actualNh + f} ` +
    `A ${f} ${f} 0 0 1 ${f} ${actualNh} ` +
    `L ${actualNw - r} ${actualNh} ` +
    `A ${r} ${r} 0 0 0 ${actualNw} ${actualNh - r} ` +
    `L ${actualNw} ${f} ` +
    `A ${f} ${f} 0 0 1 ${actualNw + f} 0 Z`
  )
}

/**
 * Generates an SVG path for clipping the full card hover background around the top-left notch.
 */
function getCardNotchPath(
  w: number,
  h: number,
  nw = 72,
  nh = 72,
  r = 10,
  f = 10,
  cr = 16,
): string {
  if (w <= 0 || h <= 0) return ''
  const actualNw = Math.min(nw, w * 0.45)
  const actualNh = Math.min(nh, h * 0.48)
  const actualCr = Math.min(cr, w * 0.1, h * 0.1)

  return (
    `M ${actualNw + f} 0 ` +
    `L ${w - actualCr} 0 ` +
    `A ${actualCr} ${actualCr} 0 0 1 ${w} ${actualCr} ` +
    `L ${w} ${h - actualCr} ` +
    `A ${actualCr} ${actualCr} 0 0 1 ${w - actualCr} ${h} ` +
    `L ${actualCr} ${h} ` +
    `A ${actualCr} ${actualCr} 0 0 1 0 ${h - actualCr} ` +
    `L 0 ${actualNh + f} ` +
    `A ${f} ${f} 0 0 1 ${f} ${actualNh} ` +
    `L ${actualNw - r} ${actualNh} ` +
    `A ${r} ${r} 0 0 0 ${actualNw} ${actualNh - r} ` +
    `L ${actualNw} ${f} ` +
    `A ${f} ${f} 0 0 1 ${actualNw + f} 0 Z`
  )
}

/**
 * Card component with SVG corner cutout for engine icons and GSAP hover color extraction.
 */
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
  author,
  authorAvatar,
}) => {
  const displayThumbnail = thumbnail || (showThumbnail ? PLACEHOLDER_IMG : undefined)
  const [thumbnailLoaded, setThumbnailLoaded] = useState(false)

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
        <div className="relative w-full">
          <div
            ref={thumbContainerRef}
            className={`relative overflow-hidden w-full aspect-[16/9] isolate ${
              !thumbClipPath
                ? shouldRenderIcon
                  ? 'rounded-tr-2xl rounded-tl-none'
                  : 'rounded-t-2xl'
                : ''
            } ${isThumbnailClickable ? 'cursor-pointer' : ''}`}
            style={
              thumbClipPath
                ? {
                    clipPath: `url(#${thumbClipId})`,
                    WebkitClipPath: `url(#${thumbClipId})`,
                  }
                : undefined
            }
            onClick={
              isThumbnailClickable && !isWholeCardClickable ? onClick : undefined
            }
            onMouseEnter={
              isThumbnailClickable && !isWholeCardClickable
                ? handleMouseEnter
                : undefined
            }
            onMouseLeave={
              isThumbnailClickable && !isWholeCardClickable
                ? handleMouseLeave
                : undefined
            }
          >
            <div className="absolute inset-0 isolate">
              <div ref={thumbnailRef} className="absolute inset-0">
                {(!thumbnailLoaded || isLoading) && (
                  <div className="absolute inset-0 block w-full h-full bg-[var(--md-sys-color-surface-container-highest)] animate-pulse" />
                )}
                {!isLoading && (
                  <img
                    className={`w-full h-full object-cover block transition-opacity duration-300 ${
                      isDimmed
                        ? 'brightness-75 opacity-60'
                        : thumbnailLoaded
                          ? 'opacity-100'
                          : 'opacity-0'
                    }`}
                    src={displayThumbnail}
                    alt={title}
                    loading={lazyLoad ? 'lazy' : 'eager'}
                    decoding="async"
                    draggable={false}
                    onLoad={() => setThumbnailLoaded(true)}
                    onError={(e) => {
                      if (e.currentTarget.src !== PLACEHOLDER_IMG) {
                        e.currentTarget.src = PLACEHOLDER_IMG
                        setThumbnailLoaded(true)
                      }
                    }}
                    style={{
                      WebkitMaskImage:
                        'linear-gradient(to bottom, black 60%, transparent 100%)',
                      maskImage:
                        'linear-gradient(to bottom, black 60%, transparent 100%)',
                    }}
                  />
                )}
              </div>
              {thumbnailOverlay && (
                <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
                  {thumbnailOverlay}
                </div>
              )}
              {isFavorite && (
                <div
                  className="absolute right-2.5 top-2.5 z-30 pointer-events-none w-6 h-6 rounded-full bg-black/70 flex items-center justify-center text-red-500 shadow-md border border-white/10"
                  title="Favorite mod"
                >
                  <span
                    className="material-symbols-rounded text-xs leading-none"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    favorite
                  </span>
                </div>
              )}
            </div>
          </div>

          {shouldRenderIcon && (
            <NotchCornerOverlay
              icon={icon}
              iconTooltip={iconTooltip}
              isLoading={isLoading}
              isDimmed={isDimmed}
              notchOverlayRef={notchOverlayRef}
              notchSvg1Ref={notchSvg1Ref}
              notchSvg2Ref={notchSvg2Ref}
            />
          )}
        </div>
      )}

      <div className="p-4 pb-3 flex flex-col gap-1.5">
        {isLoading ? (
          <>
            <div className="h-5 w-3/4 rounded-md bg-[var(--md-sys-color-surface-container-highest)] animate-pulse" />
            {description !== undefined && (
              <div className="h-3.5 w-1/2 rounded-md bg-[var(--md-sys-color-surface-container-highest)] animate-pulse mt-0.5" />
            )}
            <div className="h-4 w-1/3 rounded-full bg-[var(--md-sys-color-surface-container-highest)] animate-pulse pt-0.5" />
          </>
        ) : (
          <>
            <div className="flex items-start justify-between gap-1.5">
              <strong
                className="font-bold leading-snug line-clamp-2 select-text text-[var(--md-sys-color-on-surface)] text-sm sm:text-base"
                title={title}
              >
                <span>{title}</span>
              </strong>
              {isNsfw && (
                <span className="shrink-0 mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-500 dark:text-red-400 border border-red-500/30">
                  NSFW
                </span>
              )}
            </div>
            {description && (
              <p className="text-[var(--md-sys-color-on-surface-variant)] text-xs line-clamp-2 leading-snug opacity-90">
                {description}
              </p>
            )}

            {(author || authorAvatar) && (
              <div className="flex items-center gap-1.5 pt-0.5">
                {authorAvatar ? (
                  <img
                    src={authorAvatar}
                    alt={author || 'Creator'}
                    className="w-5 h-5 rounded-full object-cover border border-[var(--md-sys-color-outline-variant)]/30 shrink-0 shadow-sm"
                    loading="lazy"
                    decoding="async"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-[var(--md-sys-color-surface-container-highest)] flex items-center justify-center shrink-0 border border-[var(--md-sys-color-outline-variant)]/20">
                    <span className="material-symbols-rounded text-xs text-[var(--md-sys-color-on-surface-variant)] opacity-90">
                      person
                    </span>
                  </div>
                )}
                <span className="text-xs font-semibold text-[var(--md-sys-color-on-surface)] truncate">
                  {author || 'Unknown Creator'}
                </span>
              </div>
            )}

            {children && <div className="pt-0.5">{children}</div>}
          </>
        )}
      </div>
    </div>
  )
}

export default Card
