import React from 'react'
import { useTranslation } from 'react-i18next'
import type { UiStyle } from '@/utils/ui-style'

interface StepStyleProps {
  selectedStyle: UiStyle
  onSelectStyle: (style: UiStyle) => void
}

const STYLE_OPTIONS: Array<{
  id: UiStyle
  icon: string
  key: 'default' | 'home'
}> = [
  { id: 'default', icon: 'auto_awesome', key: 'default' },
  { id: 'home', icon: 'web_asset', key: 'home' },
]

/**
 * Step 6: Interface style picker ("WeekBox Style" vs simpler "WeekBox Home")
 * previewed live behind a translucent 0.4 backdrop.
 */
export const StepStyle: React.FC<StepStyleProps> = ({
  selectedStyle,
  onSelectStyle,
}) => {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col items-center text-center w-full max-w-2xl mx-auto px-4 gap-6">
      <div
        className="flex flex-col gap-2 px-6 py-4 rounded-2xl border shadow-sm"
        style={{
          backgroundColor: 'var(--md-sys-color-surface-container)',
          borderColor: 'var(--md-sys-color-outline-variant)',
        }}
      >
        <h2
          className="text-2xl sm:text-3xl font-bold tracking-tight"
          style={{ color: 'var(--md-sys-color-on-background)' }}
        >
          {t('setup.style.title')}
        </h2>
        <p
          className="text-sm sm:text-base"
          style={{ color: 'var(--md-sys-color-on-surface-variant)' }}
        >
          {t('setup.style.subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
        {STYLE_OPTIONS.map(({ id, icon, key }) => {
          const isSelected = selectedStyle === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelectStyle(id)}
              aria-pressed={isSelected}
              className="w-full text-left cursor-pointer focus:outline-none rounded-[20px] transition-transform duration-150 active:scale-[0.985]"
            >
              <m3e-card
                variant={isSelected ? 'filled' : 'outlined'}
                className="w-full h-full"
                style={
                  (isSelected
                    ? {
                        '--m3e-card-shape': '20px',
                        '--m3e-filled-card-container-color':
                          'var(--md-sys-color-secondary-container)',
                        outline: '2px solid var(--md-sys-color-primary)',
                      }
                    : {
                        '--m3e-card-shape': '20px',
                        '--m3e-outlined-card-container-color':
                          'var(--md-sys-color-surface-container)',
                        '--m3e-outlined-card-outline-color':
                          'var(--md-sys-color-outline-variant)',
                      }) as Record<string, string> as React.CSSProperties
                }
              >
                <div className="flex flex-col gap-3 p-5 text-left h-full">
                  <div className="flex items-center justify-between">
                    <span
                      className="w-11 h-11 rounded-xl flex items-center justify-center"
                      style={{
                        backgroundColor: isSelected
                          ? 'var(--md-sys-color-primary)'
                          : 'var(--md-sys-color-surface-container-highest)',
                        color: isSelected
                          ? 'var(--md-sys-color-on-primary)'
                          : 'var(--md-sys-color-on-surface)',
                      }}
                    >
                      <span className="material-symbols-rounded text-2xl leading-none">
                        {icon}
                      </span>
                    </span>

                    {isSelected && (
                      <span
                        className="material-symbols-rounded text-xl leading-none"
                        style={{ color: 'var(--md-sys-color-primary)' }}
                      >
                        check_circle
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col gap-1">
                    <span
                      className="text-base font-bold"
                      style={{
                        color: isSelected
                          ? 'var(--md-sys-color-on-secondary-container)'
                          : 'var(--md-sys-color-on-surface)',
                      }}
                    >
                      {t(`setup.style.options.${key}.title`)}
                    </span>
                    <span
                      className="text-xs sm:text-sm leading-snug"
                      style={{
                        color: isSelected
                          ? 'var(--md-sys-color-on-secondary-container)'
                          : 'var(--md-sys-color-on-surface-variant)',
                      }}
                    >
                      {t(`setup.style.options.${key}.description`)}
                    </span>
                  </div>
                </div>
              </m3e-card>
            </button>
          )
        })}
      </div>
    </div>
  )
}
