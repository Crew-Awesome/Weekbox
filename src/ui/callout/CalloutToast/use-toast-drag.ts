import { useState, useRef, useCallback } from 'react'
import gsap from 'gsap'

export const DRAG_DISMISS_THRESHOLD = 90

interface UseToastDragOptions {
  cardRef: React.RefObject<HTMLDivElement | null>
  trackRef: React.RefObject<HTMLDivElement | null>
  progressBarRef: React.RefObject<HTMLDivElement | null>
  statusTextRef: React.RefObject<HTMLSpanElement | null>
  statusIconRef: React.RefObject<HTMLSpanElement | null>
  isExitingRef: React.MutableRefObject<boolean>
  onCancel?: () => void
  triggerDismiss: () => void
  pauseTimer: () => void
  resumeTimer: () => void
}

export function useToastDrag({
  cardRef,
  trackRef,
  progressBarRef,
  statusTextRef,
  statusIconRef,
  isExitingRef,
  onCancel,
  triggerDismiss,
  pauseTimer,
  resumeTimer,
}: UseToastDragOptions) {
  const [isPastThreshold, setIsPastThreshold] = useState(false)
  const isPastThresholdRef = useRef(false)
  const isDraggingRef = useRef(false)
  const hasMovedRef = useRef(false)
  const startXRef = useRef(0)
  const currentXRef = useRef(0)

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (isExitingRef.current) return

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
      }
    },
    [isExitingRef, pauseTimer],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDraggingRef.current || isExitingRef.current) return

      const rawDelta = e.clientX - startXRef.current
      if (Math.abs(rawDelta) > 5) {
        hasMovedRef.current = true
      }

      const deltaX = rawDelta > 0 ? rawDelta : rawDelta * 0.15
      currentXRef.current = deltaX

      const progress = Math.min(1, Math.max(0, deltaX / DRAG_DISMISS_THRESHOLD))
      const reachedThreshold = deltaX >= DRAG_DISMISS_THRESHOLD

      if (cardRef.current) {
        gsap.set(cardRef.current, {
          x: deltaX,
          rotate: deltaX * 0.032,
          opacity: Math.max(0.65, 1 - progress * 0.35),
          force3D: true,
        })
      }

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
    },
    [
      cardRef,
      trackRef,
      progressBarRef,
      statusTextRef,
      statusIconRef,
      isExitingRef,
    ],
  )

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDraggingRef.current) return
      isDraggingRef.current = false

      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch {
      }

      if (currentXRef.current >= DRAG_DISMISS_THRESHOLD) {
        if (onCancel) {
          onCancel()
        }
        triggerDismiss()
      } else {
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
    },
    [
      cardRef,
      trackRef,
      progressBarRef,
      statusTextRef,
      statusIconRef,
      onCancel,
      triggerDismiss,
      resumeTimer,
    ],
  )

  return {
    isPastThreshold,
    hasMovedRef,
    isDraggingRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  }
}

