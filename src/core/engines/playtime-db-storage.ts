import { initHost } from '@/core/host'
import { ensureWeekBoxLibrary } from '@/core/storage/weekbox-library'
import type { EngineUpdateStateData } from './types'

export interface PlaytimeSessionEntity {
  id: string
  engineId: string
  version?: string
  date: string
  startTime: number
  endTime: number
  durationSeconds: number
}

export interface DayEngineStat {
  seconds: number
  launches: number
}

export interface DayPlaytimeEntity {
  date: string
  totalSeconds: number
  totalLaunches: number
  engines: Record<string, DayEngineStat>
}

export interface EnginePlaytimeEntity {
  engineId: string
  totalSeconds: number
  totalLaunches: number
  firstPlayed: number
  lastPlayed: number
  days: Record<string, DayEngineStat>
}

export interface PlaytimeDatabase {
  schemaVersion: number
  lastUpdated: number
  totalSecondsAllEngines: number
  engines: Record<string, EnginePlaytimeEntity>
  days: Record<string, DayPlaytimeEntity>
  sessions: PlaytimeSessionEntity[]
}

export const DEFAULT_PLAYTIME_DB: PlaytimeDatabase = {
  schemaVersion: 1,
  lastUpdated: Date.now(),
  totalSecondsAllEngines: 0,
  engines: {},
  days: {},
  sessions: [],
}

export const PLAYTIME_STORAGE_KEY = 'wbr:engine_playtimes'
export const ENGINE_PLAYTIME_CHANGED_EVENT = 'wb:engine-playtime-changed'

export function emitPlaytimeChanged(engineId: string, seconds: number): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(ENGINE_PLAYTIME_CHANGED_EVENT, {
        detail: { engineId, seconds },
      }),
    )
  }
}

export function getLocalDateKey(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

let cachedDb: PlaytimeDatabase | null = null

export async function loadPlaytimeDatabase(): Promise<PlaytimeDatabase> {
  try {
    const host = initHost()
    const { paths } = await ensureWeekBoxLibrary()
    const playtimePath = paths.playtimeDatabase

    const exists = await host.fs.exists(playtimePath)
    if (exists) {
      const raw = await host.fs.readTextFile(playtimePath)
      if (raw && raw.trim()) {
        try {
          const parsed = JSON.parse(raw) as PlaytimeDatabase
          if (parsed && typeof parsed === 'object' && parsed.engines) {
            cachedDb = parsed
            return parsed
          }
        } catch {
        }
      }
    }

    const initialDb: PlaytimeDatabase = {
      ...DEFAULT_PLAYTIME_DB,
      lastUpdated: Date.now(),
    }

    try {
      if (await host.fs.exists(paths.engineUpdateState)) {
        const rawState = await host.fs.readTextFile(paths.engineUpdateState)
        if (rawState && rawState.trim()) {
          const parsedState = JSON.parse(rawState) as EngineUpdateStateData
          if (parsedState?.engines) {
            for (const [eId, record] of Object.entries(parsedState.engines)) {
              if (!record) continue
              const totalSec =
                typeof record.playtimeSeconds === 'number'
                  ? record.playtimeSeconds
                  : record.playtimeStats?.totalSeconds || 0
              const launches =
                record.launchCount || record.playtimeStats?.totalLaunches || 0
              if (totalSec > 0 || launches > 0) {
                const today = getLocalDateKey()
                initialDb.engines[eId] = {
                  engineId: eId,
                  totalSeconds: totalSec,
                  totalLaunches: launches,
                  firstPlayed: Date.now(),
                  lastPlayed: Date.now(),
                  days: {
                    [today]: {
                      seconds: totalSec,
                      launches,
                    },
                  },
                }
                initialDb.days[today] = {
                  date: today,
                  totalSeconds: totalSec,
                  totalLaunches: launches,
                  engines: {
                    [eId]: {
                      seconds: totalSec,
                      launches,
                    },
                  },
                }
                initialDb.totalSecondsAllEngines += totalSec
              }
            }
          }
        }
      }
    } catch {
    }

    cachedDb = initialDb
    await host.fs.writeTextFile(playtimePath, JSON.stringify(initialDb, null, 2))
    return initialDb
  } catch (err) {
    console.warn('Failed to load or initialize playtime database:', err)
    return cachedDb || DEFAULT_PLAYTIME_DB
  }
}

export async function savePlaytimeDatabase(db: PlaytimeDatabase): Promise<void> {
  cachedDb = db
  db.lastUpdated = Date.now()
  try {
    const host = initHost()
    const { paths } = await ensureWeekBoxLibrary()
    await host.fs.writeTextFile(paths.playtimeDatabase, JSON.stringify(db, null, 2))
  } catch (err) {
    console.warn('Failed to write playtime.json:', err)
  }
}

export function getCachedEnginePlaytime(engineId: string): number {
  if (cachedDb?.engines[engineId]) {
    return cachedDb.engines[engineId].totalSeconds
  }
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(PLAYTIME_STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        return parsed[engineId] || 0
      }
    } catch {
    }
  }
  return 0
}
