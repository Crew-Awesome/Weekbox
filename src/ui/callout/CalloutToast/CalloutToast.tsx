import React, { useRef, useCallback } from 'react'
import '../callout.css'
import type { CalloutToastItem } from '../types'
import { useShapeMorph } from './use-shape-morph'
import { useToastTimer } from './use-toast-timer'
import { useToastAnimation } from './use-toast-animation'
import { useToastDrag } from './use-toast-drag'
import { CalloutToastActions } from './CalloutToastActions'
import { CalloutToastDownload } from './CalloutToastDownload'

export interface CalloutToastProps {
  toast: CalloutToastItem
  onDismiss: (id: string) => void
  onToggleMinimize?: (id: string) => void
}

export const CalloutToast: React.FC<CalloutToastProps> = ({
  toast,
  onDismiss,
  onToggleMinimize,
}) => {
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const cardRef = useRef<HTMLDivElement | null>(null)
  const trackRef = useRef<HTMLDivElement | null>(null)
  const progressBarRef = useRef<HTMLDivElement | null>(null)
  const statusTextRef = useRef<HTMLSpanElement | null>(null)
  const statusIconRef = useRef<HTMLSpanElement | null>(null)

  const isMinimized = toast.minimized
  const isDownload = Boolean(toast.download)
  const currentShape = useShapeMorph(isDownload)

  const calloutTintStyle = (
    toast.variant === 'error'
      ? {}
      : {
          '--m3e-callout-container-color':
            'color-mix(in srgb, #4fb3a9 16%, var(--md-sys-color-surface-container-high))',
          '--m3e-callout-icon-color':
            'color-mix(in srgb, #4fb3a9 70%, var(--md-sys-color-on-surface))',
          '--m3e-callout-leading-accent-color': '#4fb3a9',
          '--m3e-callout-label-text-color':
            'var(--md-sys-color-on-surface)',
          '--m3e-callout-content-color':
            'var(--md-sys-color-on-surface-variant)',
        }
  ) as React.CSSProperties

  const { isExitingRef, triggerDismiss } = useToastAnimation({
    wrapperRef,
    cardRef,
    onDismiss,
    toastId: toast.id,
    clearTimer: () => timerControls.clearTimer(),
  })

  const timerControls = useToastTimer({
    duration: toast.duration,
    isMinimized,
    triggerDismiss,
  })

  const {
    isPastThreshold,
    hasMovedRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  } = useToastDrag({
    cardRef,
    trackRef,
    progressBarRef,
    statusTextRef,
    statusIconRef,
    isExitingRef,
    onCancel: toast.download?.onCancel,
    triggerDismiss,
    pauseTimer: timerControls.pauseTimer,
    resumeTimer: timerControls.resumeTimer,
  })

  const toggleMinimize = useCallback(
    (e?: React.MouseEvent) => {
      if (e) {
        e.stopPropagation()
      }
      if (onToggleMinimize) {
        onToggleMinimize(toast.id)
      }
    },
    [onToggleMinimize, toast.id],
  )

  const handleCardClick = () => {
    if (hasMovedRef.current) {
      hasMovedRef.current = false
      return
    }
    if (isMinimized) {
      toggleMinimize()
    }
  }

  const downloadProgress = toast.download
    ? Math.min(100, Math.max(0, toast.download.progress))
    : 0

  return (
    <div
      ref={wrapperRef}
      className="pointer-events-auto w-full relative select-none touch-none"
      role="status"
      aria-live={toast.variant === 'error' ? 'assertive' : 'polite'}
    >
      <div
        ref={trackRef}
        className={`absolute inset-0 rounded-xl flex items-center justify-between px-3 z-0 pointer-events-none transition-colors duration-200 border border-dashed ${
          isPastThreshold
            ? 'bg-red-500/20 dark:bg-red-950/40 border-red-500/60 text-red-600 dark:text-red-300'
            : 'bg-black/5 dark:bg-white/5 border-black/20 dark:border-white/20 text-black/60 dark:text-white/60'
        }`}
        style={{ opacity: 0 }}
      >
        <div className="flex items-center gap-1.5 font-medium text-[11px] tracking-wide uppercase">
          <span
            ref={statusIconRef}
            className={`material-symbols-rounded text-[18px] transition-transform duration-200 ${
              isPastThreshold ? 'scale-110' : 'scale-100'
            }`}
          >
            arrow_forward
          </span>
          <span ref={statusTextRef}>Drag to cancel</span>
        </div>

        <div className="w-12 h-1 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
          <div
            ref={progressBarRef}
            className={`h-full transition-[width] duration-75 rounded-full ${
              isPastThreshold ? 'bg-red-500' : 'bg-current opacity-60'
            }`}
            style={{ width: '0%' }}
          />
        </div>
      </div>

      <div
        ref={cardRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={handleCardClick}
        onMouseEnter={timerControls.pauseTimer}
        onMouseLeave={timerControls.resumeTimer}
        className={`relative z-10 w-full transition-[box-shadow] duration-200 cursor-grab active:cursor-grabbing ${
          isMinimized ? 'hover:brightness-105 active:scale-[0.99]' : ''
        }`}
      >
        <m3e-callout
          variant={toast.variant}
          shape={toast.shape}
          style={
            {
              ...calloutTintStyle,
              boxShadow:
                'var(--md-sys-elevation-level2, 0 4px 16px rgba(0,0,0,0.2))',
              borderRadius: toast.shape === 'square' ? '0px' : '14px',
              overflow: 'hidden',
              display: 'block',
              backdropFilter: 'blur(16px)',
              transition:
                'padding 200ms cubic-bezier(0.2, 0, 0, 1), transform 200ms ease',
              '--m3e-callout-top-space': isMinimized ? '6px' : '9px',
              '--m3e-callout-bottom-space': isMinimized ? '6px' : '9px',
              '--m3e-callout-leading-space': '10px',
              '--m3e-callout-trailing-space':
                toast.canMinimize || toast.allowClose ? '34px' : '12px',
            } as React.CSSProperties
          }
        >
          {toast.download ? (
            <div
              slot="icon"
              className="shrink-0 flex items-center justify-center -my-0.5"
            >
              <m3e-shape
                name={currentShape}
                style={
                  {
                    '--m3e-shape-size': isMinimized ? '22px' : '28px',
                    '--m3e-shape-container-color':
                      toast.download.status === 'completed'
                        ? 'var(--md-sys-color-tertiary, #388e3c)'
                        : 'var(--md-sys-color-primary)',
                    '--m3e-shape-transition':
                      'clip-path 0.85s cubic-bezier(0.4, 0, 0.2, 1)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'width 200ms ease, height 200ms ease',
                  } as React.CSSProperties
                }
              >
                <span
                  className="font-mono font-bold select-none tracking-tighter flex items-center justify-center w-full h-full text-center drop-shadow-sm"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    fontSize: isMinimized ? '8.5px' : '9.5px',
                    color:
                      toast.download.status === 'completed'
                        ? 'var(--md-sys-color-on-tertiary, #ffffff)'
                        : 'var(--md-sys-color-on-primary, #ffffff)',
                  }}
                >
                  {toast.download.status === 'completed' ? (
                    <span className="material-symbols-rounded text-[15px]">
                      check
                    </span>
                  ) : (
                    `${Math.round(downloadProgress)}%`
                  )}
                </span>
              </m3e-shape>
            </div>
          ) : toast.icon ? (
            <span
              slot="icon"
              className="material-symbols-rounded select-none"
              style={{
                fontSize: isMinimized ? '17px' : '20px',
                verticalAlign: 'middle',
                transition: 'font-size 200ms ease',
              }}
            >
              {toast.icon}
            </span>
          ) : null}

          {toast.title && (
            <span
              slot="label"
              className="font-semibold text-xs sm:text-[13px] tracking-tight select-none flex items-center gap-1.5"
            >
              <span className="truncate max-w-[250px]">{toast.title}</span>
              {isMinimized && (
                <span className="text-[9.5px] font-normal uppercase tracking-wider px-1 py-0.2 rounded opacity-70 border border-current select-none shrink-0">
                  {toast.download ? `${Math.round(downloadProgress)}%` : 'min'}
                </span>
              )}
            </span>
          )}

          <div
            className="grid transition-[grid-template-rows,opacity,margin] duration-250 ease-[cubic-bezier(0.2,0,0,1)]"
            style={{
              gridTemplateRows: isMinimized ? '0fr' : '1fr',
              opacity: isMinimized ? 0 : 1,
              marginTop: isMinimized ? 0 : '3px',
            }}
          >
            <div className="overflow-hidden">
              <div className="flex flex-col gap-1.5 text-xs sm:text-[12.5px] leading-snug pb-0.5">
                {(toast.message || toast.action) && (
                  <div className="flex items-center justify-between gap-2">
                    {toast.message && (
                      <div className="flex-1 min-w-0 pr-1 select-text opacity-90 truncate">
                        {typeof toast.message === 'string' ? (
                          <span>{toast.message}</span>
                        ) : (
                          toast.message
                        )}
                      </div>
                    )}

                    {toast.action && (
                      <div className="shrink-0 -mr-1" data-interactive="true">
                        <m3e-button
                          variant="text"
                          onClick={(e: React.MouseEvent) => {
                            e.stopPropagation()
                            toast.action?.onClick(toast)
                          }}
                          style={
                            {
                              '--m3e-button-container-height': '24px',
                              '--m3e-button-leading-space': '8px',
                              '--m3e-button-trailing-space': '8px',
                              fontSize: '11.5px',
                              fontWeight: '600',
                            } as React.CSSProperties
                          }
                        >
                          {toast.action.label}
                        </m3e-button>
                      </div>
                    )}
                  </div>
                )}

                {toast.download && (
                  <CalloutToastDownload
                    download={toast.download}
                    downloadProgress={downloadProgress}
                  />
                )}
              </div>
            </div>
          </div>
        </m3e-callout>

        {isMinimized && toast.download && (
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-black/10 dark:bg-white/10 overflow-hidden rounded-b-xl pointer-events-none">
            <div
              className="h-full bg-primary transition-[width] duration-300 ease-out"
              style={{
                width: `${downloadProgress}%`,
              }}
            />
          </div>
        )}

        <CalloutToastActions
          canMinimize={toast.canMinimize}
          allowClose={toast.allowClose}
          isMinimized={isMinimized}
          onToggleMinimize={toggleMinimize}
          onDismiss={triggerDismiss}
        />
      </div>
    </div>
  )
}

