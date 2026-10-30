import type { EngineId } from './types'
import {
  PLAYTIME_STORAGE_KEY,
  ENGINE_PLAYTIME_CHANGED_EVENT,
  recordEngineLaunchToDb,
  addEnginePlaytimeToDb,
  loadPlaytimeDatabase,
  getCachedEnginePlaytime,
} from './playtime-db'

export {
  PLAYTIME_STORAGE_KEY,
  ENGINE_PLAYTIME_CHANGED_EVENT,
  loadPlaytimeDatabase,
  recordEngineLaunchToDb,
  addEnginePlaytimeToDb,
} from './playtime-db'
export type {
  PlaytimeDatabase,
  PlaytimeSessionEntity,
  DayPlaytimeEntity,
  EnginePlaytimeEntity,
} from './playtime-db'
export { getLocalDateParts, updatePlaytimeStats } from './engine-playtime-stats'

function emitPlaytimeChanged(engineId: string, seconds: number): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(ENGINE_PLAYTIME_CHANGED_EVENT, {
        detail: { engineId, seconds },
      }),
    )
  }
}

export function getAllEnginePlaytimes(): Record<string, number> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(PLAYTIME_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return typeof parsed === 'object' && parsed !== null ? parsed : {}
  } catch {
    return {}
  }
}

export function getEnginePlaytime(engineId: string): number {
  return getCachedEnginePlaytime(engineId)
}

export function recordEngineLaunch(engineId: string, version?: string): void {
  void recordEngineLaunchToDb(engineId, version)
}

export function addEnginePlaytime(
  engineId: string,
  additionalSeconds: number,
  sessionInfo?: {
    version?: string
    startTime?: number
    endTime?: number
    finalizeSession?: boolean
  },
): number {
  if (additionalSeconds <= 0 && !sessionInfo?.finalizeSession) {
    return getEnginePlaytime(engineId)
  }
  const map = getAllEnginePlaytimes()
  const current = map[engineId] || 0
  const updated = current + additionalSeconds
  map[engineId] = updated
  try {
    localStorage.setItem(PLAYTIME_STORAGE_KEY, JSON.stringify(map))
  } catch {
  }
  emitPlaytimeChanged(engineId, updated)

  void addEnginePlaytimeToDb(engineId, additionalSeconds, sessionInfo)
  return updated
}

export async function syncPlaytimesFromEngineState(): Promise<Record<string, number>> {
  try {
    const db = await loadPlaytimeDatabase()
    const map = getAllEnginePlaytimes()
    let changed = false
    for (const [eId, entity] of Object.entries(db.engines)) {
      if (entity) {
        const secs = entity.totalSeconds || 0
        const current = map[eId] || 0
        if (secs > current) {
          map[eId] = secs
          changed = true
          emitPlaytimeChanged(eId, secs)
        }
      }
    }
    if (changed && typeof window !== 'undefined') {
      try {
        localStorage.setItem(PLAYTIME_STORAGE_KEY, JSON.stringify(map))
      } catch {
      }
    }
    return map
  } catch {
    return getAllEnginePlaytimes()
  }
}

if (typeof window !== 'undefined') {
  void syncPlaytimesFromEngineState()
}

export function formatPlaytime(seconds: number): string {
  if (!seconds || seconds <= 0) return '0m'
  const s = Math.round(seconds)
  if (s < 60) {
    return `${s}s`
  }
  const m = Math.floor(s / 60)
  if (m < 60) {
    return `${m}m`
  }
  const h = Math.floor(m / 60)
  const remM = m % 60
  return remM > 0 ? `${h}h ${remM}m` : `${h}h`
}

export function formatSessionDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '00:00'
  const total = Math.round(seconds)
  const m = Math.floor(total / 60)
  const s = total % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  if (m < 60) {
    return `${pad(m)}:${pad(s)}`
  }
  const h = Math.floor(m / 60)
  const remM = m % 60
  return `${pad(h)}:${pad(remM)}:${pad(s)}`
}

export function trackEngineSession(
  engineId: EngineId | string,
  procId?: number | string,
  version?: string,
): () => void {
  recordEngineLaunch(engineId, version)

  const startTime = Date.now()
  let lastRecorded = startTime
  let isStopped = false

  const intervalId = window.setInterval(() => {
    if (isStopped) return
    const now = Date.now()
    const diffSec = Math.floor((now - lastRecorded) / 1000)
    if (diffSec >= 4) {
      addEnginePlaytime(engineId, diffSec, {
        version,
        startTime,
      })
      lastRecorded = now
    }
  }, 4000)

  const stopTracking = () => {
    if (isStopped) return
    isStopped = true
    window.clearInterval(intervalId)
    const now = Date.now()
    const diffSec = Math.max(0, Math.floor((now - lastRecorded) / 1000))
    addEnginePlaytime(engineId, diffSec, {
      version,
      startTime,
      endTime: now,
      finalizeSession: true,
    })
  }

  const handleProcessEvent = (evt: Event) => {
    const custom = evt as CustomEvent<{ id?: number | string; action?: string }>
    const detail = custom.detail
    if (!detail) return
    if (procId !== undefined && String(detail.id) === String(procId)) {
      if (detail.action === 'exit') {
        stopTracking()
        window.removeEventListener('spawnedProcess', handleProcessEvent)
      }
    }
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('spawnedProcess', handleProcessEvent)
    window.addEventListener('beforeunload', stopTracking)
  }

  return stopTracking
}
