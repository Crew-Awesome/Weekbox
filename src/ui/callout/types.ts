import type { ReactNode } from 'react'

/**
 * Visual appearance variants supported by m3e-callout:
 * - secondary (default): Balanced visual emphasis suitable for general informational content.
 * - primary: Stronger emphasis highlighting information of higher importance.
 * - tertiary: Alternative emphasis for category-specific or complementary information.
 * - error: Reserved for critical or blocking information.
 * - surface: Neutral presentation aligned with the surrounding layout.
 */
export type CalloutVariant = 'secondary' | 'primary' | 'tertiary' | 'error' | 'surface'

/** Corner shape for the callout container */
export type CalloutShape = 'rounded' | 'square'

/** Screen placement position for toasts */
export type CalloutPosition =
  | 'top-right'
  | 'top-left'
  | 'top-center'
  | 'bottom-right'
  | 'bottom-left'
  | 'bottom-center'

export interface CalloutAction {
  label: string
  onClick: (toast: CalloutToastItem) => void
}

export interface CalloutDownloadInfo {
  progress: number // 0 to 100
  speed?: string
  downloaded?: string
  total?: string
  filename?: string
  status?: 'downloading' | 'completed' | 'paused' | 'error'
  onCancel?: () => void
}

export interface CalloutDownloadOptions extends Omit<CalloutToastOptions, 'message'> {
  message?: string | ReactNode
  progress?: number
  speed?: string
  downloaded?: string
  total?: string
  filename?: string
  status?: 'downloading' | 'completed' | 'paused' | 'error'
  onCancel?: () => void
}

export interface CalloutToastOptions {
  /** Unique identifier; if omitted, an auto-generated ID is used */
  id?: string
  /** The M3E appearance variant */
  variant?: CalloutVariant
  /** Title / heading displayed in slot="label" */
  title?: string
  /** Message content displayed in the callout body */
  message: string | ReactNode
  /** Material Symbols icon name, or null to omit */
  icon?: string | null
  /** Corner shape: 'rounded' (default) or 'square' */
  shape?: CalloutShape
  /** Auto-dismiss duration in milliseconds. Set to 0 to make it persistent */
  duration?: number
  /** Whether the callout can be minimized. Defaults to true */
  canMinimize?: boolean
  /** Initial minimized state. Defaults to false */
  minimized?: boolean
  /** Whether to show a permanent close button. Defaults to false (toasts minimize rather than close) */
  allowClose?: boolean
  /** Optional interactive action button */
  action?: CalloutAction
  /** Screen position. Defaults to 'bottom-right' on desktop */
  position?: CalloutPosition
  /** Download progress information (enables morphing shape progress indicator) */
  download?: CalloutDownloadInfo
}

export interface CalloutToastItem extends Required<Omit<CalloutToastOptions, 'action' | 'id' | 'icon' | 'title' | 'download'>> {
  id: string
  title?: string
  icon?: string | null
  action?: CalloutAction
  download?: CalloutDownloadInfo
  createdAt: number
}

export interface CalloutContextType {
  toasts: CalloutToastItem[]
  show: (options: CalloutToastOptions | string) => string
  secondary: (message: string | ReactNode, title?: string, options?: Partial<CalloutToastOptions>) => string
  primary: (message: string | ReactNode, title?: string, options?: Partial<CalloutToastOptions>) => string
  tertiary: (message: string | ReactNode, title?: string, options?: Partial<CalloutToastOptions>) => string
  error: (message: string | ReactNode, title?: string, options?: Partial<CalloutToastOptions>) => string
  surface: (message: string | ReactNode, title?: string, options?: Partial<CalloutToastOptions>) => string
  download: (options: CalloutDownloadOptions | string) => string
  updateDownload: (
    id: string,
    update: Partial<CalloutDownloadInfo> & { message?: string; title?: string },
  ) => void
  downloadDemo: (title?: string) => string
  dismiss: (id: string) => void
  dismissAll: () => void
  toggleMinimize: (id: string) => void
  minimize: (id: string) => void
  restore: (id: string) => void
  minimizeAll: () => void
  restoreAll: () => void
}

declare global {
  interface Window {
    callout: CalloutContextType & {
      demo: () => void
    }
    toast: CalloutContextType & {
      demo: () => void
    }
  }
}
