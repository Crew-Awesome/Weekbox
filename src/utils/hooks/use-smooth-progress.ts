import { useEffect, useRef, useState } from 'react'

export interface UseSmoothProgressOptions {
  /** Whether progress updates should animate smoothly toward the target value. */
  isActive?: boolean
  /** Maximum speed in percentage points per second to prevent abrupt jumps. */
  maxRatePerSec?: number
  /** Exponential catch-up stiffness (higher catches up faster). */
  easing?: number
  /** When true, downward progress changes also glide smoothly while active. */
  smoothBackward?: boolean
}

/**
 * Smoothly interpolates any discrete progress percentage frame-by-frame so
 * progress bars advance progressively instead of snapping abruptly.
 */
export function useSmoothProgress(
  targetProgress: number,
  activeOrOptions: boolean | UseSmoothProgressOptions = true,
): number {
  const options: UseSmoothProgressOptions =
    typeof activeOrOptions === 'boolean'
      ? { isActive: activeOrOptions }
      : activeOrOptions

  const isActive = options.isActive ?? true
  const maxRatePerSec = options.maxRatePerSec ?? 72
  const easing = options.easing ?? 5.5
  const smoothBackward = options.smoothBackward ?? true

  const clampedTarget = Math.max(0, Math.min(100, targetProgress))
  const [currentProgress, setCurrentProgress] = useState(clampedTarget)
  const currentRef = useRef(clampedTarget)
  const targetRef = useRef(clampedTarget)
  const rafRef = useRef<number | null>(null)
  const lastTimeRef = useRef<number | null>(null)

  useEffect(() => {
    targetRef.current = clampedTarget

    const cancelPendingFrame = () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      lastTimeRef.current = null
    }

    if (!isActive) {
      cancelPendingFrame()
      if (currentRef.current !== clampedTarget) {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null
          currentRef.current = targetRef.current
          setCurrentProgress(targetRef.current)
        })
      }
      return cancelPendingFrame
    }

    if (
      !smoothBackward &&
      (clampedTarget === 0 || clampedTarget < currentRef.current - 15)
    ) {
      cancelPendingFrame()
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null
        currentRef.current = targetRef.current
        setCurrentProgress(targetRef.current)
      })
      return cancelPendingFrame
    }

    const step = (now: number) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = now
      }
      const dt = Math.max(0.001, Math.min((now - lastTimeRef.current) / 1000, 0.05))
      lastTimeRef.current = now

      const target = targetRef.current
      const diff = target - currentRef.current

      if (Math.abs(diff) < 0.08) {
        currentRef.current = target
        setCurrentProgress(target)
        rafRef.current = null
        lastTimeRef.current = null
        return
      }

      const expStep = diff * (1 - Math.exp(-easing * dt))
      const maxDelta = maxRatePerSec * dt
      const cappedStep =
        Math.abs(expStep) > maxDelta ? Math.sign(diff) * maxDelta : expStep

      const minStep = Math.sign(diff) * Math.min(Math.abs(diff), 8 * dt)
      const nextStep =
        Math.abs(cappedStep) < Math.abs(minStep) ? minStep : cappedStep

      const nextValue = Math.max(0, Math.min(100, currentRef.current + nextStep))
      currentRef.current = nextValue
      setCurrentProgress(nextValue)

      rafRef.current = requestAnimationFrame(step)
    }

    if (rafRef.current === null && Math.abs(clampedTarget - currentRef.current) >= 0.08) {
      lastTimeRef.current = null
      rafRef.current = requestAnimationFrame(step)
    }

    return () => {
      // Keep running seamlessly across incremental progress ticks; cleanup runs on unmount or config change.
    }
  }, [clampedTarget, easing, isActive, maxRatePerSec, smoothBackward])

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [])

  return currentProgress
}
