import {
  getThemePreference,
  applyTheme,
  type ThemePreference,
} from '@/utils/theme'
import {
  applyUiScale,
  getSavedUiScale,
  MAX_UI_SCALE,
  MIN_UI_SCALE,
} from '@/utils/ui-scale'
import { getUiStyle, setUiStyle } from '@/utils/ui-style'
import {
  changeAppLanguage,
  getSavedLanguage,
  isSupportedLanguage,
} from '@/core/i18n'
import {
  hasCompletedSetup,
  markSetupCompleted,
  openSetupWizard,
  SETUP_CLOSE_EVENT,
} from '@/features/setup/setup-storage'
import type { LibraryInitializeResult } from './types'
import {
  hasTouchedSettingsKey,
  normalizeUiStyle,
  patchWeekBoxSettingsJson,
  readWeekBoxSettingsJson,
} from './weekbox-settings'

let hasSyncedStartupSettings = false

function isThemePreference(val: unknown): val is ThemePreference {
  return val === 'light' || val === 'dark' || val === 'system'
}

/**
 * Synchronizes WeekBox runtime preferences with `WeekBoxLibrary/settings.json`
 * once the active library directory is ensured during startup.
 */
export async function syncWeekBoxSettingsOnStartup(
  initResult?: LibraryInitializeResult | null,
): Promise<void> {
  if (hasSyncedStartupSettings) return
  hasSyncedStartupSettings = true

  const createdSettingsNow = Boolean(
    initResult &&
      initResult.createdFiles.includes(initResult.paths.settings),
  )

  const disk = await readWeekBoxSettingsJson()
  const rawDiskStyle = disk ? disk.uiStyle ?? disk.sidebarStyle : undefined

  // Fresh settings.json or legacy stub (neither uiStyle nor sidebarStyle yet): seed from current prefs
  if (!disk || createdSettingsNow || rawDiskStyle === undefined) {
    await patchWeekBoxSettingsJson({
      theme: getThemePreference(),
      language: getSavedLanguage(),
      uiScale: getSavedUiScale(),
      uiStyle: getUiStyle(),
      setupCompleted: hasCompletedSetup(),
    })
    return
  }

  const diskStyle = normalizeUiStyle(rawDiskStyle)
  if (diskStyle && !hasTouchedSettingsKey('uiStyle')) {
    setUiStyle(diskStyle, { persistToJson: false })
  }

  if (isThemePreference(disk.theme) && !hasTouchedSettingsKey('theme')) {
    if (disk.theme !== getThemePreference()) {
      applyTheme(disk.theme, { persistToJson: false })
    }
  }

  if (isSupportedLanguage(disk.language) && !hasTouchedSettingsKey('language')) {
    if (disk.language !== getSavedLanguage()) {
      changeAppLanguage(disk.language, { persistToJson: false })
    }
  }

  if (
    typeof disk.uiScale === 'number' &&
    Number.isFinite(disk.uiScale) &&
    disk.uiScale >= MIN_UI_SCALE &&
    disk.uiScale <= MAX_UI_SCALE &&
    !hasTouchedSettingsKey('uiScale')
  ) {
    if (Math.round(disk.uiScale) !== getSavedUiScale()) {
      applyUiScale(disk.uiScale, { immediate: true, persistToJson: false })
    }
  }

  if (
    typeof disk.setupCompleted === 'boolean' &&
    !hasTouchedSettingsKey('setupCompleted')
  ) {
    const localDone = hasCompletedSetup()
    if (disk.setupCompleted && !localDone) {
      markSetupCompleted({ persistToJson: false })
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(SETUP_CLOSE_EVENT))
      }
    } else if (!disk.setupCompleted && localDone) {
      openSetupWizard({ persistToJson: false })
    }
  }
}
