import React from 'react'
import { createPortal } from 'react-dom'
import { CalloutToast } from './CalloutToast'
import type { CalloutToastItem, CalloutPosition } from './types'

export interface CalloutContainerProps {
  toasts: CalloutToastItem[]
  onDismiss: (id: string) => void
  onToggleMinimize?: (id: string) => void
  position?: CalloutPosition
}

export const CalloutContainer: React.FC<CalloutContainerProps> = ({
  toasts,
  onDismiss,
  onToggleMinimize,
  position = 'top-right',
}) => {
  if (typeof document === 'undefined' || toasts.length === 0) {
    return null
  }

  const getPositionClasses = (pos: CalloutPosition) => {
    switch (pos) {
      case 'top-left':
        return 'top-4 left-4 sm:top-5 sm:left-5 items-start'
      case 'top-center':
        return 'top-4 left-1/2 -translate-x-1/2 items-center'
      case 'top-right':
      default:
        return 'top-4 right-4 sm:top-5 sm:right-5 items-end'
      case 'bottom-left':
        return 'bottom-4 left-4 sm:bottom-5 sm:left-5 items-start'
      case 'bottom-center':
        return 'bottom-4 left-1/2 -translate-x-1/2 items-center'
      case 'bottom-right':
        return 'bottom-4 right-4 sm:bottom-5 sm:right-5 items-end'
    }
  }

  const content = (
    <div
      className={`fixed z-[999999] pointer-events-none flex flex-col gap-2.5 w-[calc(100vw-1.5rem)] sm:w-[370px] max-w-[390px] ${getPositionClasses(
        position,
      )}`}
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <CalloutToast
          key={toast.id}
          toast={toast}
          onDismiss={onDismiss}
          onToggleMinimize={onToggleMinimize}
        />
      ))}
    </div>
  )

  const rootElement =
    document.getElementById('callout-root') || document.body

  return createPortal(content, rootElement)
}
