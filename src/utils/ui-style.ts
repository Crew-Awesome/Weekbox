import { useEffect, useState } from 'react'
import {
  normalizeUiStyle,
  patchWeekBoxSettingsJson,
  type UiStyle,
} from '@/core/storage/weekbox-settings'

export type { UiStyle }
export { UI_STYLE_LABELS } from '@/core/storage/weekbox-settings'

export const UI_STYLE_STORAGE_KEY = 'wb_ui_style'
const LEGACY_SIDEBAR_STORAGE_KEY = 'wb_sidebar_style'
export const UI_STYLE_CHANGED_EVENT = 'wb:ui-style-changed'

interface SetUiStyleOptions {
  persistToJson?: boolean
}

/**
 * Returns the active interface aesthetic (`'default'` = WeekBox Style, `'home'` = WeekBox Home).
 */
export function getUiStyle(): UiStyle {
  if (typeof document !== 'undefined') {
    const attr = normalizeUiStyle(
      document.documentElement.getAttribute('data-ui-style'),
    )
    if (attr) return attr
  }
  if (typeof window !== 'undefined') {
    try {
      const saved =
        normalizeUiStyle(localStorage.getItem(UI_STYLE_STORAGE_KEY)) ??
        normalizeUiStyle(localStorage.getItem(LEGACY_SIDEBAR_STORAGE_KEY))
      if (saved) return saved
    } catch {
      // Ignore storage read errors
    }
  }
  return 'default'
}

/**
 * Updates the active interface aesthetic in real time across the app,
 * persists to localStorage, and saves to `WeekBoxLibrary/settings.json`.
 */
export function setUiStyle(
  style: UiStyle,
  options?: SetUiStyleOptions,
): UiStyle {
  const valid = normalizeUiStyle(style) ?? 'default'

  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-ui-style', valid)
  }

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(UI_STYLE_STORAGE_KEY, valid)
    }
  } catch {
    // Ignore storage write errors
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(UI_STYLE_CHANGED_EVENT, { detail: valid }),
    )
  }

  if (options?.persistToJson !== false) {
    void patchWeekBoxSettingsJson({ uiStyle: valid })
  }

  return valid
}

/**
 * Applies the stored UI style attribute during startup.
 */
export function initSavedUiStyle(): void {
  setUiStyle(getUiStyle(), { persistToJson: false })
}

/**
 * Subscribes a React component to live `wb.style` / setup style changes.
 */
export function useUiStyle(): UiStyle {
  const [style, setStyle] = useState<UiStyle>(getUiStyle)

  useEffect(() => {
    const handleStyleChange = () => setStyle(getUiStyle())
    window.addEventListener(UI_STYLE_CHANGED_EVENT, handleStyleChange)
    return () => {
      window.removeEventListener(UI_STYLE_CHANGED_EVENT, handleStyleChange)
    }
  }, [])

  return style
}
