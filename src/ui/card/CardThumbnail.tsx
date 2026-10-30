import React, { useState } from 'react'
import { NotchCornerOverlay } from './NotchCornerOverlay'

const PLACEHOLDER_IMG = '/imgs/images/placeholder-mini.webp'

export interface CardThumbnailProps {
  displayThumbnail: string
  title: string
  shouldRenderIcon: boolean
  thumbClipPath?: string
  thumbClipId: string
  isThumbnailClickable: boolean
  isWholeCardClickable: boolean
  thumbnailRef: React.RefObject<HTMLDivElement | null>
  thumbContainerRef: React.RefObject<HTMLDivElement | null>
  isLoading?: boolean
  isDimmed?: boolean
  lazyLoad?: boolean
  thumbnailOverlay?: React.ReactNode
  isFavorite?: boolean
  isBookmarked?: boolean
  icon?: string
  iconTooltip?: string
  notchOverlayRef?: React.RefObject<HTMLDivElement | null>
  notchSvg1Ref?: React.RefObject<SVGSVGElement | null>
  notchSvg2Ref?: React.RefObject<SVGSVGElement | null>
  onClick?: (e: React.MouseEvent) => void
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}

export const CardThumbnail: React.FC<CardThumbnailProps> = ({
  displayThumbnail,
  title,
  shouldRenderIcon,
  thumbClipPath,
  thumbClipId,
  isThumbnailClickable,
  isWholeCardClickable,
  thumbnailRef,
  thumbContainerRef,
  isLoading,
  isDimmed,
  lazyLoad,
  thumbnailOverlay,
  isFavorite,
  isBookmarked,
  icon,
  iconTooltip,
  notchOverlayRef,
  notchSvg1Ref,
  notchSvg2Ref,
  onClick,
  onMouseEnter,
  onMouseLeave,
}) => {
  const [thumbnailLoaded, setThumbnailLoaded] = useState(false)

  return (
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
            ? onMouseEnter
            : undefined
        }
        onMouseLeave={
          isThumbnailClickable && !isWholeCardClickable
            ? onMouseLeave
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
          {(isFavorite || isBookmarked) && (
            <div className="absolute right-2.5 top-2.5 z-30 pointer-events-none flex items-center gap-1.5">
              {isBookmarked && (
                <span
                  className="material-symbols-rounded text-lg leading-none select-none text-amber-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                  title="Bookmarked mod"
                >
                  bookmark
                </span>
              )}
              {isFavorite && (
                <span
                  className="material-symbols-rounded text-lg leading-none select-none text-red-500 drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                  title="Favorite mod"
                >
                  favorite
                </span>
              )}
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
  )
}

