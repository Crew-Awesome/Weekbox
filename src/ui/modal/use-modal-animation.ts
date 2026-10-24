import React, { useState, useEffect, useCallback } from 'react'

/**
 * Manages staged mount/unmount transitions for modal entrance and exit animations.
 */
export const useModalAnimation = (isOpen: boolean, onClose: () => void) => {
  const [isRendered, setIsRendered] = useState(isOpen)
  const [isVisible, setIsVisible] = useState(false)
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen)

  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen)
    if (isOpen) {
      setIsRendered(true)
    } else {
      setIsVisible(false)
    }
  }

  const handleClose = useCallback(
    (e?: React.MouseEvent) => {
      if (e) {
        e.stopPropagation()
      }
      setIsVisible(false)
      setTimeout(() => {
        onClose()
      }, 160)
    },
    [onClose],
  )

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

  return { isRendered, isVisible, handleClose }
}
