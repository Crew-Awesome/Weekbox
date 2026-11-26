import gsap from 'gsap'
import { patchWeekBoxSettingsJson } from '@/core/storage/weekbox-settings'

export const UI_SCALE_STORAGE_KEY = 'wb_ui_scale'
export const MIN_UI_SCALE = 80
export const MAX_UI_SCALE = 125
export const DEFAULT_UI_SCALE = 100
export const UI_SCALE_CHANGED_EVENT = 'wb:ui-scale-changed'

interface ApplyUiScaleOptions {
  immediate?: boolean
  persistToJson?: boolean
}

/**
 * Clamps a numeric UI scale percentage into supported safe bounds (`80%` - `125%`).
 */
export function clampUiScale(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_UI_SCALE
  return Math.min(MAX_UI_SCALE, Math.max(MIN_UI_SCALE, Math.round(value)))
}

/**
 * Reads the persisted UI scale percentage (`80` to `125`, default `100`).
 */
export function getSavedUiScale(): number {
  if (typeof window === 'undefined') return DEFAULT_UI_SCALE
  try {
    const raw = localStorage.getItem(UI_SCALE_STORAGE_KEY)
    if (!raw) return DEFAULT_UI_SCALE
    const parsed = Number.parseFloat(raw)
    return clampUiScale(parsed)
  } catch {
    return DEFAULT_UI_SCALE
  }
}

/**
 * Applies root rem scaling (`font-size`) smoothly so Tailwind and M3E tokens scale cleanly
 * without breaking full-viewport geometry, and persists the preference.
 */
export function applyUiScale(
  percent: number,
  options?: ApplyUiScaleOptions,
): number {
  const clamped = clampUiScale(percent)
  if (typeof document !== 'undefined') {
    const rootPx = (clamped / 100) * 16
    document.documentElement.setAttribute('data-ui-scale', String(clamped))
    if (options?.immediate) {
      gsap.killTweensOf(document.documentElement)
      document.documentElement.style.fontSize = `${rootPx}px`
    } else {
      gsap.to(document.documentElement, {
        fontSize: `${rootPx}px`,
        duration: 0.3,
        ease: 'power2.out',
        overwrite: 'auto',
      })
    }
  }
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(UI_SCALE_STORAGE_KEY, String(clamped))
    }
  } catch {
    // Ignore storage write errors
  }
  if (!options?.immediate && options?.persistToJson !== false) {
    void patchWeekBoxSettingsJson({ uiScale: clamped })
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(UI_SCALE_CHANGED_EVENT, { detail: clamped }),
    )
  }
  return clamped
}

/**
 * Restores and applies the persisted UI scale on startup.
 */
export function initSavedUiScale(): void {
  applyUiScale(getSavedUiScale(), { immediate: true })
}
