import type { EngineId } from './types'
import {
  PLAYTIME_STORAGE_KEY,
  ENGINE_PLAYTIME_CHANGED_EVENT,
  emitPlaytimeChanged,
  getLocalDateKey,
  loadPlaytimeDatabase,
  savePlaytimeDatabase,
  getCachedEnginePlaytime,
  type PlaytimeSessionEntity,
  type DayEngineStat,
  type DayPlaytimeEntity,
  type EnginePlaytimeEntity,
  type PlaytimeDatabase,
} from './playtime-db-storage'

export {
  PLAYTIME_STORAGE_KEY,
  ENGINE_PLAYTIME_CHANGED_EVENT,
  getLocalDateKey,
  loadPlaytimeDatabase,
  savePlaytimeDatabase,
  getCachedEnginePlaytime,
  type PlaytimeSessionEntity,
  type DayEngineStat,
  type DayPlaytimeEntity,
  type EnginePlaytimeEntity,
  type PlaytimeDatabase,
}

let dbQueuePromise = Promise.resolve()

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
