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
  position = 'bottom-right',
}) => {
  if (typeof document === 'undefined' || toasts.length === 0) {
    return null
  }

  const getPositionClasses = (pos: CalloutPosition) => {
    switch (pos) {
      case 'top-left':
        return 'top-4 left-4 sm:top-6 sm:left-6 items-start'
      case 'top-center':
        return 'top-4 left-1/2 -translate-x-1/2 items-center'
      case 'top-right':
        return 'top-4 right-4 sm:top-6 sm:right-6 items-end'
      case 'bottom-left':
        return 'bottom-4 left-4 sm:bottom-6 sm:left-6 items-start'
      case 'bottom-center':
        return 'bottom-4 left-1/2 -translate-x-1/2 items-center'
      case 'bottom-right':
      default:
        return 'bottom-4 right-3 sm:bottom-6 sm:right-6 items-end'
    }
  }

  const content = (
    <div
      className={`fixed z-[999999] pointer-events-none flex flex-col gap-3 w-[calc(100vw-1.5rem)] sm:w-[420px] max-w-full ${getPositionClasses(
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
