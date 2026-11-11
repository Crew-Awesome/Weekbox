import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

export interface CreateProfileDialogProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (name: string) => void
}

export const CreateProfileDialog: React.FC<CreateProfileDialogProps> = ({
  isOpen,
  onClose,
  onCreate,
}) => {
  const [name, setName] = useState('')

  useEffect(() => {
    if (isOpen) {
      setName('')
    }
  }, [isOpen])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleConfirm = () => {
    const trimmed = name.trim()
    if (trimmed) {
      onCreate(trimmed)
      onClose()
    }
  }

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleConfirm()
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-[var(--md-sys-color-scrim)]/50 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col w-full max-w-[min(460px,calc(100vw-32px))] bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface)] rounded-[24px] shadow-2xl border border-[var(--md-sys-color-outline-variant)]/30 p-5 sm:p-6 overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)]">
            <span className="material-symbols-rounded text-xl">
              create_new_folder
            </span>
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold tracking-tight">
              New Folder
            </h3>
            <p className="text-xs text-[var(--md-sys-color-on-surface-variant)]">
              Create a collection to organize your mods
            </p>
          </div>
        </div>

        <div className="my-3">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--md-sys-color-primary)] mb-1.5 pl-1">
            Folder Name
          </label>
          <input
            type="text"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="e.g. Favorites, Hard Mods, Psych Packs..."
            className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline-variant)]/40 focus:border-[var(--md-sys-color-primary)] text-sm text-[var(--md-sys-color-on-surface)] placeholder:text-[var(--md-sys-color-on-surface-variant)]/50 outline-none transition-colors"
          />
        </div>

        <div className="flex items-center justify-end gap-2 mt-4 pt-2 border-t border-[var(--md-sys-color-outline-variant)]/20">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-surface-container)] cursor-pointer active:scale-95 transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!name.trim()}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] disabled:opacity-40 hover:opacity-90 cursor-pointer active:scale-95 transition-all shadow-xs"
          >
            Create Folder
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
