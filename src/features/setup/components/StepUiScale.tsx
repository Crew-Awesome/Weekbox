import React, { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  DEFAULT_UI_SCALE,
  MAX_UI_SCALE,
  MIN_UI_SCALE,
} from '@/utils/ui-scale'

interface StepUiScaleProps {
  uiScale: number
  onChangeScale: (nextScale: number) => void
}

const PRESET_SCALES = [85, 100, 110, 125] as const

/**
 * Step 5: Live UI scale customization with M3E Slider and preset filter chips.
 */
export const StepUiScale: React.FC<StepUiScaleProps> = ({
  uiScale,
  onChangeScale,
}) => {
  const { t } = useTranslation()
  const sliderRef = useRef<HTMLElement | null>(null)
  const onChangeRef = useRef(onChangeScale)

  useEffect(() => {
    onChangeRef.current = onChangeScale
  }, [onChangeScale])

  useEffect(() => {
    const sliderEl = sliderRef.current as
      | (HTMLElement & { thumb?: { value?: number | null } | null })
      | null
    if (sliderEl?.thumb && sliderEl.thumb.value !== uiScale) {
      sliderEl.thumb.value = uiScale
    }
  }, [uiScale])

  useEffect(() => {
    const sliderEl = sliderRef.current as
      | (HTMLElement & { thumb?: { value?: number | null } | null })
      | null
    if (!sliderEl) return

    const handleValueUpdate = (e: Event) => {
      const targetVal = (e.target as { value?: number | null } | null)?.value
      const thumbVal = sliderEl.thumb?.value
      const raw = typeof targetVal === 'number' ? targetVal : thumbVal
      if (typeof raw === 'number' && !Number.isNaN(raw)) {
        onChangeRef.current(raw)
      }
    }

    sliderEl.addEventListener('input', handleValueUpdate)
    sliderEl.addEventListener('change', handleValueUpdate)

    return () => {
      sliderEl.removeEventListener('input', handleValueUpdate)
      sliderEl.removeEventListener('change', handleValueUpdate)
    }
  }, [])

  return (
    <div
      className="flex flex-col items-center text-center w-full mx-auto px-4 gap-5"
      style={{ maxWidth: '672px' }}
    >
      <div className="flex flex-col gap-2">
        <h2
          className="text-2xl sm:text-3xl font-bold tracking-tight"
          style={{ color: 'var(--md-sys-color-on-background)' }}
        >
          {t('setup.scale.title')}
        </h2>
        <p
          className="text-sm sm:text-base"
          style={{ color: 'var(--md-sys-color-on-surface-variant)' }}
        >
          {t('setup.scale.subtitle')}
        </p>
      </div>

      <m3e-card
        variant="outlined"
        className="w-full"
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
        <div className="flex flex-col gap-5 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span
                className="material-symbols-rounded text-xl"
                style={{ color: 'var(--md-sys-color-primary)' }}
              >
                zoom_in
              </span>
              <span
                className="text-sm font-semibold"
                style={{ color: 'var(--md-sys-color-on-surface)' }}
              >
                {t('setup.scale.currentScale')}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {uiScale !== DEFAULT_UI_SCALE && (
                <m3e-button
                  variant="text"
                  onClick={() => onChangeScale(DEFAULT_UI_SCALE)}
                  style={{ cursor: 'pointer' }}
                >
                  {t('setup.scale.reset')}
                </m3e-button>
              )}
              <span
                className="px-3 py-1 rounded-full text-sm font-bold tabular-nums"
                style={{
                  backgroundColor: 'var(--md-sys-color-secondary-container)',
                  color: 'var(--md-sys-color-on-secondary-container)',
                }}
              >
                {uiScale}%
              </span>
            </div>
          </div>

          <div className="w-full px-1 py-2">
            <m3e-slider
              ref={sliderRef}
              labelled
              min={MIN_UI_SCALE}
              max={MAX_UI_SCALE}
              step={1}
              size="medium"
              style={
                {
                  width: '100%',
                  '--m3e-slider-active-track-color':
                    'var(--md-sys-color-primary)',
                  '--m3e-slider-inactive-track-color':
                    'var(--md-sys-color-surface-container-highest)',
                  '--m3e-slider-thumb-color': 'var(--md-sys-color-primary)',
                  '--m3e-slider-label-container-color':
                    'var(--md-sys-color-primary)',
                  '--m3e-slider-label-color': 'var(--md-sys-color-on-primary)',
                } as React.CSSProperties
              }
            >
              <m3e-slider-thumb value={uiScale} />
            </m3e-slider>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            {PRESET_SCALES.map((preset) => {
              const isSelected = uiScale === preset
              return (
                <m3e-filter-chip
                  key={preset}
                  selected={isSelected}
                  onClick={(e: React.MouseEvent) => {
                    e.preventDefault()
                    onChangeScale(preset)
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <span>{preset}%</span>
                </m3e-filter-chip>
              )
            })}
          </div>
        </div>
      </m3e-card>

      <m3e-card
        variant="outlined"
        className="w-full text-left"
        style={
          {
            '--m3e-card-shape': '18px',
            '--m3e-outlined-card-container-color':
              'var(--md-sys-color-surface-container-low)',
            '--m3e-outlined-card-outline-color':
              'var(--md-sys-color-outline-variant)',
          } as React.CSSProperties
        }
      >
        <div className="flex items-center justify-between gap-4 p-4">
          <div className="flex flex-col gap-1 min-w-0">
            <span
              className="text-sm font-bold truncate"
              style={{ color: 'var(--md-sys-color-on-surface)' }}
            >
              {t('setup.scale.previewTitle')}
            </span>
            <span
              className="text-xs"
              style={{ color: 'var(--md-sys-color-on-surface-variant)' }}
            >
              {t('setup.scale.previewBody')}
            </span>
          </div>
          <m3e-button
            variant="tonal"
            style={{ pointerEvents: 'none', flexShrink: 0 }}
          >
            {t('setup.scale.previewAction')}
          </m3e-button>
        </div>
      </m3e-card>
    </div>
  )
}
