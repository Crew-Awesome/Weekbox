import { useState, useEffect, useRef, useCallback } from 'react'
import { initHost } from '@/core/host'
import type { EngineId, InstalledEngineVersion } from './types'
import { ENGINE_DEFINITIONS } from './constants'
import { getInstalledEngineVersions } from './engine-registry'
import {
  addEnginePlaytime,
  recordEngineLaunch,
  formatSessionDuration,
} from './engine-playtime'

export interface RunningProcessItem {
  name: string
  pid: number
}

export interface EngineProcessInfo {
  isRunning: boolean
  pid?: number
  exeName?: string
  sessionSeconds: number
  formattedSessionDuration: string
}

let cachedProcesses: RunningProcessItem[] = []
let lastProcessFetchTime = 0
const PROCESS_CACHE_TTL = 1500

export async function fetchRunningProcesses(): Promise<RunningProcessItem[]> {
  const host = initHost()
  if (host.platform !== 'desktop') return []

  const now = Date.now()
  if (now - lastProcessFetchTime < PROCESS_CACHE_TTL && cachedProcesses.length > 0) {
    return cachedProcesses
  }

  try {
    const isWindows =
      typeof navigator !== 'undefined'
        ? navigator.userAgent.toLowerCase().includes('win')
        : true

    if (isWindows) {
      const res = await host.process.execute('tasklist /FO CSV /NH')
      if (res.exitCode === 0 && res.stdOut) {
        const lines = res.stdOut.split(/\r?\n/)
        const list: RunningProcessItem[] = []
        for (const line of lines) {
          if (!line.trim()) continue
          const match = line.match(/^"([^"]+)","(\d+)"/)
          if (match) {
            list.push({
              name: match[1],
              pid: Number(match[2]),
            })
          }
        }
        cachedProcesses = list
        lastProcessFetchTime = now
        return list
      }
    } else {
      const res = await host.process.execute('ps -eo pid,comm')
      if (res.exitCode === 0 && res.stdOut) {
        const lines = res.stdOut.split(/\r?\n/)
        const list: RunningProcessItem[] = []
        for (const line of lines) {
          const parts = line.trim().split(/\s+/)
          if (parts.length >= 2) {
            const pid = Number(parts[0])
            if (!Number.isNaN(pid)) {
              list.push({
                name: parts.slice(1).join(' '),
                pid,
              })
            }
          }
        }
        cachedProcesses = list
        lastProcessFetchTime = now
        return list
      }
    }
  } catch (err) {
    console.warn('[WeekBox] Error querying running processes:', err)
  }

  return cachedProcesses
}

export function getEngineCandidateExes(
  engineId: EngineId | string,
  installedVersions?: InstalledEngineVersion[],
): string[] {
  const set = new Set<string>()
  const def = ENGINE_DEFINITIONS[engineId as EngineId]
  if (def?.defaultExeName) {
    set.add(def.defaultExeName.toLowerCase())
  }

  if (installedVersions) {
    for (const v of installedVersions) {
      if (v.executablePath) {
        const fileName = v.executablePath.split(/[/\\]/).pop()
        if (fileName) set.add(fileName.toLowerCase())
      }
    }
  }

  set.add(`${engineId.toLowerCase()}.exe`)
  if (engineId === 'psych') {
    set.add('psychengine.exe')
    set.add('psych.exe')
  } else if (engineId === 'vslice') {
    set.add('funkin.exe')
    set.add('fnf.exe')
  } else if (engineId === 'codename') {
    set.add('codenameengine.exe')
    set.add('codename.exe')
  } else if (engineId === 'pslice') {
    set.add('p-slice.exe')
    set.add('pslice.exe')
  } else if (engineId === 'psychonline') {
    set.add('psychonline.exe')
  } else if (engineId === 'fpsplus') {
    set.add('fpsplus.exe')
  }

  return Array.from(set)
}

export async function detectEngineProcess(
  engineId: EngineId | string,
  installedVersions?: InstalledEngineVersion[],
): Promise<{ isRunning: boolean; pid?: number; exeName?: string }> {
  const processes = await fetchRunningProcesses()
  if (processes.length === 0) return { isRunning: false }

  const candidates = getEngineCandidateExes(engineId, installedVersions)
  for (const proc of processes) {
    const procLower = proc.name.toLowerCase()
    if (candidates.includes(procLower)) {
      return {
        isRunning: true,
        pid: proc.pid,
        exeName: proc.name,
      }
    }
  }

  return { isRunning: false }
}

export async function killEngineProcess(pid: number): Promise<boolean> {
  const host = initHost()
  if (host.platform !== 'desktop' || !pid) return false
  try {
    const res = await host.process.execute(`taskkill /PID ${pid} /F`)
    cachedProcesses = []
    lastProcessFetchTime = 0
    return res.exitCode === 0
  } catch (err) {
    console.warn(`[WeekBox] Failed to kill process ${pid}:`, err)
    return false
  }
}

interface ActiveTrackedSession {
  engineId: string
  pid: number
  exeName: string
  startTime: number
  lastRecorded: number
  version?: string
}

const activeEngineSessions = new Map<string, ActiveTrackedSession>()

export function registerRunningEngineSession(
  engineId: EngineId | string,
  pid: number,
  exeName: string,
  version?: string,
): ActiveTrackedSession {
  const existing = activeEngineSessions.get(engineId)
  if (existing && existing.pid === pid) {
    return existing
  }

  const now = Date.now()
  const session: ActiveTrackedSession = {
    engineId,
    pid,
    exeName,
    startTime: now,
    lastRecorded: now,
    version,
  }

  activeEngineSessions.set(engineId, session)
  recordEngineLaunch(engineId, version)

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('wb:engine-process-detected', {
        detail: { engineId, pid, exeName, startTime: now },
      }),
    )
  }

  return session
}

export function finalizeRunningEngineSession(
  engineId: EngineId | string,
): void {
  const session = activeEngineSessions.get(engineId)
  if (!session) return

  const now = Date.now()
  const diffSec = Math.max(0, Math.floor((now - session.lastRecorded) / 1000))
  addEnginePlaytime(engineId, diffSec, {
    version: session.version,
    startTime: session.startTime,
    endTime: now,
    finalizeSession: true,
  })

  activeEngineSessions.delete(engineId)

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('wb:engine-process-exited', {
        detail: { engineId, totalDuration: Math.floor((now - session.startTime) / 1000) },
      }),
    )
  }
}

if (typeof window !== 'undefined') {
  window.setInterval(async () => {
    if (activeEngineSessions.size === 0) return
    const now = Date.now()
    const running = await fetchRunningProcesses()
    const runningPids = new Set(running.map((p) => p.pid))

    for (const [engineId, session] of Array.from(activeEngineSessions.entries())) {
      if (!runningPids.has(session.pid)) {
        finalizeRunningEngineSession(engineId)
      } else {
        const diffSec = Math.floor((now - session.lastRecorded) / 1000)
        if (diffSec >= 4) {
          addEnginePlaytime(engineId, diffSec, {
            version: session.version,
            startTime: session.startTime,
          })
          session.lastRecorded = now
        }
      }
    }
  }, 3500)
}

export function useEngineProcessState(
  engineId: EngineId,
  selectedVersion?: string,
): EngineProcessInfo & {
  stopEngine: () => Promise<boolean>
  checkNow: () => Promise<void>
} {
  const [isRunning, setIsRunning] = useState(false)
  const [pid, setPid] = useState<number | undefined>(undefined)
  const [exeName, setExeName] = useState<string | undefined>(undefined)
  const [sessionSeconds, setSessionSeconds] = useState(0)

  const isMountedRef = useRef(true)

  const checkStatus = useCallback(async () => {
    if (!isMountedRef.current) return
    try {
      const versions = await getInstalledEngineVersions(engineId)
      const res = await detectEngineProcess(engineId, versions)

      if (!isMountedRef.current) return

      if (res.isRunning && res.pid && res.exeName) {
        setIsRunning(true)
        setPid(res.pid)
        setExeName(res.exeName)

        const session = registerRunningEngineSession(
          engineId,
          res.pid,
          res.exeName,
          selectedVersion,
        )
        const elapsed = Math.floor((Date.now() - session.startTime) / 1000)
        setSessionSeconds(elapsed)
      } else {
        if (activeEngineSessions.has(engineId)) {
          finalizeRunningEngineSession(engineId)
        }
        setIsRunning(false)
        setPid(undefined)
        setExeName(undefined)
        setSessionSeconds(0)
      }
    } catch {
    }
  }, [engineId, selectedVersion])

  useEffect(() => {
    isMountedRef.current = true
    void checkStatus()

    const intervalId = window.setInterval(() => {
      void checkStatus()
    }, 2500)

    const timerIntervalId = window.setInterval(() => {
      const session = activeEngineSessions.get(engineId)
      if (session) {
        setSessionSeconds(Math.floor((Date.now() - session.startTime) / 1000))
      }
    }, 1000)

    return () => {
      isMountedRef.current = false
      window.clearInterval(intervalId)
      window.clearInterval(timerIntervalId)
    }
  }, [engineId, checkStatus])

  const stopEngine = useCallback(async (): Promise<boolean> => {
    if (!pid) return false
    const killed = await killEngineProcess(pid)
    if (killed) {
      finalizeRunningEngineSession(engineId)
      setIsRunning(false)
      setPid(undefined)
      setExeName(undefined)
      setSessionSeconds(0)
    }
    return killed
  }, [pid, engineId])

  return {
    isRunning,
    pid,
    exeName,
    sessionSeconds,
    formattedSessionDuration: formatSessionDuration(sessionSeconds),
    stopEngine,
    checkNow: checkStatus,
  }
}
