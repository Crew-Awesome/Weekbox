import React from 'react'
import { useTranslation } from 'react-i18next'
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '@/core/i18n'
import type { ThemePreference } from '@/utils/theme'
import { UI_STYLE_LABELS, type UiStyle } from '@/utils/ui-style'
import { LanguageFlagIcon } from './LanguageFlagIcon'

interface StepCompleteProps {
  selectedLanguage: SupportedLanguage
  selectedTheme: ThemePreference
  uiScale: number
  selectedStyle: UiStyle
}

/**
 * Step 7: Setup completion screen summarizing chosen settings before entering WeekBox.
 */
export const StepComplete: React.FC<StepCompleteProps> = ({
  selectedLanguage,
  selectedTheme,
  uiScale,
  selectedStyle,
}) => {
  const { t } = useTranslation()
  const langMeta =
    SUPPORTED_LANGUAGES.find((l) => l.code === selectedLanguage) ||
    SUPPORTED_LANGUAGES[0]

  return (
    <div className="flex flex-col items-center justify-center text-center max-w-2xl mx-auto px-4 gap-6">
      <m3e-shape
        name="8-leaf-clover"
        style={
          {
            '--m3e-shape-size': '92px',
            '--m3e-shape-container-color':
              'var(--md-sys-color-secondary-container)',
            display: 'inline-block',
          } as React.CSSProperties
        }
      >
        <span
          className="flex items-center justify-center w-full h-full pointer-events-none select-none"
          style={{
            position: 'absolute',
            inset: 0,
            color: 'var(--md-sys-color-on-secondary-container)',
          }}
        >
          <span className="material-symbols-rounded text-4xl leading-none font-bold">
            check
          </span>
        </span>
      </m3e-shape>

      <div className="flex flex-col gap-2">
        <h2
          className="text-3xl sm:text-4xl font-bold tracking-tight"
          style={{ color: 'var(--md-sys-color-on-background)' }}
        >
          {t('setup.finish.title')}
        </h2>
        <p
          className="text-sm sm:text-base max-w-lg mx-auto"
          style={{ color: 'var(--md-sys-color-on-surface-variant)' }}
        >
          {t('setup.finish.subtitle')}
        </p>
      </div>

      <m3e-card
        variant="outlined"
        className="w-full max-w-xl"
        style={
          {
            '--m3e-card-shape': '20px',
            '--m3e-outlined-card-container-color':
              'var(--md-sys-color-surface-container)',
            '--m3e-outlined-card-outline-color':
              'var(--md-sys-color-outline-variant)',
          } as React.CSSProperties
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 text-left">
          <div
            className="flex flex-col gap-1.5 p-3 rounded-xl"
            style={{ backgroundColor: 'var(--md-sys-color-surface-container-high)' }}
          >
            <span
              className="text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: 'var(--md-sys-color-on-surface-variant)' }}
            >
              {t('setup.finish.summaryLanguage')}
            </span>
            <div className="flex items-center gap-2">
              <LanguageFlagIcon
                code={selectedLanguage}
                className="w-6 h-4"
              />
              <span
                className="text-sm font-bold truncate"
                style={{ color: 'var(--md-sys-color-on-surface)' }}
              >
                {langMeta.nativeName}
              </span>
            </div>
          </div>

          <div
            className="flex flex-col gap-1.5 p-3 rounded-xl"
            style={{ backgroundColor: 'var(--md-sys-color-surface-container-high)' }}
          >
            <span
              className="text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: 'var(--md-sys-color-on-surface-variant)' }}
            >
              {t('setup.finish.summaryTheme')}
            </span>
            <div className="flex items-center gap-2">
              <span
                className="material-symbols-rounded text-lg leading-none"
                style={{ color: 'var(--md-sys-color-primary)' }}
              >
                {selectedTheme === 'light'
                  ? 'light_mode'
                  : selectedTheme === 'dark'
                    ? 'dark_mode'
                    : 'contrast'}
              </span>
              <span
                className="text-sm font-bold truncate"
                style={{ color: 'var(--md-sys-color-on-surface)' }}
              >
                {t(`setup.theme.options.${selectedTheme}.title`)}
              </span>
            </div>
          </div>

          <div
            className="flex flex-col gap-1.5 p-3 rounded-xl"
            style={{ backgroundColor: 'var(--md-sys-color-surface-container-high)' }}
          >
            <span
              className="text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: 'var(--md-sys-color-on-surface-variant)' }}
            >
              {t('setup.finish.summaryScale')}
            </span>
            <div className="flex items-center gap-2">
              <span
                className="material-symbols-rounded text-lg leading-none"
                style={{ color: 'var(--md-sys-color-primary)' }}
              >
                zoom_in
              </span>
              <span
                className="text-sm font-bold tabular-nums"
                style={{ color: 'var(--md-sys-color-on-surface)' }}
              >
                {uiScale}%
              </span>
            </div>
          </div>

          <div
            className="flex flex-col gap-1.5 p-3 rounded-xl"
            style={{ backgroundColor: 'var(--md-sys-color-surface-container-high)' }}
          >
            <span
              className="text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: 'var(--md-sys-color-on-surface-variant)' }}
            >
              {t('setup.finish.summaryStyle')}
            </span>
            <div className="flex items-center gap-2">
              <span
                className="material-symbols-rounded text-lg leading-none"
                style={{ color: 'var(--md-sys-color-primary)' }}
              >
                {selectedStyle === 'home' ? 'web_asset' : 'auto_awesome'}
              </span>
              <span
                className="text-sm font-bold truncate"
                style={{ color: 'var(--md-sys-color-on-surface)' }}
              >
                {UI_STYLE_LABELS[selectedStyle]}
              </span>
            </div>
          </div>
        </div>
      </m3e-card>
    </div>
  )
}
