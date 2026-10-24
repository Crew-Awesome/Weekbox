import React, { useState, useEffect, useRef, useCallback } from 'react'
import gsap from 'gsap'
import { MORPH_SHAPES } from './constants'
import type { CalloutToastItem } from './types'

export interface CalloutToastProps {
  toast: CalloutToastItem
  onDismiss: (id: string) => void
  onToggleMinimize?: (id: string) => void
}

const DRAG_DISMISS_THRESHOLD = 110 // pixels dragged to trigger dismiss

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

  const [shapeIndex, setShapeIndex] = useState(0)
  const [isPastThreshold, setIsPastThreshold] = useState(false)
  const isPastThresholdRef = useRef(false)
  const isExitingRef = useRef(false)
  const isDraggingRef = useRef(false)
  const hasMovedRef = useRef(false)
  const startXRef = useRef(0)
  const currentXRef = useRef(0)
  const isPausedRef = useRef(false)

  const isMinimized = toast.minimized
  const isDownload = Boolean(toast.download)
  const remainingTimeRef = useRef(toast.duration)
  const timerStartRef = useRef<number | null>(null)
  const timeoutIdRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Morphing shape cycle for download progress indicator (matches LoadingScreen)
  useEffect(() => {
    if (!isDownload) return
    const interval = setInterval(() => {
      setShapeIndex((prev) => (prev + 1) % MORPH_SHAPES.length)
    }, 1100)
    return () => clearInterval(interval)
  }, [isDownload])

  // GSAP Entrance animation
  useEffect(() => {
    const wrapper = wrapperRef.current
    const card = cardRef.current
    if (!wrapper) return

    gsap.fromTo(
      wrapper,
      {
        x: 64,
        opacity: 0,
        scale: 0.9,
      },
      {
        x: 0,
        opacity: 1,
        scale: 1,
        duration: 0.42,
        ease: 'back.out(1.5)',
        force3D: true,
      },
    )

    return () => {
      gsap.killTweensOf(wrapper)
      if (card) gsap.killTweensOf(card)
    }
  }, [])

  // GSAP Optimized Exit animation: sliding out smoothly to the right, then collapsing height
  const triggerDismiss = useCallback(() => {
    if (isExitingRef.current) return
    isExitingRef.current = true

    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current)
    }

    const card = cardRef.current
    const wrapper = wrapperRef.current
    if (!card || !wrapper) {
      onDismiss(toast.id)
      return
    }

    // Kill any active drag tweens
    gsap.killTweensOf(card)
    gsap.killTweensOf(wrapper)

    const tl = gsap.timeline({
      onComplete: () => {
        onDismiss(toast.id)
      },
    })

    // Phase 1: High performance slide-out to the right with gentle tilt and fade
    tl.to(card, {
      x: 480,
      opacity: 0,
      rotate: 7,
      duration: 0.32,
      ease: 'power3.in',
      force3D: true,
    })

    // Phase 2: Collapse height so other toasts glide smoothly upwards
    tl.to(
      wrapper,
      {
        height: 0,
        marginBottom: 0,
        paddingTop: 0,
        paddingBottom: 0,
        opacity: 0,
        duration: 0.26,
        ease: 'power2.inOut',
        force3D: true,
      },
      '-=0.14',
    )
  }, [onDismiss, toast.id])

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

  // Timer auto-dismiss: only runs if duration > 0, NOT paused, and NOT minimized!
  useEffect(() => {
    if (toast.duration <= 0 || isPausedRef.current || isMinimized) {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current)
      }
      return
    }

    timerStartRef.current = Date.now()
    timeoutIdRef.current = setTimeout(() => {
      triggerDismiss()
    }, remainingTimeRef.current)

    return () => {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current)
      }
    }
  }, [toast.duration, isMinimized, triggerDismiss])

  const pauseTimer = useCallback(() => {
    if (toast.duration <= 0 || isMinimized) return
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current)
    }
    if (timerStartRef.current !== null) {
      const elapsed = Date.now() - timerStartRef.current
      remainingTimeRef.current = Math.max(0, remainingTimeRef.current - elapsed)
    }
    isPausedRef.current = true
  }, [toast.duration, isMinimized])

  const resumeTimer = useCallback(() => {
    if (toast.duration <= 0 || isMinimized || isDraggingRef.current) return
    isPausedRef.current = false
    timerStartRef.current = Date.now()
    timeoutIdRef.current = setTimeout(() => {
      triggerDismiss()
    }, remainingTimeRef.current)
  }, [toast.duration, isMinimized, triggerDismiss])

  // ==========================================
  // POINTER DRAG GESTURES (SWIPE TO CANCEL)
  // ==========================================

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isExitingRef.current) return

    // Ignore if clicked on an action button, minimize toggle, or close button
    const target = e.target as HTMLElement | null
    if (
      target?.closest('button') ||
      target?.closest('m3e-button') ||
      target?.closest('[data-interactive="true"]')
    ) {
      return
    }

    isDraggingRef.current = true
    hasMovedRef.current = false
    startXRef.current = e.clientX
    currentXRef.current = 0
    pauseTimer()

    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // ignore
    }
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || isExitingRef.current) return

    const rawDelta = e.clientX - startXRef.current
    if (Math.abs(rawDelta) > 5) {
      hasMovedRef.current = true
    }

    // Only allow dragging to the right (cancel/dismiss). Apply resistance when dragged to the left.
    const deltaX = rawDelta > 0 ? rawDelta : rawDelta * 0.15
    currentXRef.current = deltaX

    const progress = Math.min(
      1,
      Math.max(0, deltaX / DRAG_DISMISS_THRESHOLD),
    )
    const reachedThreshold = deltaX >= DRAG_DISMISS_THRESHOLD

    // Hardware-accelerated direct transform via GSAP
    if (cardRef.current) {
      gsap.set(cardRef.current, {
        x: deltaX,
        rotate: deltaX * 0.032,
        opacity: Math.max(0.65, 1 - progress * 0.35),
        force3D: true,
      })
    }

    // Update track progress visuals in real-time
    if (trackRef.current) {
      trackRef.current.style.opacity = String(Math.min(1, progress * 1.3))
    }
    if (progressBarRef.current) {
      progressBarRef.current.style.width = `${Math.round(progress * 100)}%`
    }

    if (reachedThreshold !== isPastThresholdRef.current) {
      isPastThresholdRef.current = reachedThreshold
      setIsPastThreshold(reachedThreshold)
      if (statusTextRef.current) {
        statusTextRef.current.textContent = reachedThreshold
          ? 'Release to cancel!'
          : 'Drag to cancel'
      }
      if (statusIconRef.current) {
        statusIconRef.current.textContent = reachedThreshold
          ? 'delete_sweep'
          : 'arrow_forward'
      }
    }
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return
    isDraggingRef.current = false

    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      // ignore
    }

    // If dragged past threshold, complete the cancel/dismiss with GSAP slide-out
    if (currentXRef.current >= DRAG_DISMISS_THRESHOLD) {
      if (toast.download?.onCancel) {
        toast.download.onCancel()
      }
      triggerDismiss()
    } else {
      // Spring back to original position
      if (cardRef.current) {
        gsap.to(cardRef.current, {
          x: 0,
          rotate: 0,
          opacity: 1,
          duration: 0.36,
          ease: 'back.out(2.2)',
          force3D: true,
          onComplete: () => {
            if (trackRef.current) trackRef.current.style.opacity = '0'
            if (progressBarRef.current) progressBarRef.current.style.width = '0%'
            isPastThresholdRef.current = false
            setIsPastThreshold(false)
            if (statusTextRef.current) {
              statusTextRef.current.textContent = 'Drag to cancel'
            }
            if (statusIconRef.current) {
              statusIconRef.current.textContent = 'arrow_forward'
            }
          },
        })
      }
      resumeTimer()
    }
  }

  const handleCardClick = () => {
    // If the user was dragging/swiping, do not treat as a click
    if (hasMovedRef.current) {
      hasMovedRef.current = false
      return
    }
    // If minimized, clicking anywhere on the card restores it
    if (isMinimized) {
      toggleMinimize()
    }
  }

  const currentShape = MORPH_SHAPES[shapeIndex]
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
      {/* Background Track: Visual feedback revealing drag progress to cancel */}
      <div
        ref={trackRef}
        className={`absolute inset-0 rounded-2xl flex items-center justify-between px-4 z-0 pointer-events-none transition-colors duration-200 border border-dashed ${
          isPastThreshold
            ? 'bg-red-500/20 dark:bg-red-950/40 border-red-500/60 text-red-600 dark:text-red-300'
            : 'bg-black/5 dark:bg-white/5 border-black/20 dark:border-white/20 text-black/60 dark:text-white/60'
        }`}
        style={{ opacity: 0 }}
      >
        <div className="flex items-center gap-2 font-medium text-xs tracking-wider uppercase">
          <span
            ref={statusIconRef}
            className={`material-symbols-rounded text-[20px] transition-transform duration-200 ${
              isPastThreshold ? 'scale-125' : 'scale-100'
            }`}
          >
            arrow_forward
          </span>
          <span ref={statusTextRef}>Drag to cancel</span>
        </div>

        {/* Progress bar inside the track */}
        <div className="w-16 h-1.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
          <div
            ref={progressBarRef}
            className={`h-full transition-[width] duration-75 rounded-full ${
              isPastThreshold ? 'bg-red-500' : 'bg-current opacity-60'
            }`}
            style={{ width: '0%' }}
          />
        </div>
      </div>

      {/* Foreground Interactive Card with Drag Gestures */}
      <div
        ref={cardRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={handleCardClick}
        onMouseEnter={pauseTimer}
        onMouseLeave={resumeTimer}
        className={`relative z-10 w-full transition-[box-shadow] duration-200 cursor-grab active:cursor-grabbing ${
          isMinimized ? 'hover:brightness-105 active:scale-[0.99]' : ''
        }`}
      >
        <m3e-callout
          variant={toast.variant}
          shape={toast.shape}
          style={
            {
              boxShadow:
                'var(--md-sys-elevation-level3, 0 10px 32px rgba(0,0,0,0.3))',
              borderRadius: toast.shape === 'square' ? '0px' : '16px',
              overflow: 'hidden',
              display: 'block',
              backdropFilter: 'blur(20px)',
              transition:
                'padding 250ms cubic-bezier(0.2, 0, 0, 1), transform 200ms ease',
              '--m3e-callout-top-space': isMinimized ? '8px' : '12px',
              '--m3e-callout-bottom-space': isMinimized ? '8px' : '12px',
              '--m3e-callout-trailing-space': '40px', // Reserve space for top-right minimize button
            } as React.CSSProperties
          }
        >
          {/* Download Morphing Shape Indicator OR Standard Icon */}
          {toast.download ? (
            <div
              slot="icon"
              className="shrink-0 flex items-center justify-center -my-0.5"
            >
              <m3e-shape
                name={currentShape}
                style={
                  {
                    '--m3e-shape-size': isMinimized ? '32px' : '40px',
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
                    fontSize: isMinimized ? '9px' : '10.5px',
                    color:
                      toast.download.status === 'completed'
                        ? 'var(--md-sys-color-on-tertiary, #ffffff)'
                        : 'var(--md-sys-color-on-primary, #ffffff)',
                  }}
                >
                  {toast.download.status === 'completed' ? (
                    <span className="material-symbols-rounded text-[16px]">
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
                fontSize: isMinimized ? '20px' : '22px',
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
              className="font-semibold text-sm tracking-wide select-none flex items-center gap-2"
            >
              <span className="truncate">{toast.title}</span>
              {isMinimized && (
                <span className="text-[10px] font-normal uppercase tracking-wider px-1.5 py-0.5 rounded-md opacity-70 border border-current select-none shrink-0">
                  {toast.download ? `${Math.round(downloadProgress)}%` : 'minimized'}
                </span>
              )}
            </span>
          )}

          {/* Collapsible Content Body */}
          <div
            className="grid transition-[grid-template-rows,opacity,margin] duration-300 ease-[cubic-bezier(0.2,0,0,1)]"
            style={{
              gridTemplateRows: isMinimized ? '0fr' : '1fr',
              opacity: isMinimized ? 0 : 1,
              marginTop: isMinimized ? 0 : '4px',
            }}
          >
            <div className="overflow-hidden">
              <div className="flex flex-col gap-2 text-sm leading-relaxed pb-0.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0 pr-1 select-text">
                    {typeof toast.message === 'string' ? (
                      <span>{toast.message}</span>
                    ) : (
                      toast.message
                    )}
                  </div>

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
                            '--m3e-button-container-height': '28px',
                            '--m3e-button-leading-space': '8px',
                            '--m3e-button-trailing-space': '8px',
                            fontSize: '12px',
                            fontWeight: '600',
                          } as React.CSSProperties
                        }
                      >
                        {toast.action.label}
                      </m3e-button>
                    </div>
                  )}
                </div>

                {/* Download Progress Bar & Speed / Size metadata */}
                {toast.download && (
                  <div className="flex flex-col gap-1 mt-0.5 w-full">
                    <m3e-linear-progress-indicator
                      variant="wavy"
                      value={downloadProgress}
                      max="100"
                      style={
                        {
                          width: '100%',
                          display: 'block',
                          '--m3e-linear-progress-indicator-thickness': '4.5px',
                          '--m3e-linear-wavy-progress-indicator-amplitude':
                            '2.5px',
                          '--m3e-linear-wavy-progress-indicator-wavelength':
                            '18px',
                          '--m3e-progress-indicator-color':
                            toast.download.status === 'completed'
                              ? 'var(--md-sys-color-tertiary, #388e3c)'
                              : 'var(--md-sys-color-primary)',
                          '--m3e-progress-indicator-track-color':
                            'rgba(0, 0, 0, 0.12)',
                        } as React.CSSProperties
                      }
                    />
                    <div className="flex items-center justify-between text-[11px] opacity-75 font-mono select-none pt-0.5">
                      <span>
                        {toast.download.downloaded && toast.download.total
                          ? `${toast.download.downloaded} / ${toast.download.total}`
                          : `${Math.round(downloadProgress)}%`}
                      </span>
                      {toast.download.speed && (
                        <span className="font-semibold">
                          {toast.download.speed}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </m3e-callout>

        {/* Minimized Download Slim Progress Line at bottom */}
        {isMinimized && toast.download && (
          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-black/10 dark:bg-white/10 overflow-hidden rounded-b-2xl pointer-events-none">
            <div
              className="h-full bg-primary transition-[width] duration-300 ease-out"
              style={{
                width: `${downloadProgress}%`,
              }}
            />
          </div>
        )}

        {/* Action Controls (Top-Right): Minimize Toggle & Optional Permanent Close */}
        <div
          className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1"
          data-interactive="true"
          onClick={(e) => e.stopPropagation()}
        >
          {toast.canMinimize && (
            <button
              type="button"
              onClick={toggleMinimize}
              className="p-1 rounded-full opacity-70 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
              title={
                isMinimized ? 'Expand notification' : 'Minimize notification'
              }
              aria-label={
                isMinimized ? 'Expand notification' : 'Minimize notification'
              }
            >
              <span
                className={`material-symbols-rounded text-[18px] transition-transform duration-300 ease-[cubic-bezier(0.2,0,0,1)] ${
                  isMinimized ? 'rotate-180' : 'rotate-0'
                }`}
              >
                keyboard_arrow_up
              </span>
            </button>
          )}

          {toast.allowClose && (
            <button
              type="button"
              onClick={triggerDismiss}
              className="p-1 rounded-full opacity-60 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
              title="Close notification"
              aria-label="Close notification"
            >
              <span className="material-symbols-rounded text-[18px]">
                close
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
