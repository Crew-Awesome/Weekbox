import React from 'react'
import { useTranslation } from 'react-i18next'

const FEATURE_ITEMS = [
  { key: 'mods', icon: 'extension' },
  { key: 'engines', icon: 'layers' },
  { key: 'playtime', icon: 'schedule' },
  { key: 'community', icon: 'groups' },
] as const

/**
 * Step 3: Brief introduction explaining what WeekBox is, community leads, and placeholder preview.
 */
export const StepAbout: React.FC = () => {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col items-center text-center max-w-2xl mx-auto px-4 gap-5">
      <div className="flex flex-col gap-3">
        <h2
          className="text-2xl sm:text-3xl font-bold tracking-tight"
          style={{ color: 'var(--md-sys-color-on-background)' }}
        >
          {t('setup.about.title')}
        </h2>
        <p
          className="text-sm sm:text-base leading-relaxed"
          style={{ color: 'var(--md-sys-color-on-surface-variant)' }}
        >
          {t('setup.about.description')}
        </p>
      </div>

      <m3e-chip-set className="flex flex-wrap items-center justify-center gap-2">
        {FEATURE_ITEMS.map(({ key, icon }) => (
          <m3e-assist-chip
            key={key}
            style={
              {
                '--m3e-chip-container-color':
                  'var(--md-sys-color-surface-container-high)',
                '--m3e-chip-label-text-color': 'var(--md-sys-color-on-surface)',
              } as React.CSSProperties
            }
          >
            <span
              slot="icon"
              className="material-symbols-rounded text-base leading-none"
              style={{ color: 'var(--md-sys-color-primary)' }}
            >
              {icon}
            </span>
            <span>{t(`setup.about.features.${key}`)}</span>
          </m3e-assist-chip>
        ))}
      </m3e-chip-set>

      <m3e-card
        variant="outlined"
        className="w-full max-w-lg rounded-2xl overflow-hidden block"
        style={
          {
            '--m3e-outlined-card-container-color':
              'var(--md-sys-color-surface-container)',
            '--m3e-outlined-card-outline-color':
              'var(--md-sys-color-outline-variant)',
            '--m3e-card-shape': '20px',
          } as React.CSSProperties
        }
      >
        <div className="flex flex-col">
          <div
            className="w-full aspect-[16/9] max-h-[210px] overflow-hidden flex items-center justify-center"
            style={{ backgroundColor: 'var(--md-sys-color-surface-container-high)' }}
          >
            <img
              src="/imgs/images/placeholder-mini.webp"
              alt={t('setup.about.placeholderCaption')}
              draggable={false}
              className="w-full h-full object-cover select-none"
            />
          </div>
          <div
            className="px-4 py-2.5 flex items-center justify-between text-xs font-medium border-t"
            style={{
              backgroundColor: 'var(--md-sys-color-surface-container)',
              borderColor: 'var(--md-sys-color-outline-variant)',
              color: 'var(--md-sys-color-on-surface-variant)',
            }}
          >
            <span>{t('setup.about.placeholderCaption')}</span>
            <span className="material-symbols-rounded text-base">
              image
            </span>
          </div>
        </div>
      </m3e-card>
    </div>
  )
}
