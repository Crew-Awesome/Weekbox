import React, { useState, useId } from 'react'

export interface NotchCornerOverlayProps {
  icon?: string
  iconTooltip?: string
  hasWarning?: boolean
  warningTooltip?: string
  isLoading?: boolean
  isDimmed?: boolean
  containerClassName?: string
  notchOverlayRef?: React.RefObject<HTMLDivElement | null>
  notchSvg1Ref?: React.RefObject<SVGSVGElement | null>
  notchSvg2Ref?: React.RefObject<SVGSVGElement | null>
}

export const NotchCornerOverlay: React.FC<NotchCornerOverlayProps> = ({
  icon,
  iconTooltip,
  hasWarning = false,
  warningTooltip,
  isLoading = false,
  isDimmed = false,
  containerClassName = 'absolute left-0 top-0 w-[72px] h-[72px] z-20 pointer-events-auto flex items-center justify-center',
  notchOverlayRef,
  notchSvg1Ref,
  notchSvg2Ref,
}) => {
  const [iconLoaded, setIconLoaded] = useState(false)
  const rawId = useId()
  const cleanId = rawId.replace(/:/g, '-')
  const anchorId = `engine-icon-${cleanId}`
  const warningAnchorId = `engine-warning-${cleanId}`

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

        {hasWarning && (
          <div
            id={warningAnchorId}
            className="absolute -top-1 -right-1 z-30 flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-black shadow-md cursor-help pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
            aria-label="Engine warning"
          >
            <span
              className="material-symbols-rounded text-xs font-bold leading-none select-none"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              warning
            </span>
          </div>
        )}
      </div>

      {hasWarning && warningTooltip && (
        <m3e-tooltip for={warningAnchorId} position="below">
          {warningTooltip}
        </m3e-tooltip>
      )}

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
