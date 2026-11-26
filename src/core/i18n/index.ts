import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { patchWeekBoxSettingsJson } from '@/core/storage/weekbox-settings'
import {
  SUPPORTED_LANGUAGES,
  resources,
  type SupportedLanguage,
} from './resources'

export { SUPPORTED_LANGUAGES, type SupportedLanguage } from './resources'

export const LANGUAGE_STORAGE_KEY = 'wb_language'
export const LANGUAGE_CHANGED_EVENT = 'wb:language-changed'

const SUPPORTED_SET = new Set<SupportedLanguage>(
  SUPPORTED_LANGUAGES.map((lang) => lang.code),
)

export function isSupportedLanguage(val: unknown): val is SupportedLanguage {
  return typeof val === 'string' && SUPPORTED_SET.has(val as SupportedLanguage)
}

/**
 * Returns the persisted language code if previously selected, otherwise `'en'`
 * so initial startup begins cleanly in English before language selection.
 */
export function getSavedLanguage(): SupportedLanguage {
  if (typeof window === 'undefined') return 'en'
  try {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY)
    if (isSupportedLanguage(saved)) return saved
  } catch {
    // Ignore storage read errors
  }
  return 'en'
}

interface ChangeAppLanguageOptions {
  persistToJson?: boolean
}

/**
 * Updates i18next active language, DOM `lang` attribute, and persisted setting.
 */
export function changeAppLanguage(
  lang: SupportedLanguage,
  options?: ChangeAppLanguageOptions,
): void {
  if (!isSupportedLanguage(lang)) return
  void i18n.changeLanguage(lang)
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lang
  }
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lang)
    }
  } catch {
    // Ignore storage write errors
  }
  if (options?.persistToJson !== false) {
    void patchWeekBoxSettingsJson({ language: lang })
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(LANGUAGE_CHANGED_EVENT, { detail: lang }),
    )
  }
}

const initialLanguage = getSavedLanguage()
if (typeof document !== 'undefined') {
  document.documentElement.lang = initialLanguage
}

void i18n.use(initReactI18next).init({
  resources,
  lng: initialLanguage,
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
})

export default i18n
