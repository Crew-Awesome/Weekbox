import { patchWeekBoxSettingsJson } from '@/core/storage/weekbox-settings'

export type ThemeMode = 'light' | 'dark'
export type ThemePreference = 'light' | 'dark' | 'system'

interface ApplyThemeOptions {
  persistToJson?: boolean
}

const THEME_STORAGE_KEY = 'wb_theme'
export const THEME_CHANGED_EVENT = 'wb:theme-changed'

let mediaListenerRegistered = false

/**
 * Resolves a stored theme preference into a concrete `'light'` or `'dark'` mode.
 */
export function resolveThemeMode(pref: ThemePreference): ThemeMode {
  if (pref === 'light' || pref === 'dark') return pref
  return typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

/**
 * Reads the persisted user theme preference (`'light' | 'dark' | 'system'`).
 */
export function getThemePreference(): ThemePreference {
  if (typeof window === 'undefined') return 'system'
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY)
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      return saved
    }
  } catch {
    // Ignore storage read errors
  }
  return 'system'
}

/**
 * Reads the current effective theme mode from the DOM or system preference.
 */
export function getActiveTheme(): ThemeMode {
  if (typeof document === 'undefined') return 'dark'
  const current = document.documentElement.getAttribute('data-theme')
  if (current === 'light' || current === 'dark') return current
  return resolveThemeMode(getThemePreference())
}

function applyEffectiveDomTheme(
  effective: ThemeMode,
  preference: ThemePreference,
): void {
  if (typeof document === 'undefined') return
  if (preference === 'system') {
    document.documentElement.removeAttribute('data-theme')
  } else {
    document.documentElement.setAttribute('data-theme', effective)
  }
  document.documentElement.setAttribute('data-theme-preference', preference)
}

/**
 * Applies and persists the selected theme preference (`light`, `dark`, or `system`).
 */
export function applyTheme(
  theme: ThemePreference,
  options?: ApplyThemeOptions,
): void {
  if (typeof document === 'undefined') return
  const effective = resolveThemeMode(theme)
  applyEffectiveDomTheme(effective, theme)
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // Ignore storage write errors
  }
  if (options?.persistToJson !== false) {
    void patchWeekBoxSettingsJson({ theme })
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(THEME_CHANGED_EVENT, {
        detail: { preference: theme, effective },
      }),
    )
  }
}

/**
 * Initializes the persisted theme preference on application startup
 * and listens for OS color-scheme changes when set to `'system'`.
 */
export function initSavedTheme(): void {
  if (typeof document === 'undefined') return
  const pref = getThemePreference()
  applyEffectiveDomTheme(resolveThemeMode(pref), pref)

  if (
    !mediaListenerRegistered &&
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function'
  ) {
    mediaListenerRegistered = true
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', () => {
      const currentPref = getThemePreference()
      if (currentPref === 'system') {
        const effective = mq.matches ? 'dark' : 'light'
        applyEffectiveDomTheme(effective, 'system')
        window.dispatchEvent(
          new CustomEvent(THEME_CHANGED_EVENT, {
            detail: { preference: 'system', effective },
          }),
        )
      }
    })
  }
}
