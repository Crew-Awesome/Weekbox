import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal } from '@/ui/modal/Modal'
import {
  applyTheme,
  getThemePreference,
  THEME_CHANGED_EVENT,
  type ThemePreference,
} from '@/utils/theme'
import {
  applyUiScale,
  DEFAULT_UI_SCALE,
  getSavedUiScale,
  MAX_UI_SCALE,
  MIN_UI_SCALE,
  UI_SCALE_CHANGED_EVENT,
} from '@/utils/ui-scale'
import {
  changeAppLanguage,
  getSavedLanguage,
  LANGUAGE_CHANGED_EVENT,
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
} from '@/core/i18n'
import { LanguageFlagIcon } from '@/features/setup/components/LanguageFlagIcon'
import { openSetupWizard } from '@/features/setup/setup-storage'
import { isNeutralino } from '@/core/host'
import { syncWindowsProtocolRegistration } from '@/core/deep-links'
import {
  patchWeekBoxSettingsJson,
  readWeekBoxSettingsJson,
} from '@/core/storage/weekbox-settings'

export interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  onOpenAbout?: () => void
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onOpenAbout,
}) => {
  const { t } = useTranslation()
  const [themePref, setThemePref] = useState<ThemePreference>(getThemePreference)
  const [language, setLanguage] = useState<SupportedLanguage>(getSavedLanguage)
  const [uiScale, setUiScale] = useState<number>(getSavedUiScale)
  const [protocolLinksEnabled, setProtocolLinksEnabled] = useState<boolean>(true)
  const [isUpdatingProtocol, setIsUpdatingProtocol] = useState<boolean>(false)

  useEffect(() => {
    if (!isOpen) return
    let active = true
    readWeekBoxSettingsJson()
      .then((settings) => {
        if (!active || !settings) return
        setProtocolLinksEnabled(settings.registerProtocolLinks !== false)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [isOpen])

  useEffect(() => {
    const syncTheme = () => setThemePref(getThemePreference())
    const syncLang = () => setLanguage(getSavedLanguage())
    const syncScale = () => setUiScale(getSavedUiScale())

    window.addEventListener(THEME_CHANGED_EVENT, syncTheme)
    window.addEventListener(LANGUAGE_CHANGED_EVENT, syncLang)
    window.addEventListener(UI_SCALE_CHANGED_EVENT, syncScale)
    return () => {
      window.removeEventListener(THEME_CHANGED_EVENT, syncTheme)
      window.removeEventListener(LANGUAGE_CHANGED_EVENT, syncLang)
      window.removeEventListener(UI_SCALE_CHANGED_EVENT, syncScale)
    }
  }, [])

  const handleSetTheme = (pref: ThemePreference) => {
    setThemePref(pref)
    applyTheme(pref)
  }

  const handleSetLanguage = (lang: SupportedLanguage) => {
    setLanguage(lang)
    changeAppLanguage(lang)
  }

  const handleSetScale = (scale: number) => {
    setUiScale(applyUiScale(scale))
  }

  const handleRestartSetup = () => {
    onClose()
    openSetupWizard()
  }

  const handleToggleProtocolLinks = async () => {
    if (isUpdatingProtocol) return
    const next = !protocolLinksEnabled
    setProtocolLinksEnabled(next)
    setIsUpdatingProtocol(true)
    try {
      await patchWeekBoxSettingsJson({ registerProtocolLinks: next })
      if (isNeutralino()) {
        await syncWindowsProtocolRegistration(next)
      }
    } finally {
      setIsUpdatingProtocol(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('settings.title')}
      widthClass="w-[min(92vw,500px)]"
      heightClass="h-auto max-h-[85dvh]"
      actions={
        <m3e-button variant="filled" onClick={onClose}>
          {t('settings.saveAndClose')}
        </m3e-button>
      }
    >
      <div className="flex flex-col gap-4 py-1">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium">{t('settings.themeTitle')}</span>
          <p
            className="text-xs"
            style={{ color: 'var(--md-sys-color-on-surface-variant)' }}
          >
            {t('settings.themeSubtitle')}
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <m3e-button
              variant={themePref === 'light' ? 'tonal' : 'outlined'}
              onClick={() => handleSetTheme('light')}
            >
              {t('settings.lightMode')}
            </m3e-button>
            <m3e-button
              variant={themePref === 'dark' ? 'tonal' : 'outlined'}
              onClick={() => handleSetTheme('dark')}
            >
              {t('settings.darkMode')}
            </m3e-button>
            <m3e-button
              variant={themePref === 'system' ? 'tonal' : 'outlined'}
              onClick={() => handleSetTheme('system')}
            >
              {t('settings.systemMode')}
            </m3e-button>
          </div>
        </div>

        <div
          className="h-[1px] w-full"
          style={{ backgroundColor: 'var(--md-sys-color-outline-variant)' }}
        />

        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium">
            {t('settings.languageTitle')}
          </span>
          <p
            className="text-xs"
            style={{ color: 'var(--md-sys-color-on-surface-variant)' }}
          >
            {t('settings.languageSubtitle')}
          </p>
          <div className="grid grid-cols-2 gap-2 pt-2">
            {SUPPORTED_LANGUAGES.map((item) => (
              <m3e-button
                key={item.code}
                variant={language === item.code ? 'tonal' : 'outlined'}
                onClick={() => handleSetLanguage(item.code)}
                style={{ cursor: 'pointer', width: '100%' }}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <LanguageFlagIcon code={item.code} className="w-5 h-3.5" />
                  <span className="truncate">{item.nativeName}</span>
                </span>
              </m3e-button>
            ))}
          </div>
        </div>

        <div
          className="h-[1px] w-full"
          style={{ backgroundColor: 'var(--md-sys-color-outline-variant)' }}
        />

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="text-sm font-medium">
                {t('settings.scaleTitle')}
              </span>
              <p
                className="text-xs"
                style={{ color: 'var(--md-sys-color-on-surface-variant)' }}
              >
                {t('settings.scaleSubtitle', { scale: uiScale })}
              </p>
            </div>
            {uiScale !== DEFAULT_UI_SCALE && (
              <m3e-button
                variant="text"
                onClick={() => handleSetScale(DEFAULT_UI_SCALE)}
              >
                100%
              </m3e-button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {[85, 100, 110, 125].map((val) => {
              const clamped = Math.min(MAX_UI_SCALE, Math.max(MIN_UI_SCALE, val))
              return (
                <m3e-filter-chip
                  key={clamped}
                  selected={uiScale === clamped}
                  onClick={(e: React.MouseEvent) => {
                    e.preventDefault()
                    handleSetScale(clamped)
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  {clamped}%
                </m3e-filter-chip>
              )
            })}
          </div>
        </div>

        <div
          className="h-[1px] w-full"
          style={{ backgroundColor: 'var(--md-sys-color-outline-variant)' }}
        />

        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="text-sm font-medium">{t('settings.setupTitle')}</span>
            <p
              className="text-xs"
              style={{ color: 'var(--md-sys-color-on-surface-variant)' }}
            >
              {t('settings.setupSubtitle')}
            </p>
          </div>
          <m3e-button variant="tonal" onClick={handleRestartSetup}>
            {t('settings.restartSetup')}
          </m3e-button>
        </div>

        <div
          className="h-[1px] w-full"
          style={{ backgroundColor: 'var(--md-sys-color-outline-variant)' }}
        />

        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="text-sm font-medium">
              {t('settings.protocolLinksTitle', 'Open WeekBox links')}
            </span>
            <p
              className="text-xs"
              style={{ color: 'var(--md-sys-color-on-surface-variant)' }}
            >
              {t(
                'settings.protocolLinksSubtitle',
                'Register weekbox:// links (e.g. weekbox://mod/1757143) for one-click install',
              )}
            </p>
          </div>
          <m3e-switch
            checked={protocolLinksEnabled || undefined}
            disabled={isUpdatingProtocol || undefined}
            onClick={(e: React.MouseEvent) => {
              e.preventDefault()
              void handleToggleProtocolLinks()
            }}
          />
        </div>

        <div
          className="h-[1px] w-full"
          style={{ backgroundColor: 'var(--md-sys-color-outline-variant)' }}
        />

        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-medium">
              {t('settings.webInspectorTitle')}
            </span>
            <p
              className="text-xs"
              style={{ color: 'var(--md-sys-color-on-surface-variant)' }}
            >
              {t('settings.webInspectorSubtitle')}
            </p>
          </div>
          <m3e-switch checked disabled />
        </div>

        {onOpenAbout && (
          <>
            <div
              className="h-[1px] w-full"
              style={{ backgroundColor: 'var(--md-sys-color-outline-variant)' }}
            />

            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium">
                  {t('settings.aboutTitle')}
                </span>
                <p
                  className="text-xs"
                  style={{ color: 'var(--md-sys-color-on-surface-variant)' }}
                >
                  {t('settings.aboutSubtitle')}
                </p>
              </div>
              <m3e-button variant="tonal" onClick={onOpenAbout}>
                {t('settings.viewInfo')}
              </m3e-button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
