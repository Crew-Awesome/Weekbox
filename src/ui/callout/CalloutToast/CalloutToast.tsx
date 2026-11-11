import React, { useRef, useCallback } from 'react'
import '../callout.css'
import type { CalloutToastItem } from '../types'
import { useShapeMorph } from './use-shape-morph'
import { useToastTimer } from './use-toast-timer'
import { useToastAnimation } from './use-toast-animation'
import { useToastDrag } from './use-toast-drag'
import { CalloutToastActions } from './CalloutToastActions'
import {
  CalloutDragTrack,
  CalloutToastInnerContent,
} from './CalloutToastContent'

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
      <CalloutDragTrack
        trackRef={trackRef}
        statusIconRef={statusIconRef}
        statusTextRef={statusTextRef}
        progressBarRef={progressBarRef}
        isPastThreshold={isPastThreshold}
      />

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
                '0 4px 16px color-mix(in srgb, var(--md-sys-color-scrim) 20%, transparent)',
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
          <CalloutToastInnerContent
            toast={toast}
            isMinimized={isMinimized}
            currentShape={currentShape}
            downloadProgress={downloadProgress}
          />
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
