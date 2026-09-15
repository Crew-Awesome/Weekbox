import { useState, useCallback, useEffect, useRef } from "react";
import Core from "@core";
import { useTranslationSettings } from "../../../utils/hooks/use-translation-settings";

export interface UseTranslationToggleResult {
  isTranslating: boolean;
  showTranslated: boolean;
  translatedText: string | null;
  targetLanguage: string;
  toggleTranslation: () => Promise<void>;
  setShowTranslated: (show: boolean) => void;
  canTranslate: boolean;
}

/**
 * Custom hook to manage toggling between original and translated text
 * with automatic caching per source string and auto-translation support.
 */
export function useTranslationToggle(
  sourceText?: string
): UseTranslationToggleResult {
  const { targetLanguage, autoTranslate } = useTranslationSettings();
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [showTranslated, setShowTranslated] = useState<boolean>(false);
  const [translatedText, setTranslatedText] = useState<string | null>(null);

  /** Cache translations mapped by source content */
  const cacheRef = useRef<Map<string, string>>(new Map());

  const canTranslate = Boolean(sourceText && sourceText.trim().length > 0);

  /** Reset or restore cached translation when sourceText changes */
  useEffect(() => {
    if (!sourceText || !sourceText.trim()) {
      setTranslatedText(null);
      setShowTranslated(false);
      return;
    }

    const cached = cacheRef.current.get(sourceText);
    if (cached) {
      setTranslatedText(cached);
    } else {
      setTranslatedText(null);
      setShowTranslated(false);

      if (autoTranslate) {
        performTranslate(sourceText);
      }
    }
  }, [sourceText, targetLanguage, autoTranslate]);

  const performTranslate = useCallback(
    async (text: string) => {
      if (!text || !text.trim()) return;
      if (typeof navigator !== "undefined" && !navigator.onLine) return;

      const cached = cacheRef.current.get(text);
      if (cached) {
        setTranslatedText(cached);
        setShowTranslated(true);
        return;
      }

      setIsTranslating(true);
      try {
        const res = await Core.services.translation.translateModText({
          text,
          targetLang: (targetLanguage as "es" | "en") || "es",
        });

        if (res?.translated) {
          cacheRef.current.set(text, res.translated);
          setTranslatedText(res.translated);
          setShowTranslated(true);
        }
      } catch (err) {
        console.warn("Translation failed:", err);
      } finally {
        setIsTranslating(false);
      }
    },
    [targetLanguage]
  );

  const toggleTranslation = useCallback(async () => {
    if (!sourceText || !sourceText.trim()) return;

    if (translatedText) {
      setShowTranslated((prev) => !prev);
      return;
    }

    await performTranslate(sourceText);
  }, [sourceText, translatedText, performTranslate]);

  return {
    isTranslating,
    showTranslated,
    translatedText,
    targetLanguage,
    toggleTranslation,
    setShowTranslated,
    canTranslate,
  };
}
