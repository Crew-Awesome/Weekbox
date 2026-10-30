import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from 'react'
import { createPortal } from 'react-dom'
import './loading.css'
import { host } from '@/core/host'
import {
  LoadingContext,
  type LoadingContextType,
} from './context'

export type { LoadingContextType }

const MORPH_SHAPES = [
  '12-sided-cookie',
  '9-sided-cookie',
  '8-leaf-clover',
  '7-sided-cookie',
  '6-sided-cookie',
  '4-sided-cookie',
  '4-leaf-clover',
  'arch',
  'arrow',
  'soft-burst',
  'square',
  'circle',
  'triangle',
]

export interface LoadingScreenProps {
  visible?: boolean
  isFadingOut?: boolean
  progress?: number
  message?: string
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  visible = true,
  isFadingOut = false,
  progress = 0,
  message = 'Starting WeekBox...',
}) => {
  const [shapeIndex, setShapeIndex] = useState(0)
  const [appVersion, setAppVersion] = useState<string>('')

  useEffect(() => {
    let isMounted = true
    const fetchVersion = async () => {
      try {
        const currentHost =
          (typeof window !== 'undefined' && window.host) || host
        const ver = await currentHost.getAppVersion()
        if (isMounted && ver) {
          setAppVersion(ver)
        }
      } catch {
        if (isMounted) setAppVersion('1.0.0')
      }
    }
    fetchVersion()
    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (!visible) return
    const interval = setInterval(() => {
      setShapeIndex((prev) => (prev + 1) % MORPH_SHAPES.length)
    }, 1200)
    return () => clearInterval(interval)
  }, [visible])

  if (!visible) return null

  const target =
    typeof document !== 'undefined'
      ? document.getElementById('loading-root') || document.body
      : null

  if (!target) return null

  const displayProgress = Math.min(100, Math.max(0, progress))
  const currentShape = MORPH_SHAPES[shapeIndex]

  return createPortal(
    <div
      role="progressbar"
      aria-valuenow={displayProgress}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={message}
      className={`fixed inset-0 z-[100] flex flex-col justify-end overflow-hidden select-none bg-black ${
        isFadingOut
          ? 'opacity-0 scale-[1.015] pointer-events-none'
          : 'opacity-100 scale-100 pointer-events-auto'
      }`}
      style={{
        transitionProperty: 'opacity, transform',
        transitionDuration: '600ms',
        transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <div
        className="absolute -inset-6 z-0 bg-center bg-cover bg-no-repeat pointer-events-none"
        style={{
          backgroundImage: 'url(/imgs/loading-screen.webp)',
          animation:
            'startup-loading-background-reveal 4.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        }}
      />

      <div
        className="absolute inset-0 z-0 bg-black/40 pointer-events-none"
        style={{
          animation:
            'startup-loading-overlay-reveal 4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        }}
      />

      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(to top, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0.4) 20%, rgba(0, 0, 0, 0) 50%)',
        }}
      />

      {appVersion && (
        <span className="absolute top-6 right-6 md:top-8 md:right-10 z-20 text-xs md:text-sm font-semibold tracking-wider text-white/75 drop-shadow-[0_1px_4px_rgba(0,0,0,0.85)] pointer-events-none tabular-nums select-none">
          v{appVersion}
        </span>
      )}

      <div className="relative z-10 w-full px-6 md:px-10 pb-6 flex items-center gap-4">
        <div className="shrink-0 flex items-center justify-center">
          <m3e-shape
            name={currentShape}
            style={
              {
                '--m3e-shape-size': '54px',
                '--m3e-shape-container-color': 'var(--md-sys-color-primary)',
                '--m3e-shape-transition':
                  'clip-path 0.9s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              } as React.CSSProperties
            }
          >
            <span
              className="font-mono font-bold text-xs select-none tracking-tight flex items-center justify-center w-full h-full text-center drop-shadow-sm"
              style={{
                position: 'absolute',
                inset: 0,
                color: 'var(--md-sys-color-on-primary)',
              }}
            >
              {Math.round(displayProgress)}%
            </span>
          </m3e-shape>
        </div>

        <div className="flex-1 flex flex-col justify-center gap-2">
          <div className="flex justify-end w-full pr-1">
            <span className="text-xs md:text-sm font-medium tracking-wide text-white/90 drop-shadow-[0_1px_4px_rgba(0,0,0,0.85)] truncate text-right">
              {message}
            </span>
          </div>

          <m3e-linear-progress-indicator
            variant="wavy"
            value={displayProgress}
            max="100"
            style={
              {
                width: '100%',
                display: 'block',
                '--m3e-linear-progress-indicator-thickness': '5.5px',
                '--m3e-linear-wavy-progress-indicator-amplitude': '3px',
                '--m3e-linear-wavy-progress-indicator-wavelength': '20px',
                '--m3e-progress-indicator-color':
                  'var(--md-sys-color-primary)',
                '--m3e-progress-indicator-track-color':
                  'rgba(255, 255, 255, 0.25)',
              } as React.CSSProperties
            }
          />
        </div>
      </div>
    </div>,
    target,
  )
}

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
