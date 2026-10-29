import { useState, useCallback, type ReactNode } from 'react'
import {
  DEFAULT_CALLOUT_DURATION,
  MAX_CALLOUT_TOASTS,
  VARIANT_DEFAULTS,
} from '../constants'
import type {
  CalloutToastItem,
  CalloutToastOptions,
  CalloutVariant,
  CalloutDownloadInfo,
  CalloutDownloadOptions,
} from '../types'

let toastCounter = 0

export function useCalloutState() {
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
      const hasExplicitId = typeof opts.id === 'string' && opts.id.length > 0
      const id = hasExplicitId
        ? (opts.id as string)
        : `callout-${Date.now()}-${++toastCounter}`

      setToasts((prev) => {
        const index = prev.findIndex((t) => t.id === id)
        const existing = index >= 0 ? prev[index] : undefined

        const newItem: CalloutToastItem = {
          id,
          variant,
          title:
            opts.title !== undefined
              ? opts.title
              : (existing?.title ?? variantDefault.title),
          message: opts.message,
          icon:
            opts.icon !== undefined
              ? opts.icon
              : (existing?.icon ?? variantDefault.icon),
          shape: opts.shape || existing?.shape || 'rounded',
          duration:
            opts.duration !== undefined
              ? opts.duration
              : (existing?.duration ?? DEFAULT_CALLOUT_DURATION),
          canMinimize:
            opts.canMinimize !== undefined
              ? opts.canMinimize
              : (existing?.canMinimize ?? true),
          minimized:
            opts.minimized !== undefined
              ? opts.minimized
              : (existing?.minimized ?? false),
          allowClose:
            opts.allowClose !== undefined
              ? opts.allowClose
              : (existing?.allowClose ?? false),
          action: opts.action !== undefined ? opts.action : existing?.action,
          position: opts.position || existing?.position || 'top-right',
          download:
            opts.download !== undefined ? opts.download : existing?.download,
          createdAt: existing?.createdAt ?? Date.now(),
        }

        if (existing) {
          const next = prev.slice()
          next[index] = newItem
          return next
        }

        const next = [...prev, newItem]
        return next.length > MAX_CALLOUT_TOASTS
          ? next.slice(next.length - MAX_CALLOUT_TOASTS)
          : next
      })

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
        message: opts.message !== undefined ? opts.message : '',
        duration: opts.duration !== undefined ? opts.duration : 0,
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
                  ? 'Ready to play.'
                  : t.message,
            variant: isCompleted ? 'tertiary' : t.variant,
            download: updatedDownload,
            duration: isCompleted && t.duration === 0 ? 5000 : t.duration,
          }
        }),
      )
    },
    [],
  )

  return {
    toasts,
    show,
    secondary,
    primary,
    tertiary,
    error,
    surface,
    download,
    updateDownload,
    dismiss,
    dismissAll,
    toggleMinimize,
    minimize,
    restore,
    minimizeAll,
    restoreAll,
  }
}

