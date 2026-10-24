import React, {
  useState,
  useMemo,
  useEffect,
  useCallback,
} from 'react'
import { createPortal } from 'react-dom'
import {
  DialogContext,
  type DialogType,
  type SystemDialogOptions,
} from './context'

export type { DialogType, SystemDialogOptions }

/**
 * Portal-rendered Material 3 system alert/confirmation dialog.
 */
export const SystemDialog: React.FC<{
  isOpen: boolean
  options: SystemDialogOptions | null
  onClose: () => void
}> = ({ isOpen, options, onClose }) => {
  const [cachedOptions, setCachedOptions] = useState<SystemDialogOptions | null>(
    options,
  )
  const [prevOptions, setPrevOptions] = useState<SystemDialogOptions | null>(
    options,
  )
  const [isRendered, setIsRendered] = useState(isOpen)
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen)
  const [isVisible, setIsVisible] = useState(false)

  if (options !== prevOptions) {
    setPrevOptions(options)
    if (options) {
      setCachedOptions(options)
    }
  }

  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen)
    if (isOpen) {
      setIsRendered(true)
    } else {
      setIsVisible(false)
    }
  }

  const handleClose = useCallback(() => {
    setIsVisible(false)
    setTimeout(() => {
      onClose()
    }, 160)
  }, [onClose])

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>

    if (isOpen) {
      timeoutId = setTimeout(() => {
        setIsVisible(true)
      }, 20)
    } else {
      timeoutId = setTimeout(() => {
        setIsRendered(false)
      }, 160)
    }

    return () => {
      clearTimeout(timeoutId)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (cachedOptions?.onCancel) {
          cachedOptions.onCancel()
        }
        handleClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, cachedOptions, handleClose])

  if (!isRendered || !cachedOptions) return null

  const target =
    typeof document !== 'undefined'
      ? document.getElementById('dialog-root') || document.body
      : null

  if (!target) return null

  const type = cachedOptions.type || 'info'

  const iconName =
    type === 'error'
      ? 'error'
      : type === 'warning'
        ? 'warning'
        : type === 'confirm'
          ? 'help'
          : 'info'

  const iconColor =
    type === 'error'
      ? 'var(--md-sys-color-error)'
      : type === 'warning'
        ? 'var(--md-sys-color-tertiary)'
        : 'var(--md-sys-color-primary)'

  const handleConfirm = () => {
    if (cachedOptions.onConfirm) cachedOptions.onConfirm()
    handleClose()
  }

  const handleCancel = () => {
    if (cachedOptions.onCancel) cachedOptions.onCancel()
    handleClose()
  }

  return createPortal(
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm ${
        isVisible ? 'pointer-events-auto' : 'pointer-events-none'
      }`}
      onClick={handleCancel}
      style={{
        opacity: isVisible ? 1 : 0,
        transition: isVisible
          ? 'opacity 500ms cubic-bezier(0.2, 0.0, 0, 1.0)'
          : 'opacity 150ms cubic-bezier(0.2, 0.0, 0, 1.0)',
      }}
    >
      <div
        className="relative flex flex-col w-full max-w-[560px] min-w-[280px] bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface)] rounded-[28px] shadow-2xl border border-white/10 p-6 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{
          transformOrigin: 'top center',
          opacity: isVisible ? 1 : 0,
          transform: isVisible
            ? 'scaleY(1) translateY(0)'
            : 'scaleY(0.6) translateY(-24px)',
          transition: isVisible
            ? 'opacity 500ms cubic-bezier(0.2, 0.0, 0, 1.0), transform 500ms cubic-bezier(0.2, 0.0, 0, 1.0)'
            : 'opacity 150ms cubic-bezier(0.2, 0.0, 0, 1.0), transform 150ms cubic-bezier(0.2, 0.0, 0, 1.0)',
          willChange: 'transform, opacity',
        }}
      >
        <div
          className="flex items-center gap-3 mb-4"
          style={{
            opacity: isVisible ? 1 : 0,
            transition: isVisible
              ? 'opacity 250ms linear 50ms'
              : 'opacity 100ms linear 0ms',
          }}
        >
          <span
            className="material-symbols-rounded text-2xl"
            style={{ color: iconColor }}
          >
            {iconName}
          </span>
          <span className="text-xl font-medium tracking-tight">
            {cachedOptions.title}
          </span>
        </div>

        <div
          className="text-sm leading-relaxed mb-6"
          style={{
            color: 'var(--md-sys-color-on-surface-variant)',
            opacity: isVisible ? 1 : 0,
            transition: isVisible
              ? 'opacity 250ms linear 100ms'
              : 'opacity 100ms linear 0ms',
          }}
        >
          {cachedOptions.message}
        </div>

        <div
          className="flex items-center justify-end gap-2"
          style={{
            opacity: isVisible ? 1 : 0,
            transition: isVisible
              ? 'opacity 300ms linear 150ms'
              : 'opacity 100ms linear 0ms',
          }}
        >
          {type === 'confirm' && (
            <m3e-button variant="text" onClick={handleCancel}>
              {cachedOptions.cancelText || 'Cancel'}
            </m3e-button>
          )}
          <m3e-button
            variant={type === 'error' ? 'tonal' : 'filled'}
            onClick={handleConfirm}
          >
            {cachedOptions.confirmText || 'OK'}
          </m3e-button>
        </div>
      </div>
    </div>,
    target,
  )
}

export const DialogProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [dialogState, setDialogState] = useState<SystemDialogOptions | null>(
    null,
  )
  const [isOpen, setIsOpen] = useState(false)

  const openDialog = useCallback((opts: SystemDialogOptions) => {
    setDialogState(opts)
    setIsOpen(true)
  }, [])

  const closeDialog = useCallback(() => {
    setIsOpen(false)
  }, [])

  const handleFinishClose = useCallback(() => {
    setIsOpen(false)
    setDialogState(null)
  }, [])

  const value = useMemo(
    () => ({
      openDialog,
      closeDialog,
    }),
    [openDialog, closeDialog],
  )

  return (
    <DialogContext.Provider value={value}>
      {children}
      <SystemDialog
        isOpen={isOpen}
        options={dialogState}
        onClose={handleFinishClose}
      />
    </DialogContext.Provider>
  )
}
