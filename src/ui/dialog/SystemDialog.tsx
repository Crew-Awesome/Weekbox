import React, { useState, useEffect, useCallback } from 'react'
import type { SystemDialogOptions, DialogType } from './context'
import { DialogModal } from './DialogModal'

export type { DialogType, SystemDialogOptions }
export { DialogProvider } from './DialogProvider'

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
    if (isOpen) {
      const timeoutId = setTimeout(() => setIsVisible(true), 20)
      return () => clearTimeout(timeoutId)
    }

    if (!isRendered) return

    const timeoutId = setTimeout(() => setIsRendered(false), 160)
    return () => clearTimeout(timeoutId)
  }, [isOpen, isRendered])

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

  return (
    <DialogModal
      isVisible={isVisible}
      cachedOptions={cachedOptions}
      target={target}
      handleClose={handleClose}
    />
  )
}
