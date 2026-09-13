import React, { useState, useRef, useEffect } from "react";
import { Languages, Globe, ChevronDown, Check } from "lucide-react";
import { Switch } from "./switch";
import { SpainFlag, EnglishFlag } from "../../../shared/components/atoms/flags/flags";
import {
  useTranslationSettings,
  AVAILABLE_LANGUAGES,
  type SupportedLanguage,
  type LanguageOption,
} from "../../../utils/hooks/use-translation-settings";

interface LanguageDropdownProps {
  value: SupportedLanguage;
  onChange: (value: SupportedLanguage) => void;
}

/**
 * Custom dropdown component for selecting languages with SVG flag icons.
 * Strictly uses vector SVG flags without emojis.
 */
const LanguageDropdown: React.FC<LanguageDropdownProps> = ({
  value,
  onChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentOption =
    AVAILABLE_LANGUAGES.find((opt: LanguageOption) => opt.value === value) ||
    AVAILABLE_LANGUAGES[0];

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-[var(--wb-surface-container-highest)] text-[var(--wb-on-surface)] text-sm font-semibold border border-white/10 hover:border-[var(--wb-primary)]/40 hover:bg-[var(--wb-surface-container-high)] transition-all cursor-pointer shadow-sm outline-none shrink-0"
      >
        {currentOption.value === "es" ? (
          <SpainFlag className="w-5 h-3.5 shadow-xs" />
        ) : (
          <EnglishFlag className="w-5 h-3.5 shadow-xs" />
        )}
        <span>{currentOption.nativeLabel}</span>
        <ChevronDown
          className={`w-4 h-4 text-[var(--wb-on-surface-variant)] transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-2xl border border-white/10 bg-[var(--wb-surface-container)] shadow-2xl py-1.5 z-50 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
          {AVAILABLE_LANGUAGES.map((opt: LanguageOption) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold cursor-pointer transition-colors ${
                  isSelected
                    ? "bg-[var(--wb-primary)]/15 text-[var(--wb-primary)] font-bold"
                    : "text-[var(--wb-on-surface-variant)] hover:bg-[var(--wb-surface-container-highest)] hover:text-[var(--wb-on-surface)]"
                }`}
              >
                <div className="flex items-center gap-3">
                  {opt.value === "es" ? (
                    <SpainFlag className="w-5 h-3.5 shadow-xs" />
                  ) : (
                    <EnglishFlag className="w-5 h-3.5 shadow-xs" />
                  )}
                  <span>{opt.nativeLabel}</span>
                </div>
                {isSelected && (
                  <Check className="w-4 h-4 text-[var(--wb-primary)] shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

/**
 * Settings tab and section for translation preferences and target language selection.
 */
export const LanguageTab: React.FC = () => {
  const { autoTranslate, setAutoTranslate, targetLanguage, setTargetLanguage } =
    useTranslationSettings();

  return (
    <div className="flex flex-col gap-6 w-full pb-10">
      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-2.5 text-xs sm:text-sm font-bold uppercase tracking-wider text-[var(--wb-primary)]">
          <Languages className="w-4 h-4 sm:w-5 sm:h-5" />
          <span>Language & Translation</span>
        </div>

        <div className="flex flex-col gap-3.5">
          <div className="flex items-center justify-between p-5 sm:p-6 rounded-3xl bg-[var(--wb-surface-container-low)]/80 border border-white/5 transition-colors">
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[var(--wb-surface-container-highest)] text-[var(--wb-on-surface)] flex items-center justify-center shrink-0 shadow-sm">
                <Languages className="w-6 h-6 sm:w-7 sm:h-7 text-[var(--wb-primary)]" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-base sm:text-lg font-bold text-[var(--wb-on-surface)]">
                  Translate descriptions
                </span>
                <span className="text-xs sm:text-sm text-[var(--wb-on-surface-variant)] leading-relaxed">
                  Automatically translate mod descriptions into your selected language when online
                </span>
              </div>
            </div>
            <div className="shrink-0 pl-4">
              <Switch
                checked={autoTranslate}
                onChange={setAutoTranslate}
                ariaLabel="Toggle Translate descriptions"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 sm:p-6 rounded-3xl bg-[var(--wb-surface-container-low)]/80 border border-white/5 gap-4 transition-colors">
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[var(--wb-surface-container-highest)] text-[var(--wb-on-surface)] flex items-center justify-center shrink-0 shadow-sm">
                <Globe className="w-6 h-6 sm:w-7 sm:h-7 text-[var(--wb-primary)]" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-base sm:text-lg font-bold text-[var(--wb-on-surface)]">
                  Language
                </span>
                <span className="text-xs sm:text-sm text-[var(--wb-on-surface-variant)] leading-relaxed">
                  Target language used for automatic mod description translation
                </span>
              </div>
            </div>

            <div className="shrink-0 sm:pl-4">
              <LanguageDropdown
                value={targetLanguage}
                onChange={setTargetLanguage}
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
