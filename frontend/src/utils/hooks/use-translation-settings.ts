import { useState, useEffect, useCallback } from "react";

export type SupportedLanguage = "es" | "en";

export interface LanguageOption {
  value: SupportedLanguage;
  label: string;
  nativeLabel: string;
}

export const AVAILABLE_LANGUAGES: LanguageOption[] = [
  { value: "es", label: "Spanish", nativeLabel: "Español" },
  { value: "en", label: "English", nativeLabel: "English" },
];

const TRANSLATE_DESCRIPTIONS_KEY = "wb_translate_descriptions";
const TRANSLATION_LANGUAGE_KEY = "wb_translation_language";

type TranslationSettingsListener = (state: {
  autoTranslate: boolean;
  targetLanguage: SupportedLanguage;
}) => void;

const listeners = new Set<TranslationSettingsListener>();

/**
 * Checks whether automatic description translation is enabled.
 * Defaults to true.
 * @returns {boolean} True if enabled, false otherwise.
 */
export function isTranslateDescriptionsActive(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const item = localStorage.getItem(TRANSLATE_DESCRIPTIONS_KEY);
    if (item === null) return true;
    return item === "true";
  } catch {
    return true;
  }
}

/**
 * Sets the automatic description translation preference and notifies subscribers.
 * @param {boolean} active - Enable or disable automatic translation.
 */
export function setTranslateDescriptionsActive(active: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(TRANSLATE_DESCRIPTIONS_KEY, String(active));
  } catch {}
  const targetLanguage = getTranslationLanguage();
  listeners.forEach((fn) => fn({ autoTranslate: active, targetLanguage }));
  window.dispatchEvent(
    new CustomEvent("wb:translation-settings-changed", {
      detail: { autoTranslate: active, targetLanguage },
    })
  );
}

/**
 * Gets the current preferred target translation language.
 * Defaults to "es" (Spanish).
 * @returns {SupportedLanguage} The language code ("es" or "en").
 */
export function getTranslationLanguage(): SupportedLanguage {
  if (typeof window === "undefined") return "es";
  try {
    const item = localStorage.getItem(TRANSLATION_LANGUAGE_KEY);
    if (item === "en" || item === "es") {
      return item;
    }
    return "es";
  } catch {
    return "es";
  }
}

/**
 * Sets the target translation language and notifies subscribers.
 * @param {SupportedLanguage} language - Target language code.
 */
export function setTranslationLanguage(language: SupportedLanguage): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(TRANSLATION_LANGUAGE_KEY, language);
  } catch {}
  const autoTranslate = isTranslateDescriptionsActive();
  listeners.forEach((fn) => fn({ autoTranslate, targetLanguage: language }));
  window.dispatchEvent(
    new CustomEvent("wb:translation-settings-changed", {
      detail: { autoTranslate, targetLanguage: language },
    })
  );
}

/**
 * Subscribes a listener callback to translation settings changes.
 * @param {TranslationSettingsListener} listener - Callback invoked on settings update.
 * @returns {() => void} Unsubscribe function.
 */
export function subscribeTranslationSettings(
  listener: TranslationSettingsListener
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * React hook to consume and update translation settings reactively.
 * @returns {{
 *   autoTranslate: boolean;
 *   setAutoTranslate: (val: boolean) => void;
 *   targetLanguage: SupportedLanguage;
 *   setTargetLanguage: (lang: SupportedLanguage) => void;
 * }}
 */
export function useTranslationSettings() {
  const [autoTranslate, setAutoTranslateState] = useState<boolean>(
    isTranslateDescriptionsActive
  );
  const [targetLanguage, setTargetLanguageState] = useState<SupportedLanguage>(
    getTranslationLanguage
  );

  useEffect(() => {
    const unsubscribe = subscribeTranslationSettings((settings) => {
      setAutoTranslateState(settings.autoTranslate);
      setTargetLanguageState(settings.targetLanguage);
    });

    const handleCustomEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{
        autoTranslate: boolean;
        targetLanguage: SupportedLanguage;
      }>;
      if (customEvent.detail) {
        setAutoTranslateState(customEvent.detail.autoTranslate);
        setTargetLanguageState(customEvent.detail.targetLanguage);
      }
    };

    const handleStorageEvent = (e: StorageEvent) => {
      if (
        e.key === TRANSLATE_DESCRIPTIONS_KEY ||
        e.key === TRANSLATION_LANGUAGE_KEY
      ) {
        setAutoTranslateState(isTranslateDescriptionsActive());
        setTargetLanguageState(getTranslationLanguage());
      }
    };

    window.addEventListener("wb:translation-settings-changed", handleCustomEvent);
    window.addEventListener("storage", handleStorageEvent);

    return () => {
      unsubscribe();
      window.removeEventListener("wb:translation-settings-changed", handleCustomEvent);
      window.removeEventListener("storage", handleStorageEvent);
    };
  }, []);

  const setAutoTranslate = useCallback((val: boolean) => {
    setTranslateDescriptionsActive(val);
  }, []);

  const setTargetLanguage = useCallback((lang: SupportedLanguage) => {
    setTranslationLanguage(lang);
  }, []);

  return {
    autoTranslate,
    setAutoTranslate,
    targetLanguage,
    setTargetLanguage,
  };
}
