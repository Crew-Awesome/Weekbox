import { openSetupWizard } from '@/features/setup/setup-storage'
import { openWeekBoxLink } from '@/core/deep-links'
import {
  normalizeUiStyle,
  readWeekBoxSettingsJson,
  UI_STYLE_LABELS,
  type UiStyle,
  type WeekBoxSettingsJson,
} from '@/core/storage/weekbox-settings'
import { getUiStyle, setUiStyle } from '@/utils/ui-style'

export interface WeekBoxConsoleApi {
  setup: () => string
  openLink: (link: string) => Promise<boolean>
  style: UiStyle
  setStyle: (style: UiStyle) => UiStyle
  settings: () => Promise<WeekBoxSettingsJson | null>
  help: () => void
}

function logConsoleHelp(): void {
  const badgeStyle =
    'background: #6750A4; color: #ffffff; padding: 2px 6px; border-radius: 4px; font-weight: bold;'
  const codeStyle = 'font-weight: bold; color: #2196F3;'
  const descStyle = 'color: #888888;'

  console.groupCollapsed(
    '%c[WeekBox Console]%c Testing commands available via window.wb',
    badgeStyle,
    'color: inherit; font-weight: bold;',
  )
  console.log(
    '%cwb.setup()%c - Restarts the welcome setup wizard from step 1',
    codeStyle,
    descStyle,
  )
  console.log(
    '%cwb.style = "default" | "home"%c - Switches full UI style live ("default" = WeekBox Style, "home" = WeekBox Home)',
    codeStyle,
    descStyle,
  )
  console.log(
    '%cwb.openLink("weekbox://mod/1757143")%c - Opens a WeekBox protocol deep link',
    codeStyle,
    descStyle,
  )
  console.log(
    '%cawait wb.settings()%c - Prints the current WeekBox settings.json object',
    codeStyle,
    descStyle,
  )
  console.groupEnd()
}

let isRegistered = false

/**
 * Registers the `window.wb` developer/testing console helper API.
 */
export function registerWeekBoxDevTools(): void {
  if (typeof window === 'undefined') return

  const updateStyle = (value: unknown): UiStyle => {
    const normalized = normalizeUiStyle(value)
    if (!normalized) {
      console.warn(
        `[WeekBox] Invalid style option "${String(value)}". Expected "default" (WeekBox Style) or "home" (WeekBox Home).`,
      )
      return getUiStyle()
    }
    const applied = setUiStyle(normalized)
    console.info(
      `[WeekBox] UI style changed to "${applied}" (${UI_STYLE_LABELS[applied]}).`,
    )
    return applied
  }

  const wbApi = {
    setup: (): string => {
      openSetupWizard()
      console.info('[WeekBox] Setup wizard started from step 1.')
      return 'Setup wizard started from step 1.'
    },
    openLink: (link: string): Promise<boolean> => openWeekBoxLink(link),
    setStyle: (style: UiStyle): UiStyle => updateStyle(style),
    settings: (): Promise<WeekBoxSettingsJson | null> =>
      readWeekBoxSettingsJson(),
    help: (): void => logConsoleHelp(),
  } as WeekBoxConsoleApi

  Object.defineProperty(wbApi, 'style', {
    enumerable: true,
    configurable: true,
    get: (): UiStyle => getUiStyle(),
    set: (value: unknown) => {
      updateStyle(value)
    },
  })

  window.wb = wbApi

  if (!isRegistered) {
    isRegistered = true
    logConsoleHelp()
  }
}
