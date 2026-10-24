import React, { useState } from 'react'
import { Modal } from '@/ui/modal'
import { getActiveTheme, applyTheme, type ThemeMode } from '@/utils/theme'

export interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTheme, setActiveTheme] = useState<ThemeMode>(getActiveTheme)

  const handleSetTheme = (theme: ThemeMode) => {
    setActiveTheme(theme)
    applyTheme(theme)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Settings"
      actions={
        <m3e-button variant="filled" onClick={onClose}>
          Save & Close
        </m3e-button>
      }
    >
      <div className="flex flex-col gap-4 py-1">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium">Application Theme</span>
          <p
            className="text-xs"
            style={{ color: 'var(--md-sys-color-on-surface-variant)' }}
          >
            Select the Material Design 3 visual appearance
          </p>
          <div className="flex items-center gap-2 pt-2">
            <m3e-button
              variant={activeTheme === 'light' ? 'filled' : 'outlined'}
              onClick={() => handleSetTheme('light')}
            >
              Light Mode
            </m3e-button>
            <m3e-button
              variant={activeTheme === 'dark' ? 'filled' : 'outlined'}
              onClick={() => handleSetTheme('dark')}
            >
              Dark Mode
            </m3e-button>
          </div>
        </div>

        <div
          className="h-[1px] w-full"
          style={{ backgroundColor: 'var(--md-sys-color-outline-variant)' }}
        />

        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-medium">Web Inspector</span>
            <p
              className="text-xs"
              style={{ color: 'var(--md-sys-color-on-surface-variant)' }}
            >
              Enabled for runtime development and debugging
            </p>
          </div>
          <m3e-switch checked disabled />
        </div>
      </div>
    </Modal>
  )
}
