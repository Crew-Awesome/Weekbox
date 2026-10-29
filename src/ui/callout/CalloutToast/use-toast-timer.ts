import { useEffect, useRef, useCallback } from 'react'

interface UseToastTimerOptions {
  duration: number
  isMinimized: boolean
  triggerDismiss: () => void
}

export function useToastTimer({
  duration,
  isMinimized,
  triggerDismiss,
}: UseToastTimerOptions) {
  const isPausedRef = useRef(false)
  const remainingTimeRef = useRef(duration)
  const timerStartRef = useRef<number | null>(null)
  const timeoutIdRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (duration <= 0 || isPausedRef.current || isMinimized) {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current)
      }
      return
    }

    remainingTimeRef.current = duration
    timerStartRef.current = Date.now()
    timeoutIdRef.current = setTimeout(() => {
      triggerDismiss()
    }, remainingTimeRef.current)

    return () => {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current)
      }
    }
  }, [duration, isMinimized, triggerDismiss])

  const pauseTimer = useCallback(() => {
    if (duration <= 0 || isMinimized) return
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current)
    }
    if (timerStartRef.current !== null) {
      const elapsed = Date.now() - timerStartRef.current
      remainingTimeRef.current = Math.max(0, remainingTimeRef.current - elapsed)
    }
    isPausedRef.current = true
  }, [duration, isMinimized])

  const resumeTimer = useCallback(() => {
    if (duration <= 0 || isMinimized) return
    isPausedRef.current = false
    timerStartRef.current = Date.now()
    timeoutIdRef.current = setTimeout(() => {
      triggerDismiss()
    }, remainingTimeRef.current)
  }, [duration, isMinimized, triggerDismiss])

  const clearTimer = useCallback(() => {
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current)
    }
  }, [])

  return {
    pauseTimer,
    resumeTimer,
    clearTimer,
  }
}

