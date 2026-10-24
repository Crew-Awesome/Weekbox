import React, {
  useState,
  useCallback,
  useMemo,
  useEffect,
  type ReactNode,
} from 'react'
import { CalloutContext } from './context'
import { CalloutContainer } from './CalloutContainer'
import {
  DEFAULT_CALLOUT_DURATION,
  VARIANT_DEFAULTS,
} from './constants'
import type {
  CalloutContextType,
  CalloutToastItem,
  CalloutToastOptions,
  CalloutVariant,
  CalloutDownloadInfo,
  CalloutDownloadOptions,
} from './types'

let toastCounter = 0

export const CalloutProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [toasts, setToasts] = useState<CalloutToastItem[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const dismissAll = useCallback(() => {
    setToasts([])
  }, [])

  const toggleMinimize = useCallback((id: string) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, minimized: !t.minimized } : t)),
    )
  }, [])

  const minimize = useCallback((id: string) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, minimized: true } : t)),
    )
  }, [])

  const restore = useCallback((id: string) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, minimized: false } : t)),
    )
  }, [])

  const minimizeAll = useCallback(() => {
    setToasts((prev) => prev.map((t) => ({ ...t, minimized: true })))
  }, [])

  const restoreAll = useCallback(() => {
    setToasts((prev) => prev.map((t) => ({ ...t, minimized: false })))
  }, [])

  const show = useCallback(
    (options: CalloutToastOptions | string): string => {
      const opts: CalloutToastOptions =
        typeof options === 'string' ? { message: options } : options

      const variant: CalloutVariant = opts.variant || 'secondary'
      const variantDefault = VARIANT_DEFAULTS[variant]
      const id = opts.id || `callout-${Date.now()}-${++toastCounter}`

      const newItem: CalloutToastItem = {
        id,
        variant,
        title: opts.title !== undefined ? opts.title : variantDefault.title,
        message: opts.message,
        icon: opts.icon !== undefined ? opts.icon : variantDefault.icon,
        shape: opts.shape || 'rounded',
        duration:
          opts.duration !== undefined
            ? opts.duration
            : DEFAULT_CALLOUT_DURATION,
        canMinimize: opts.canMinimize !== undefined ? opts.canMinimize : true,
        minimized: opts.minimized !== undefined ? opts.minimized : false,
        allowClose: opts.allowClose !== undefined ? opts.allowClose : false,
        action: opts.action,
        position: opts.position || 'bottom-right',
        download: opts.download,
        createdAt: Date.now(),
      }

      setToasts((prev) => [...prev, newItem])
      return id
    },
    [],
  )

  const secondary = useCallback(
    (
      message: string | ReactNode,
      title?: string,
      options?: Partial<CalloutToastOptions>,
    ) => {
      return show({
        ...options,
        variant: 'secondary',
        title: title !== undefined ? title : VARIANT_DEFAULTS.secondary.title,
        message,
      })
    },
    [show],
  )

  const primary = useCallback(
    (
      message: string | ReactNode,
      title?: string,
      options?: Partial<CalloutToastOptions>,
    ) => {
      return show({
        ...options,
        variant: 'primary',
        title: title !== undefined ? title : VARIANT_DEFAULTS.primary.title,
        message,
      })
    },
    [show],
  )

  const tertiary = useCallback(
    (
      message: string | ReactNode,
      title?: string,
      options?: Partial<CalloutToastOptions>,
    ) => {
      return show({
        ...options,
        variant: 'tertiary',
        title: title !== undefined ? title : VARIANT_DEFAULTS.tertiary.title,
        message,
      })
    },
    [show],
  )

  const error = useCallback(
    (
      message: string | ReactNode,
      title?: string,
      options?: Partial<CalloutToastOptions>,
    ) => {
      return show({
        ...options,
        variant: 'error',
        title: title !== undefined ? title : VARIANT_DEFAULTS.error.title,
        message,
      })
    },
    [show],
  )

  const surface = useCallback(
    (
      message: string | ReactNode,
      title?: string,
      options?: Partial<CalloutToastOptions>,
    ) => {
      return show({
        ...options,
        variant: 'surface',
        title: title !== undefined ? title : VARIANT_DEFAULTS.surface.title,
        message,
      })
    },
    [show],
  )

  const download = useCallback(
    (options: CalloutDownloadOptions | string): string => {
      const opts: CalloutDownloadOptions =
        typeof options === 'string'
          ? { title: 'Downloading', message: options, progress: 0 }
          : options

      const downloadInfo: CalloutDownloadInfo = {
        progress: opts.progress !== undefined ? opts.progress : 0,
        speed: opts.speed || '0 KB/s',
        downloaded: opts.downloaded,
        total: opts.total,
        filename: opts.filename,
        status: opts.status || 'downloading',
        onCancel: opts.onCancel,
      }

      return show({
        ...opts,
        variant: opts.variant || 'primary',
        title: opts.title || 'Downloading Mod...',
        message:
          opts.message ||
          (opts.filename
            ? `Downloading ${opts.filename}`
            : 'Please wait while download completes.'),
        duration: opts.duration !== undefined ? opts.duration : 0, // persistent by default during download
        canMinimize: opts.canMinimize !== undefined ? opts.canMinimize : true,
        allowClose: opts.allowClose !== undefined ? opts.allowClose : true,
        download: downloadInfo,
      })
    },
    [show],
  )

  const updateDownload = useCallback(
    (
      id: string,
      update: Partial<CalloutDownloadInfo> & {
        message?: string
        title?: string
      },
    ) => {
      setToasts((prev) =>
        prev.map((t) => {
          if (t.id !== id || !t.download) return t

          const newProgress =
            update.progress !== undefined
              ? update.progress
              : t.download.progress
          const isCompleted =
            newProgress >= 100 || update.status === 'completed'

          const updatedDownload: CalloutDownloadInfo = {
            ...t.download,
            ...update,
            progress: newProgress,
            status: isCompleted
              ? 'completed'
              : update.status || t.download.status,
          }

          return {
            ...t,
            title:
              update.title !== undefined
                ? update.title
                : isCompleted
                  ? 'Download Complete!'
                  : t.title,
            message:
              update.message !== undefined
                ? update.message
                : isCompleted
                  ? 'Ready to install or play.'
                  : t.message,
            variant: isCompleted ? 'tertiary' : t.variant,
            download: updatedDownload,
            // If completed, automatically auto-dismiss after 8 seconds
            duration: isCompleted && t.duration === 0 ? 8000 : t.duration,
          }
        }),
      )
    },
    [],
  )

  const downloadDemo = useCallback(
    (title = 'Psych Engine v0.7.3') => {
      const id = download({
        title: `Downloading ${title}`,
        message: 'Connecting to GameBanana server...',
        filename: `${title.replace(/\s+/g, '-')}.zip`,
        progress: 0,
        speed: '12.4 MB/s',
        downloaded: '0 MB',
        total: '148.5 MB',
      })

      let currentProg = 0
      const speeds = [
        '14.2 MB/s',
        '18.7 MB/s',
        '22.1 MB/s',
        '16.5 MB/s',
        '24.0 MB/s',
      ]
      const interval = setInterval(() => {
        currentProg += Math.floor(Math.random() * 8) + 6
        if (currentProg >= 100) {
          currentProg = 100
          clearInterval(interval)
          updateDownload(id, {
            progress: 100,
            status: 'completed',
            speed: 'Done',
            downloaded: '148.5 MB',
            total: '148.5 MB',
            title: 'Download Complete!',
            message: `${title} is ready in your library.`,
          })
        } else {
          const mb = ((currentProg / 100) * 148.5).toFixed(1)
          const spd = speeds[Math.floor(Math.random() * speeds.length)]
          updateDownload(id, {
            progress: currentProg,
            downloaded: `${mb} MB`,
            speed: spd,
            message: `Receiving data chunks (${currentProg}%)...`,
          })
        }
      }, 350)

      return id
    },
    [download, updateDownload],
  )

  const demo = useCallback(() => {
    dismissAll()
    const variants: CalloutVariant[] = [
      'secondary',
      'primary',
      'tertiary',
      'error',
      'surface',
    ]

    variants.forEach((v, index) => {
      setTimeout(() => {
        show({
          variant: v,
          title: VARIANT_DEFAULTS[v].title,
          message: VARIANT_DEFAULTS[v].description,
          icon: VARIANT_DEFAULTS[v].icon,
          duration: 7500,
          canMinimize: true,
        })
      }, index * 280)
    })
  }, [dismissAll, show])

  const contextValue: CalloutContextType & { demo: () => void } = useMemo(
    () => ({
      toasts,
      show,
      secondary,
      primary,
      tertiary,
      error,
      surface,
      download,
      updateDownload,
      downloadDemo,
      dismiss,
      dismissAll,
      toggleMinimize,
      minimize,
      restore,
      minimizeAll,
      restoreAll,
      demo,
    }),
    [
      toasts,
      show,
      secondary,
      primary,
      tertiary,
      error,
      surface,
      download,
      updateDownload,
      downloadDemo,
      dismiss,
      dismissAll,
      toggleMinimize,
      minimize,
      restore,
      minimizeAll,
      restoreAll,
      demo,
    ],
  )

  // Expose on global window object for DevTools console execution!
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.callout = contextValue
      window.toast = contextValue
    }
  }, [contextValue])

  return (
    <CalloutContext.Provider value={contextValue}>
      {children}
      <CalloutContainer
        toasts={toasts}
        onDismiss={dismiss}
        onToggleMinimize={toggleMinimize}
      />
    </CalloutContext.Provider>
  )
}
