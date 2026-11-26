import React from 'react'
import { useTranslation } from 'react-i18next'

interface SetupTopBarProps {
  currentStep: number
  totalSteps: number
}

/**
 * Borderless, transparent top header displaying only the centered step progress counter (e.g. 1/6).
 */
export const SetupTopBar: React.FC<SetupTopBarProps> = ({
  currentStep,
  totalSteps,
}) => {
  const { t } = useTranslation()

  return (
    <header
      className="w-full shrink-0 flex items-center justify-center pt-5 pb-2 px-6 select-none bg-transparent border-0 shadow-none"
      style={{
        backgroundColor: 'transparent',
        border: 'none',
      }}
    >
      <span
        className="text-sm font-semibold tracking-wide tabular-nums"
        style={{ color: 'var(--md-sys-color-on-surface-variant)' }}
      >
        {t('setup.nav.stepLabel', { current: currentStep, total: totalSteps })}
      </span>
    </header>
  )
}
