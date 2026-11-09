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
        return 'top-[max(1rem,env(safe-area-inset-top,0px))] left-3 sm:left-5 items-start'
      case 'top-center':
        return 'top-[max(1rem,env(safe-area-inset-top,0px))] left-1/2 -translate-x-1/2 items-center'
      case 'top-right':
      default:
        return 'top-[max(1rem,env(safe-area-inset-top,0px))] right-3 sm:right-5 items-end'
      case 'bottom-left':
        return 'bottom-[max(1rem,calc(env(safe-area-inset-bottom,0px)+4.5rem))] md:bottom-5 left-3 sm:left-5 items-start'
      case 'bottom-center':
        return 'bottom-[max(1rem,calc(env(safe-area-inset-bottom,0px)+4.5rem))] md:bottom-5 left-1/2 -translate-x-1/2 items-center'
      case 'bottom-right':
        return 'bottom-[max(1rem,calc(env(safe-area-inset-bottom,0px)+4.5rem))] md:bottom-5 right-3 sm:right-5 items-end'
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
