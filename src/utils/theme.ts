export type ThemeMode = 'light' | 'dark'

const THEME_STORAGE_KEY = 'wb_theme'

/**
 * Reads the current active theme mode from the DOM or system preference.
 */
export function getActiveTheme(): ThemeMode {
  if (typeof document === 'undefined') return 'dark'
  const current = document.documentElement.getAttribute('data-theme')
  if (current === 'light' || current === 'dark') return current
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    // Ignore storage read errors
  }
  return typeof window !== 'undefined' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

/**
 * Applies and persists the selected theme mode on the document root element.
 */
export function applyTheme(theme: ThemeMode): void {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-theme', theme)
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // Ignore storage write errors
  }
}

/**
 * Initializes the persisted theme mode on application startup.
 */
export function initSavedTheme(): void {
  if (typeof document === 'undefined') return
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY)
    if (saved === 'light' || saved === 'dark') {
      document.documentElement.setAttribute('data-theme', saved)
    }
  } catch {
    // Ignore storage read errors
  }
}
