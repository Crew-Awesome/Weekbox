import React from 'react'
import { useTranslation } from 'react-i18next'
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '@/core/i18n'
import { LanguageFlagIcon } from './LanguageFlagIcon'

interface StepLanguageProps {
  selectedLanguage: SupportedLanguage
  onSelectLanguage: (lang: SupportedLanguage) => void
}

/**
 * Step 2: Preferred language picker with country flags and live i18next switching.
 */
export const StepLanguage: React.FC<StepLanguageProps> = ({
  selectedLanguage,
  onSelectLanguage,
}) => {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col items-center text-center w-full max-w-3xl mx-auto px-4 gap-6">
      <div className="flex flex-col gap-2">
        <h2
          className="text-2xl sm:text-3xl font-bold tracking-tight"
          style={{ color: 'var(--md-sys-color-on-background)' }}
        >
          {t('setup.language.title')}
        </h2>
        <p
          className="text-sm sm:text-base"
          style={{ color: 'var(--md-sys-color-on-surface-variant)' }}
        >
          {t('setup.language.subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 w-full">
        {SUPPORTED_LANGUAGES.map((lang) => {
          const isSelected = selectedLanguage === lang.code

          return (
            <m3e-card
              key={lang.code}
              variant={isSelected ? 'filled' : 'outlined'}
              actionable
              role="radio"
              aria-checked={isSelected}
              tabIndex={0}
              onClick={() => onSelectLanguage(lang.code)}
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onSelectLanguage(lang.code)
                }
              }}
              className="w-full text-left cursor-pointer transition-transform active:scale-[0.985]"
              style={
                {
                  '--m3e-card-shape': '18px',
                  '--m3e-filled-card-container-color':
                    'var(--md-sys-color-secondary-container)',
                  '--m3e-filled-card-text-color':
                    'var(--md-sys-color-on-secondary-container)',
                  '--m3e-outlined-card-container-color':
                    'var(--md-sys-color-surface-container)',
                  '--m3e-outlined-card-outline-color':
                    'var(--md-sys-color-outline-variant)',
                } as React.CSSProperties
              }
            >
              <div className="flex items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-3.5 min-w-0">
                  <LanguageFlagIcon code={lang.code} className="w-10 h-7" />
                  <div className="flex flex-col min-w-0">
                    <span
                      className="text-base font-bold truncate"
                      style={{
                        color: isSelected
                          ? 'var(--md-sys-color-on-secondary-container)'
                          : 'var(--md-sys-color-on-surface)',
                      }}
                    >
                      {lang.nativeName}
                    </span>
                    <span
                      className="text-xs font-medium truncate"
                      style={{
                        color: isSelected
                          ? 'var(--md-sys-color-on-secondary-container)'
                          : 'var(--md-sys-color-on-surface-variant)',
                        opacity: isSelected ? 0.85 : 1,
                      }}
                    >
                      {lang.englishName} · {lang.regionLabel}
                    </span>
                  </div>
                </div>

                <span
                  className="material-symbols-rounded text-xl shrink-0"
                  style={{
                    color: isSelected
                      ? 'var(--md-sys-color-primary)'
                      : 'var(--md-sys-color-outline)',
                    fontVariationSettings: isSelected
                      ? "'FILL' 1"
                      : "'FILL' 0",
                  }}
                >
                  {isSelected ? 'check_circle' : 'radio_button_unchecked'}
                </span>
              </div>
            </m3e-card>
          )
        })}
      </div>
    </div>
  )
}
