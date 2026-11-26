import React, { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import gsap from 'gsap'

interface SetupBottomBarProps {
  currentStep: number
  totalSteps: number
  isNextVisible: boolean
  onBack: () => void
  onNext: () => void
  onFinish: () => void
}

const ACTION_BUTTON_STYLE = {
  '--m3e-button-container-height': '44px',
  '--m3e-button-shape-round': '999px',
  '--m3e-button-leading-space': '20px',
  '--m3e-button-trailing-space': '20px',
  '--m3e-button-icon-label-space': '8px',
  '--m3e-button-label-text-font-size': '14px',
  '--m3e-button-label-text-font-weight': '600',
  cursor: 'pointer',
} as React.CSSProperties

/**
 * Setup footer navigation with bottom-left Back button and bottom-right Next/Finish button.
 */
export const SetupBottomBar: React.FC<SetupBottomBarProps> = ({
  currentStep,
  totalSteps,
  isNextVisible,
  onBack,
  onNext,
  onFinish,
}) => {
  const { t } = useTranslation()
  const nextWrapRef = useRef<HTMLDivElement>(null)
  const isFirstStep = currentStep <= 1
  const isLastStep = currentStep >= totalSteps

  useEffect(() => {
    const el = nextWrapRef.current
    if (!el) return
    if (isNextVisible) {
      gsap.fromTo(
        el,
        { opacity: 0, y: 12, scale: 0.94 },
        { opacity: 1, y: 0, scale: 1, duration: 0.42, ease: 'power3.out' },
      )
    } else {
      gsap.set(el, { opacity: 0, y: 12, scale: 0.94 })
    }
  }, [isNextVisible])

  return (
    <footer className="w-full shrink-0 flex items-center justify-between px-6 sm:px-10 pb-6 pt-3">
      <div
        className={isFirstStep ? 'opacity-0 pointer-events-none select-none' : ''}
        aria-hidden={isFirstStep}
      >
        <m3e-button
          variant="outlined"
          onClick={onBack}
          disabled={isFirstStep}
          style={ACTION_BUTTON_STYLE}
        >
          <span
            slot="icon"
            className="material-symbols-rounded text-lg leading-none"
          >
            arrow_back
          </span>
          <span>{t('setup.nav.back')}</span>
        </m3e-button>
      </div>

      <div
        ref={nextWrapRef}
        className={!isNextVisible ? 'pointer-events-none' : ''}
        style={!isNextVisible ? { opacity: 0 } : undefined}
      >
        <m3e-button
          variant="filled"
          onClick={isLastStep ? onFinish : onNext}
          disabled={!isNextVisible}
          style={
            {
              ...ACTION_BUTTON_STYLE,
              '--m3e-button-container-color': 'var(--md-sys-color-primary)',
              '--m3e-button-label-text-color': 'var(--md-sys-color-on-primary)',
            } as React.CSSProperties
          }
        >
          <span>
            {isLastStep ? t('setup.nav.finish') : t('setup.nav.next')}
          </span>
          <span
            slot="trailing-icon"
            className="material-symbols-rounded text-lg leading-none"
          >
            {isLastStep ? 'check' : 'arrow_forward'}
          </span>
        </m3e-button>
      </div>
    </footer>
  )
}
