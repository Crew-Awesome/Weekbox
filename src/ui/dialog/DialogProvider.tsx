import React, { useState, useMemo, useCallback } from 'react'
import {
  DialogContext,
  type SystemDialogOptions,
} from './context'
import { SystemDialog } from './SystemDialog'

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

