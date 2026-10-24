import { createContext, useContext } from 'react'

export type DialogType = 'info' | 'warning' | 'error' | 'confirm'

export interface SystemDialogOptions {
  type?: DialogType
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm?: () => void
  onCancel?: () => void
}

export interface DialogContextType {
  openDialog: (options: SystemDialogOptions) => void
  closeDialog: () => void
}

export const DialogContext = createContext<DialogContextType>({
  openDialog: () => {},
  closeDialog: () => {},
})

export const useSystemDialog = () => useContext(DialogContext)
