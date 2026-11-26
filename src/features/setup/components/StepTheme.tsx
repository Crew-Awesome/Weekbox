import React from 'react'
import { useTranslation } from 'react-i18next'
import { resolveThemeMode, type ThemePreference } from '@/utils/theme'

interface StepThemeProps {
  selectedTheme: ThemePreference
  onSelectTheme: (theme: ThemePreference) => void
}

const THEME_OPTIONS: Array<{
  id: ThemePreference
  icon: string
}> = [
  { id: 'light', icon: 'light_mode' },
  { id: 'dark', icon: 'dark_mode' },
  { id: 'system', icon: 'contrast' },
]

const ThemePreviewGraphic: React.FC<{ mode: ThemePreference }> = ({ mode }) => {
  if (mode === 'light') {
    return (
      <div
        className="w-full h-20 rounded-xl border p-2.5 flex flex-col justify-between"
        style={{ backgroundColor: '#FBF8FF', borderColor: '#C7C5D0' }}
      >
        <div className="flex items-center justify-between">
          <span className="w-8 h-2 rounded-full" style={{ backgroundColor: '#363CFF' }} />
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#E0E0FF' }} />
        </div>
        <div className="flex gap-1.5">
          <div className="w-6 h-8 rounded-md" style={{ backgroundColor: '#EAE7EF' }} />
          <div className="flex-1 h-8 rounded-md" style={{ backgroundColor: '#F0ECF4' }} />
        </div>
      </div>
    )
  }

  if (mode === 'dark') {
    return (
      <div
        className="w-full h-20 rounded-xl border p-2.5 flex flex-col justify-between"
        style={{ backgroundColor: '#131318', borderColor: '#46464F' }}
      >
        <div className="flex items-center justify-between">
          <span className="w-8 h-2 rounded-full" style={{ backgroundColor: '#BFC2FF' }} />
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#0800EE' }} />
        </div>
        <div className="flex gap-1.5">
          <div className="w-6 h-8 rounded-md" style={{ backgroundColor: '#2A292F' }} />
          <div className="flex-1 h-8 rounded-md" style={{ backgroundColor: '#1F1F25' }} />
        </div>
      </div>
    )
  }

  return (
    <div
      className="w-full h-20 rounded-xl border overflow-hidden flex"
      style={{ borderColor: 'var(--md-sys-color-outline-variant)' }}
    >
      <div
        className="w-1/2 h-full p-2 flex flex-col justify-between"
        style={{ backgroundColor: '#FBF8FF' }}
      >
        <span className="w-6 h-2 rounded-full" style={{ backgroundColor: '#363CFF' }} />
        <div className="w-full h-7 rounded-md" style={{ backgroundColor: '#EAE7EF' }} />
      </div>
      <div
        className="w-1/2 h-full p-2 flex flex-col justify-between"
        style={{ backgroundColor: '#131318' }}
      >
        <span
          className="w-6 h-2 rounded-full self-end"
          style={{ backgroundColor: '#BFC2FF' }}
        />
        <div className="w-full h-7 rounded-md" style={{ backgroundColor: '#2A292F' }} />
      </div>
    </div>
  )
}

/**
 * Step 4: Theme selector supporting Light, Dark, and automatic System device preference.
 */
export const StepTheme: React.FC<StepThemeProps> = ({
  selectedTheme,
  onSelectTheme,
}) => {
  const { t } = useTranslation()
  const detectedMode = resolveThemeMode('system')
  const detectedLabel = t(`setup.theme.modes.${detectedMode}`)

  return (
    <div className="flex flex-col items-center text-center w-full max-w-3xl mx-auto px-4 gap-6">
      <div className="flex flex-col gap-2">
        <h2
          className="text-2xl sm:text-3xl font-bold tracking-tight"
          style={{ color: 'var(--md-sys-color-on-background)' }}
        >
          {t('setup.theme.title')}
        </h2>
        <p
          className="text-sm sm:text-base"
          style={{ color: 'var(--md-sys-color-on-surface-variant)' }}
        >
          {t('setup.theme.subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
        {THEME_OPTIONS.map(({ id, icon }) => {
          const isSelected = selectedTheme === id
          return (
            <m3e-card
              key={id}
              variant={isSelected ? 'filled' : 'outlined'}
              actionable
              role="radio"
              aria-checked={isSelected}
              tabIndex={0}
              onClick={() => onSelectTheme(id)}
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onSelectTheme(id)
                }
              }}
              className="w-full text-left cursor-pointer transition-transform active:scale-[0.985]"
              style={
                {
                  '--m3e-card-shape': '20px',
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
              <div className="flex flex-col gap-3 p-4">
                <ThemePreviewGraphic mode={id} />

                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="material-symbols-rounded text-xl shrink-0"
                      style={{
                        color: isSelected
                          ? 'var(--md-sys-color-on-secondary-container)'
                          : 'var(--md-sys-color-primary)',
                      }}
                    >
                      {icon}
                    </span>
                    <span
                      className="text-base font-bold truncate"
                      style={{
                        color: isSelected
                          ? 'var(--md-sys-color-on-secondary-container)'
                          : 'var(--md-sys-color-on-surface)',
                      }}
                    >
                      {t(`setup.theme.options.${id}.title`)}
                    </span>
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

                <p
                  className="text-xs leading-snug"
                  style={{
                    color: isSelected
                      ? 'var(--md-sys-color-on-secondary-container)'
                      : 'var(--md-sys-color-on-surface-variant)',
                    opacity: isSelected ? 0.9 : 1,
                  }}
                >
                  {t(`setup.theme.options.${id}.description`, {
                    mode: detectedLabel,
                  })}
                </p>
              </div>
            </m3e-card>
          )
        })}
      </div>
    </div>
  )
}
