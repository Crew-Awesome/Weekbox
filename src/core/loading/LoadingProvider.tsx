import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from 'react'
import { useSmoothProgress } from '@/utils/hooks/use-smooth-progress'
import { LoadingContext } from './context'
import { LoadingScreen } from './LoadingScreen'
import {
  getStartupSnapshot,
  subscribeStartupLoad,
} from './startup-loader'

export const LoadingProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const initialSnapshot = getStartupSnapshot()
  const [isLoading, setIsLoading] = useState(!initialSnapshot.isCompleted)
  const [isFadingOut, setIsFadingOut] = useState(false)
  const [isAppReady, setIsAppReady] = useState(initialSnapshot.isReadyToMount)
  const [targetProgress, setTargetProgress] = useState(initialSnapshot.progress)
  const [message, setMessage] = useState(initialSnapshot.message)
  const [completionRequested, setCompletionRequested] = useState(
    initialSnapshot.isCompleted,
  )
  const fadeoutTimerRef = useRef<number | null>(null)
  const hideSafetyTimerRef = useRef<number | null>(null)
  const completionCallbackRef = useRef<(() => void) | undefined>(undefined)
  const hasStartedFadeRef = useRef(false)

  const smoothProgress = useSmoothProgress(targetProgress, {
    isActive: isLoading && !isFadingOut,
    maxRatePerSec: 48,
    easing: 4.2,
    smoothBackward: false,
  })

  const clearTimers = useCallback(() => {
    if (fadeoutTimerRef.current !== null) {
      clearTimeout(fadeoutTimerRef.current)
      fadeoutTimerRef.current = null
    }
    if (hideSafetyTimerRef.current !== null) {
      clearTimeout(hideSafetyTimerRef.current)
      hideSafetyTimerRef.current = null
    }
  }, [])

  const beginFadeout = useCallback(() => {
    if (hasStartedFadeRef.current) return
    hasStartedFadeRef.current = true
    clearTimers()
    fadeoutTimerRef.current = window.setTimeout(() => {
      setIsFadingOut(true)
      fadeoutTimerRef.current = window.setTimeout(() => {
        setIsLoading(false)
        setIsFadingOut(false)
        const cb = completionCallbackRef.current
        completionCallbackRef.current = undefined
        cb?.()
      }, 340)
    }, 120)
  }, [clearTimers])

  const triggerFadeoutAndExit = useCallback(
    (onComplete?: () => void) => {
      if (onComplete) {
        completionCallbackRef.current = onComplete
      }
      setTargetProgress(100)
      setCompletionRequested(true)
    },
    [],
  )

  useEffect(() => {
    if (!completionRequested || !isLoading || hasStartedFadeRef.current) return

    if (smoothProgress >= 99.4) {
      const rafId = requestAnimationFrame(() => {
        beginFadeout()
      })
      return () => cancelAnimationFrame(rafId)
    }

    if (hideSafetyTimerRef.current === null) {
      hideSafetyTimerRef.current = window.setTimeout(() => {
        beginFadeout()
      }, 2600)
    }
  }, [beginFadeout, completionRequested, isLoading, smoothProgress])

  useEffect(() => {
    const unsubscribe = subscribeStartupLoad((snapshot) => {
      setTargetProgress(snapshot.progress)
      setMessage(snapshot.message)
      if (snapshot.isReadyToMount) {
        setIsAppReady(true)
      }
      if (snapshot.isCompleted) {
        triggerFadeoutAndExit()
      }
    })

    return () => {
      unsubscribe()
      clearTimers()
    }
  }, [clearTimers, triggerFadeoutAndExit])

  const showLoading = useCallback(
    (msg = 'Starting WeekBox...') => {
      clearTimers()
      hasStartedFadeRef.current = false
      completionCallbackRef.current = undefined
      setCompletionRequested(false)
      setMessage(msg)
      setIsFadingOut(false)
      setIsLoading(true)
      setTargetProgress(0)
    },
    [clearTimers],
  )

  const setProgress = useCallback(
    (val: number, msg?: string) => {
      const clamped = Math.min(100, Math.max(0, val))
      setTargetProgress(clamped)
      if (msg !== undefined) {
        setMessage(msg)
      }
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
      isAppReady,
      progress: smoothProgress,
      message,
      showLoading,
      setProgress,
      hideLoading,
    }),
    [
      isLoading,
      isFadingOut,
      isAppReady,
      smoothProgress,
      message,
      showLoading,
      setProgress,
      hideLoading,
    ],
  )

  return (
    <LoadingContext.Provider value={value}>
      {children}
      <LoadingScreen
        visible={isLoading}
        isFadingOut={isFadingOut}
        progress={smoothProgress}
        message={message}
      />
    </LoadingContext.Provider>
  )
}
