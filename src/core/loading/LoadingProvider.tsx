import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from 'react'
import { LoadingContext } from './context'
import { LoadingScreen } from './LoadingScreen'

export const LoadingProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isLoading, setIsLoading] = useState(true)
  const [isFadingOut, setIsFadingOut] = useState(false)
  const [progress, setProgressState] = useState(0)
  const [message, setMessage] = useState('Starting WeekBox...')
  const timerRef = useRef<number | null>(null)
  const fadeoutTimerRef = useRef<number | null>(null)

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const clearFadeoutTimer = useCallback(() => {
    if (fadeoutTimerRef.current !== null) {
      clearTimeout(fadeoutTimerRef.current)
      fadeoutTimerRef.current = null
    }
  }, [])

  const triggerFadeoutAndExit = useCallback(
    (onComplete?: () => void) => {
      clearTimer()
      clearFadeoutTimer()
      setProgressState(100)
      fadeoutTimerRef.current = window.setTimeout(() => {
        setIsFadingOut(true)
        fadeoutTimerRef.current = window.setTimeout(() => {
          setIsLoading(false)
          setIsFadingOut(false)
          if (onComplete) onComplete()
        }, 600)
      }, 200)
    },
    [clearTimer, clearFadeoutTimer],
  )

  const startProgressTimer = useCallback(
    (onComplete?: () => void) => {
      clearTimer()
      clearFadeoutTimer()

      const intervalTime = 30
      timerRef.current = window.setInterval(() => {
        setProgressState((prev) => {
          if (prev >= 100) {
            clearTimer()
            return 100
          }
          const increment = prev < 35 ? 1.5 : prev < 70 ? 1.2 : 0.8
          const next = prev + increment
          if (next >= 100) {
            clearTimer()
            triggerFadeoutAndExit(onComplete)
            return 100
          }
          return next
        })
      }, intervalTime)
    },
    [clearTimer, clearFadeoutTimer, triggerFadeoutAndExit],
  )

  useEffect(() => {
    startProgressTimer()
    return () => {
      clearTimer()
      clearFadeoutTimer()
    }
  }, [startProgressTimer, clearTimer, clearFadeoutTimer])

  const showLoading = useCallback(
    (msg = 'Starting WeekBox...') => {
      setMessage(msg)
      setIsFadingOut(false)
      setIsLoading(true)
      setProgressState(0)
      startProgressTimer()
    },
    [startProgressTimer],
  )

  const setProgress = useCallback(
    (val: number) => {
      const clamped = Math.min(100, Math.max(0, val))
      setProgressState(clamped)
      if (clamped >= 100) {
        triggerFadeoutAndExit()
      }
    },
    [triggerFadeoutAndExit],
  )

  const hideLoading = useCallback(() => {
    triggerFadeoutAndExit()
  }, [triggerFadeoutAndExit])

  const value = useMemo(
    () => ({
      isLoading,
      isFadingOut,
      progress,
      message,
      showLoading,
      setProgress,
      hideLoading,
    }),
    [isLoading, isFadingOut, progress, message, showLoading, setProgress, hideLoading],
  )

  return (
    <LoadingContext.Provider value={value}>
      {children}
      <LoadingScreen
        visible={isLoading}
        isFadingOut={isFadingOut}
        progress={progress}
        message={message}
      />
    </LoadingContext.Provider>
  )
}
