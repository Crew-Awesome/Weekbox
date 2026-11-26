import { patchWeekBoxSettingsJson } from '@/core/storage/weekbox-settings'

export const SETUP_COMPLETED_KEY = 'wb_setup_completed'
export const SETUP_OPEN_EVENT = 'wb:open-setup'
export const SETUP_CLOSE_EVENT = 'wb:close-setup'

interface SetupPersistOptions {
  persistToJson?: boolean
}

/**
 * Returns whether the user has already completed the initial welcome setup wizard.
 */
export function hasCompletedSetup(): boolean {
  if (typeof window === 'undefined') return true
  try {
    return localStorage.getItem(SETUP_COMPLETED_KEY) === 'true'
  } catch {
    return false
  }
}

/**
 * Marks the setup wizard as completed in localStorage and WeekBox settings JSON.
 */
export function markSetupCompleted(options?: SetupPersistOptions): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SETUP_COMPLETED_KEY, 'true')
    }
  } catch {
    // Ignore storage write errors
  }
  if (options?.persistToJson !== false) {
    void patchWeekBoxSettingsJson({ setupCompleted: true })
  }
}

/**
 * Clears completion state and dispatches the event to restart the setup wizard from step 1.
 */
export function openSetupWizard(options?: SetupPersistOptions): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(SETUP_COMPLETED_KEY)
    }
  } catch {
    // Ignore storage write errors
  }
  if (options?.persistToJson !== false) {
    void patchWeekBoxSettingsJson({ setupCompleted: false })
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SETUP_OPEN_EVENT))
  }
}
