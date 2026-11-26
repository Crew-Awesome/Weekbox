import * as Neutralino from '@neutralinojs/lib'
import { isNeutralino } from '@/core/host'
import { readWeekBoxSettingsJson } from '@/core/storage/weekbox-settings'
import { getWeekBoxLinkFromArgs, openWeekBoxLink } from './deep-links'
import {
  focusWeekBoxWindow,
  syncWindowsProtocolRegistration,
} from './windows-protocol'
import {
  createDeepLinkCoordinator,
  ensureSingleInstance,
  handoffToPrimaryInstance,
  isDevelopmentNeutralinoRun,
} from './single-instance'

export * from './deep-links'
export {
  focusWeekBoxWindow,
  syncWindowsProtocolRegistration,
} from './windows-protocol'

let initialized = false
let handoffPollTimer: ReturnType<typeof setInterval> | null = null

export async function initWeekBoxDeepLinks(): Promise<void> {
  if (initialized) return
  initialized = true

  if (typeof window === 'undefined') return

  // Check for deep-link query/hash parameters in web or desktop launches
  const launchLink = getWeekBoxLinkFromArgs()

  if (isNeutralino()) {
    const coordinator = createDeepLinkCoordinator()

    await Neutralino.events
      .on('weekbox:deep-link', (event: CustomEvent<{ link?: string; url?: string } | string>) => {
        const detail = event?.detail
        const incoming =
          typeof detail === 'string' ? detail : detail?.link || detail?.url
        coordinator.handleLink(incoming)
      })
      .catch(() => {})

    await Neutralino.events
      .on('weekbox:focus', () => {
        void focusWeekBoxWindow()
      })
      .catch(() => {})

    const isPrimary = await ensureSingleInstance()
    if (!isPrimary) {
      await handoffToPrimaryInstance()
      return
    }

    await focusWeekBoxWindow()

    if (!isDevelopmentNeutralinoRun() && !handoffPollTimer) {
      handoffPollTimer = setInterval(() => {
        void coordinator.checkPendingHandoff()
      }, 300)
    }

    try {
      const settings = await readWeekBoxSettingsJson()
      const registerEnabled = settings?.registerProtocolLinks !== false
      void syncWindowsProtocolRegistration(registerEnabled)
    } catch {
      void syncWindowsProtocolRegistration(true)
    }
  }

  if (launchLink) {
    await openWeekBoxLink(launchLink)
  }
}
