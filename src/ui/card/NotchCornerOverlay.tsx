import React, { useState, useId } from 'react'

export interface NotchCornerOverlayProps {
  icon?: string
  iconTooltip?: string
  isLoading?: boolean
  isDimmed?: boolean
  containerClassName?: string
  notchOverlayRef?: React.RefObject<HTMLDivElement | null>
  notchSvg1Ref?: React.RefObject<SVGSVGElement | null>
  notchSvg2Ref?: React.RefObject<SVGSVGElement | null>
}

/**
 * Renders the top-left corner engine icon inside the card's SVG cutout with an M3E tooltip.
 */
export const NotchCornerOverlay: React.FC<NotchCornerOverlayProps> = ({
  icon,
  iconTooltip,
  isLoading = false,
  isDimmed = false,
  containerClassName = 'absolute left-0 top-0 w-[72px] h-[72px] z-20 pointer-events-auto flex items-center justify-center',
  notchOverlayRef,
  notchSvg1Ref,
  notchSvg2Ref,
}) => {
  const [iconLoaded, setIconLoaded] = useState(false)
  const rawId = useId()
  const anchorId = `engine-icon-${rawId.replace(/:/g, '-')}`

  return (
    <div className={containerClassName}>
      <div
        ref={notchOverlayRef}
        className="absolute inset-0 pointer-events-none opacity-0"
      />

      <div
        id={anchorId}
        className="relative z-20 w-[56px] h-[56px] flex items-center justify-center cursor-pointer pointer-events-auto transition-transform active:scale-95"
        tabIndex={0}
        aria-label={iconTooltip || 'Engine icon'}
      >
        {icon && (
          <>
            {(!iconLoaded || isLoading) && (
              <div className="absolute inset-1 block rounded-full bg-[var(--md-sys-color-surface-container-highest)] animate-pulse" />
            )}
            {!isLoading && (
              <img
                className={`object-contain w-full h-full block transition-opacity duration-300 ${
                  isDimmed
                    ? 'brightness-75 grayscale-[40%] opacity-60'
                    : iconLoaded
                      ? 'opacity-100'
                      : 'opacity-0'
                }`}
                src={icon}
                alt={iconTooltip || 'engine icon'}
                decoding="async"
                draggable={false}
                onLoad={() => setIconLoaded(true)}
              />
            )}
          </>
        )}
      </div>

      {iconTooltip && (
        <m3e-tooltip for={anchorId} position="below">
          {iconTooltip}
        </m3e-tooltip>
      )}

      <svg
        ref={notchSvg1Ref}
        className="hidden pointer-events-none"
        aria-hidden="true"
      />
      <svg
        ref={notchSvg2Ref}
        className="hidden pointer-events-none"
        aria-hidden="true"
      />
    </div>
  )
}

export default NotchCornerOverlay
