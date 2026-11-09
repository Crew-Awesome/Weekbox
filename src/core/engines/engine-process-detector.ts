import { useState, useEffect, useRef, useCallback } from 'react'
import type { EngineId } from './types'
import { getInstalledEngineVersions } from './engine-registry'
import {
  addEnginePlaytime,
  recordEngineLaunch,
  formatSessionDuration,
} from './engine-playtime'
import {
  fetchRunningProcesses,
  getEngineCandidateExes,
  detectEngineProcess,
  killEngineProcess,
  type RunningProcessItem,
  type EngineProcessInfo,
} from './engine-process-scanner'

export {
  fetchRunningProcesses,
  getEngineCandidateExes,
  detectEngineProcess,
  killEngineProcess,
  type RunningProcessItem,
  type EngineProcessInfo,
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
  const isCheckingRef = useRef(false)

  const checkStatus = useCallback(async () => {
    if (!isMountedRef.current || isCheckingRef.current) return
    isCheckingRef.current = true
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
    } finally {
      isCheckingRef.current = false
    }
  }, [engineId, selectedVersion])

  useEffect(() => {
    isMountedRef.current = true
    void checkStatus()

    const intervalId = window.setInterval(() => {
      void checkStatus()
    }, 4000)

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
