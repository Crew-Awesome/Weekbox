import type { ReactNode } from 'react'

export type CalloutVariant = 'secondary' | 'primary' | 'tertiary' | 'error' | 'surface'

export type CalloutShape = 'rounded' | 'square'

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
  progress: number
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
  id?: string
  variant?: CalloutVariant
  title?: string
  message: string | ReactNode
  icon?: string | null
  shape?: CalloutShape
  duration?: number
  canMinimize?: boolean
  minimized?: boolean
  allowClose?: boolean
  action?: CalloutAction
  position?: CalloutPosition
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
