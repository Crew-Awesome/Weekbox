import { initHost } from '@/core/host'
import type { EngineId, InstalledEngineVersion } from './types'
import { ENGINE_DEFINITIONS } from './constants'

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
const PROCESS_CACHE_TTL = 3500
let inFlightProcessFetch: Promise<RunningProcessItem[]> | null = null

export async function fetchRunningProcesses(): Promise<RunningProcessItem[]> {
  const host = initHost()
  if (host.platform !== 'desktop') return []

  const now = Date.now()
  if (now - lastProcessFetchTime < PROCESS_CACHE_TTL && cachedProcesses.length > 0) {
    return cachedProcesses
  }

  if (inFlightProcessFetch) {
    return inFlightProcessFetch
  }

  inFlightProcessFetch = (async () => {
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
          lastProcessFetchTime = Date.now()
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
          lastProcessFetchTime = Date.now()
          return list
        }
      }
    } catch (err) {
      console.warn('[WeekBox] Error querying running processes:', err)
    } finally {
      inFlightProcessFetch = null
    }

    return cachedProcesses
  })()

  return inFlightProcessFetch
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
