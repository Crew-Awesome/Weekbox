import React from 'react'
import { Modal } from '@/ui/modal'

export interface AboutModalProps {
  isOpen: boolean
  onClose: () => void
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  const currentPlatform =
    typeof window !== 'undefined' && window.host
      ? window.host.platform
      : 'web'

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="About WeekBox"
      actions={
        <m3e-button variant="filled" onClick={onClose}>
          Close
        </m3e-button>
      }
    >
      <div className="flex flex-col gap-3 py-1">
        <div className="flex items-center gap-3">
          <img
            src="/imgs/icons/app/launcher-icon.png"
            alt="WeekBox"
            className="w-10 h-10 object-contain rounded-xl"
          />
          <div>
            <h3 className="font-semibold text-base">WeekBox Architecture</h3>
            <p
              className="text-xs"
              style={{ color: 'var(--md-sys-color-on-surface-variant)' }}
            >
              Version 3.0.0 — Material 3 Expressive
            </p>
          </div>
        </div>
        <p
          className="text-xs leading-relaxed mt-2"
          style={{ color: 'var(--md-sys-color-on-surface-variant)' }}
        >
          High-performance cross-platform architecture with complete React
          decoupling through native host adapters for Neutralinojs (Desktop) and
          Capacitor (Android/Mobile).
        </p>
        <div
          className="p-3 rounded-xl flex items-center justify-between text-xs"
          style={{
            backgroundColor: 'var(--md-sys-color-surface-container)',
          }}
        >
          <span className="font-medium">Active environment:</span>
          <span
            className="font-mono font-bold uppercase px-2 py-0.5 rounded-md"
            style={{
              backgroundColor: 'var(--md-sys-color-primary-container)',
              color: 'var(--md-sys-color-on-primary-container)',
            }}
          >
            {currentPlatform}
          </span>
        </div>
      </div>
    </Modal>
  )
}
