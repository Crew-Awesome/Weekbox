import { initHost } from '@/core/host'
import { ensureWeekBoxLibrary } from '@/core/storage'
import type { EngineId, EngineUpdateStateData } from './types'

export interface PlaytimeSessionEntity {
  id: string
  engineId: string
  version?: string
  date: string // YYYY-MM-DD
  startTime: number
  endTime: number
  durationSeconds: number
}

export interface DayEngineStat {
  seconds: number
  launches: number
}

export interface DayPlaytimeEntity {
  date: string // YYYY-MM-DD
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

const DEFAULT_PLAYTIME_DB: PlaytimeDatabase = {
  schemaVersion: 1,
  lastUpdated: Date.now(),
  totalSecondsAllEngines: 0,
  engines: {},
  days: {},
  sessions: [],
}

export const PLAYTIME_STORAGE_KEY = 'wbr:engine_playtimes'
export const ENGINE_PLAYTIME_CHANGED_EVENT = 'wb:engine-playtime-changed'

function emitPlaytimeChanged(engineId: string, seconds: number): void {
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
let dbQueuePromise = Promise.resolve()

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

export async function recordEngineLaunchToDb(
  engineId: EngineId | string,
  _version?: string,
): Promise<void> {
  dbQueuePromise = dbQueuePromise.then(async () => {
    try {
      const db = await loadPlaytimeDatabase()
      const today = getLocalDateKey()
      const now = Date.now()

      let engineEntity = db.engines[engineId]
      if (!engineEntity) {
        engineEntity = {
          engineId,
          totalSeconds: 0,
          totalLaunches: 0,
          firstPlayed: now,
          lastPlayed: now,
          days: {},
        }
        db.engines[engineId] = engineEntity
      }

      engineEntity.totalLaunches += 1
      engineEntity.lastPlayed = now

      if (!engineEntity.days[today]) {
        engineEntity.days[today] = { seconds: 0, launches: 0 }
      }
      engineEntity.days[today].launches += 1

      let dayEntity = db.days[today]
      if (!dayEntity) {
        dayEntity = {
          date: today,
          totalSeconds: 0,
          totalLaunches: 0,
          engines: {},
        }
        db.days[today] = dayEntity
      }
      dayEntity.totalLaunches += 1
      if (!dayEntity.engines[engineId]) {
        dayEntity.engines[engineId] = { seconds: 0, launches: 0 }
      }
      dayEntity.engines[engineId].launches += 1

      await savePlaytimeDatabase(db)
    } catch (err) {
      console.warn('Error recording engine launch in playtime db:', err)
    }
  })

  await dbQueuePromise
}

export async function addEnginePlaytimeToDb(
  engineId: EngineId | string,
  additionalSeconds: number,
  sessionInfo?: {
    version?: string
    startTime?: number
    endTime?: number
    finalizeSession?: boolean
  },
): Promise<number> {
  if (additionalSeconds <= 0 && !sessionInfo?.finalizeSession) {
    return getCachedEnginePlaytime(engineId)
  }

  let finalSeconds = 0

  dbQueuePromise = dbQueuePromise.then(async () => {
    try {
      const db = await loadPlaytimeDatabase()
      const today = getLocalDateKey()
      const now = Date.now()

      let engineEntity = db.engines[engineId]
      if (!engineEntity) {
        engineEntity = {
          engineId,
          totalSeconds: 0,
          totalLaunches: 1,
          firstPlayed: now,
          lastPlayed: now,
          days: {},
        }
        db.engines[engineId] = engineEntity
      }

      engineEntity.totalSeconds += additionalSeconds
      engineEntity.lastPlayed = now
      finalSeconds = engineEntity.totalSeconds
      db.totalSecondsAllEngines += additionalSeconds

      if (!engineEntity.days[today]) {
        engineEntity.days[today] = { seconds: 0, launches: 0 }
      }
      engineEntity.days[today].seconds += additionalSeconds

      let dayEntity = db.days[today]
      if (!dayEntity) {
        dayEntity = {
          date: today,
          totalSeconds: 0,
          totalLaunches: 0,
          engines: {},
        }
        db.days[today] = dayEntity
      }
      dayEntity.totalSeconds += additionalSeconds
      if (!dayEntity.engines[engineId]) {
        dayEntity.engines[engineId] = { seconds: 0, launches: 0 }
      }
      dayEntity.engines[engineId].seconds += additionalSeconds

      if (sessionInfo?.finalizeSession && sessionInfo.startTime) {
        const duration = Math.max(
          1,
          Math.floor(((sessionInfo.endTime || now) - sessionInfo.startTime) / 1000),
        )
        const sessionEntity: PlaytimeSessionEntity = {
          id: `${engineId}_${sessionInfo.startTime}`,
          engineId,
          version: sessionInfo.version,
          date: today,
          startTime: sessionInfo.startTime,
          endTime: sessionInfo.endTime || now,
          durationSeconds: duration,
        }
        db.sessions.push(sessionEntity)
        if (db.sessions.length > 500) {
          db.sessions.shift()
        }
      }

      await savePlaytimeDatabase(db)

      if (typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem(PLAYTIME_STORAGE_KEY)
          const map = raw ? JSON.parse(raw) : {}
          map[engineId] = finalSeconds
          localStorage.setItem(PLAYTIME_STORAGE_KEY, JSON.stringify(map))
        } catch {
        }
      }

      emitPlaytimeChanged(engineId, finalSeconds)
    } catch (err) {
      console.warn('Error writing playtime to db:', err)
    }
  })

  await dbQueuePromise
  return finalSeconds || getCachedEnginePlaytime(engineId)
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

export async function getEnginePlaytimeFromDb(engineId: string): Promise<number> {
  const db = await loadPlaytimeDatabase()
  return db.engines[engineId]?.totalSeconds || 0
}

export async function getEngineDayHistory(
  engineId: string,
): Promise<Array<{ date: string; seconds: number; launches: number }>> {
  const db = await loadPlaytimeDatabase()
  const entity = db.engines[engineId]
  if (!entity || !entity.days) return []
  return Object.entries(entity.days).map(([date, stat]) => ({
    date,
    seconds: stat.seconds,
    launches: stat.launches,
  }))
}

export async function getAllEnginePlaytimesFromDb(): Promise<Record<string, number>> {
  const db = await loadPlaytimeDatabase()
  const result: Record<string, number> = {}
  for (const [id, entity] of Object.entries(db.engines)) {
    result[id] = entity.totalSeconds
  }
  return result
}
