import React from 'react'
import { createPortal } from 'react-dom'
import type { ModalProps, SpacingValue } from './types'
import { useModalBackHandler } from './use-modal-back-handler'
import { useModalAnimation } from './use-modal-animation'
import { ModalBackdrop } from './modal-backdrop'
import { useViewport } from '@/utils/hooks/use-viewport'

export type * from './types'

/**
 * Portal-based responsive Modal with MD3 entrance animations and hardware back button support.
 */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  actions,
  children,
  overlayClassName = 'bg-black/40 backdrop-blur-md',
  modalClassName = '',
  widthClass = 'w-[90vw] sm:w-[80vw] md:w-[60vw]',
  heightClass = 'h-[90vh] sm:h-[80vh] md:h-[70vh]',
  svgBackgrounds,
  hideDefaultBackground = false,
  contentClassName = 'p-8 flex-1 overflow-y-auto mobile-no-scrollbar',
  edgeSpacing,
  showCirclePattern = false,
  backdropImage,
  zIndex = 100,
  hideCloseButton = false,
  hideCloseButtonMobile = false,
  closeButtonClassName = '',
  onBack,
}) => {
  const { isDesktop } = useViewport()
  const { isRendered, isVisible, handleClose } = useModalAnimation(isOpen, onClose)
  useModalBackHandler(isOpen, handleClose, onBack)

  if (!isRendered) return null

  const target =
    typeof document !== 'undefined'
      ? document.getElementById('modal-root') || document.body
      : null

  if (!target) return null

  const parseSpacing = (spacing?: SpacingValue, fallback = '0px') => {
    if (!spacing) return fallback
    if (Array.isArray(spacing)) {
      return `${spacing[1]} ${spacing[0]}`
    }
    return spacing
  }

  const currentConfig = edgeSpacing
    ? isDesktop
      ? edgeSpacing.desktop
      : edgeSpacing.mobile
    : undefined
  const isStatic = edgeSpacing?.isStaticSize

  let overlayPadding: string | undefined
  let staticModalStyle: React.CSSProperties = {}

  if (currentConfig) {
    if (isStatic) {
      if (Array.isArray(currentConfig)) {
        staticModalStyle = {
          width: currentConfig[0],
          height: currentConfig[1],
          ...(isDesktop && currentConfig[1] !== 'auto'
            ? { aspectRatio: '16 / 9' }
            : {}),
        }
      } else {
        staticModalStyle = { width: currentConfig, height: currentConfig }
      }
    } else {
      overlayPadding = parseSpacing(currentConfig, isDesktop ? '32px' : '16px')
    }
  }

  let activeWidthClass = widthClass
  let activeHeightClass = heightClass

  if (edgeSpacing) {
    if (!isStatic) {
      activeWidthClass = 'w-full max-w-full'
      activeHeightClass = 'h-full max-h-full'
    } else {
      activeWidthClass = ''
      activeHeightClass = ''
    }
  }

  const isDefaultOverlay = overlayClassName === 'bg-black/40 backdrop-blur-md'
  const baseOverlayClass = isDefaultOverlay ? 'backdrop-blur-md' : overlayClassName

  return createPortal(
    <div
      className={`fixed inset-0 flex items-center justify-center ${
        isVisible ? 'pointer-events-auto' : 'pointer-events-none'
      }`}
      onClick={handleClose}
      style={{
        zIndex,
        transition: isVisible
          ? 'opacity 500ms cubic-bezier(0.2, 0.0, 0, 1.0)'
          : 'opacity 150ms cubic-bezier(0.2, 0.0, 0, 1.0)',
        opacity: isVisible ? 1 : 0,
        ...(overlayPadding ? { padding: overlayPadding } : {}),
      }}
    >
      <ModalBackdrop
        backdropImage={backdropImage}
        baseOverlayClass={baseOverlayClass}
        showCirclePattern={showCirclePattern}
      />

      <div
        className={`relative flex flex-col z-10 ${activeWidthClass} ${activeHeightClass} ${modalClassName}`}
        onClick={(e) => e.stopPropagation()}
        style={{
          ...staticModalStyle,
          transformOrigin: 'top center',
          transition: isVisible
            ? 'opacity 500ms cubic-bezier(0.2, 0.0, 0, 1.0), transform 500ms cubic-bezier(0.2, 0.0, 0, 1.0)'
            : 'opacity 150ms cubic-bezier(0.2, 0.0, 0, 1.0), transform 150ms cubic-bezier(0.2, 0.0, 0, 1.0)',
          opacity: isVisible ? 1 : 0,
          transform: isVisible
            ? 'scaleY(1) translateY(0)'
            : 'scaleY(0.6) translateY(-24px)',
          willChange: 'transform, opacity',
        }}
      >
        <div
          className={`absolute inset-0 ${
            !hideDefaultBackground
              ? 'bg-[var(--md-sys-color-surface)] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] border border-white/10'
              : ''
          } overflow-hidden z-0`}
        >
          {svgBackgrounds && (
            <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
              {svgBackgrounds}
            </div>
          )}
        </div>

        <div className="relative flex flex-col z-10 text-[var(--md-sys-color-on-surface)] h-full overflow-hidden rounded-[inherit] [isolation:isolate]">
          {!hideCloseButton && (
            <m3e-icon-button
              onClick={handleClose}
              className={`absolute top-4 right-4 z-50 pointer-events-auto cursor-pointer ${
                hideCloseButtonMobile ? 'hidden md:flex' : ''
              } ${closeButtonClassName}`}
              aria-label="Close modal"
              style={{
                opacity: isVisible ? 1 : 0,
                transition: isVisible
                  ? 'opacity 250ms linear 50ms'
                  : 'opacity 100ms linear 0ms',
              }}
            >
              <span className="material-symbols-rounded text-xl leading-none">
                close
              </span>
            </m3e-icon-button>
          )}

          {title && (
            <div
              className="px-6 py-4 border-b border-[var(--md-sys-color-outline-variant)]/30 font-semibold text-lg flex items-center pr-14 shrink-0"
              style={{
                opacity: isVisible ? 1 : 0,
                transition: isVisible
                  ? 'opacity 250ms linear 50ms'
                  : 'opacity 100ms linear 0ms',
              }}
            >
              {title}
            </div>
          )}

          <div
            className={contentClassName}
            style={{
              opacity: isVisible ? 1 : 0,
              transition: isVisible
                ? 'opacity 250ms linear 100ms'
                : 'opacity 100ms linear 0ms',
            }}
          >
            {children}
          </div>

          {actions && (
            <div
              className="px-6 py-3 border-t border-[var(--md-sys-color-outline-variant)]/30 flex items-center justify-end gap-2 bg-[var(--md-sys-color-surface-container)] shrink-0"
              style={{
                opacity: isVisible ? 1 : 0,
                transition: isVisible
                  ? 'opacity 300ms linear 150ms'
                  : 'opacity 100ms linear 0ms',
              }}
            >
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>,
    target,
  )
}
