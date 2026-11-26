import { initHost, callDevFsBridge } from '@/core/host'
import { ensureWeekBoxLibrary, joinPaths } from '@/core/storage/weekbox-library'
import {
  getInstalledEngineVersions,
  sortInstalledVersionsDesc,
  launchEngineVersion,
  getExecutableTrackingId,
  registerRunningEngineSession,
  recordEngineLaunch,
  ENGINE_DEFINITIONS,
  type EngineId,
  type InstalledEngineVersion,
} from '@/core/engines'
import {
  isWindowsPlatform,
  createDirectoryJunction,
  removeDirectoryJunction,
  resolveModEngineId,
  isModCompatibleWithEngine,
  syncEngineMods,
  type LaunchableMod,
} from './mod-junctions'
import { detectModEngineFromFiles } from './mod-filesystem'
import { getInstalledModById } from './mod-registry-scanner'
import type { InstalledModRecord } from './types'
import type { ModItem } from '@/ui/mod-details-modal/types'

export {
  createDirectoryJunction,
  removeDirectoryJunction,
  resolveModEngineId,
  isModCompatibleWithEngine,
  syncEngineMods,
  type LaunchableMod,
}

export interface ModLaunchResult {
  success: boolean
  error?: string
  reason?:
    | 'not_installed'
    | 'engine_not_installed'
    | 'executable_not_found'
    | 'launch_failed'
  engineId?: string
  engineName?: string
  version?: string
  isExecutable?: boolean
}

export async function launchEngineWithAllMods(
  engineId: EngineId,
  version?: string,
): Promise<boolean> {
  const versions = await getInstalledEngineVersions(engineId)
  if (!versions || versions.length === 0) {
    return false
  }

  let chosenVersion: InstalledEngineVersion | undefined
  if (version && version !== 'any' && version !== 'latest') {
    chosenVersion = versions.find((v) => v.version === version)
  }
  if (!chosenVersion) {
    chosenVersion = sortInstalledVersionsDesc(versions)[0]
  }

  if (!chosenVersion || !chosenVersion.installPath) {
    return false
  }

  await syncEngineMods(engineId, chosenVersion.installPath, { allMods: true })
  return await launchEngineVersion(engineId, chosenVersion.version)
}

export async function findModExecutable(
  dirPath: string,
): Promise<string | null> {
  const host = initHost()
  const isWin = isWindowsPlatform()
  const isMac =
    typeof (window as unknown as { NL_OS?: string }).NL_OS !== 'undefined'
      ? (window as unknown as { NL_OS: string }).NL_OS === 'Darwin'
      : typeof navigator !== 'undefined' &&
        navigator.userAgent.toLowerCase().includes('mac')

  const isExecutableCandidate = (name: string): boolean => {
    const lower = name.toLowerCase()
    if (
      lower.includes('unins') ||
      lower.includes('crash') ||
      lower.includes('unitycrash')
    ) {
      return false
    }
    if (isWin) {
      return lower.endsWith('.exe')
    }
    if (isMac) {
      return lower.endsWith('.app') || !lower.includes('.')
    }
    return (
      lower.endsWith('.x86_64') ||
      lower.endsWith('.appimage') ||
      lower.endsWith('.bin') ||
      lower.endsWith('.exe') ||
      !lower.includes('.')
    )
  }

  const scanDir = async (currentDir: string, depth: number): Promise<string | null> => {
    if (depth > 3) return null
    try {
      const entries = await host.fs.readDirectory(currentDir)
      for (const entry of entries) {
        if (!entry.isDirectory && isExecutableCandidate(entry.name)) {
          return entry.path
        }
      }
      if (depth < 3) {
        for (const entry of entries) {
          if (entry.isDirectory && entry.name !== '.' && entry.name !== '..') {
            const nested = await scanDir(entry.path, depth + 1)
            if (nested) return nested
          }
        }
      }
    } catch (err) {
      if (depth === 0) {
        console.warn(`[WeekBox] Failed to scan for executable in ${dirPath}:`, err)
      }
    }
    return null
  }

  return scanDir(dirPath, 0)
}

export async function launchMod(
  mod: InstalledModRecord | ModItem,
  preferredVersion?: string,
): Promise<ModLaunchResult> {
  const host = initHost()
  const { paths } = await ensureWeekBoxLibrary()

  const rawMod = mod as Partial<InstalledModRecord> & Partial<ModItem>
  const savedRecord =
    rawMod.id !== undefined ? await getInstalledModById(rawMod.id) : null
  const anyMod: Partial<InstalledModRecord> & Partial<ModItem> = savedRecord
    ? {
        ...rawMod,
        ...savedRecord,
        categoryId: savedRecord.categoryId ?? rawMod.categoryId,
        categoryName: savedRecord.categoryName ?? rawMod.categoryName,
        engineId: savedRecord.engineId ?? rawMod.engineId,
        engineName: savedRecord.engineName ?? rawMod.engineName,
        isExecutable: savedRecord.isExecutable ?? rawMod.isExecutable,
      }
    : rawMod

  const modInstallPath =
    anyMod.installPath ||
    (anyMod.folderName ? joinPaths(paths.modsDir, anyMod.folderName) : null)

  if (!modInstallPath || !(await host.fs.exists(modInstallPath))) {
    return {
      success: false,
      reason: 'not_installed',
      error: `The mod "${anyMod.name || anyMod.title}" is not installed or its directory cannot be found.`,
    }
  }

  let isExe = Boolean(
    anyMod.isExecutable ||
      anyMod.engineId === 'executable' ||
      anyMod.engineId === 'exe',
  )

  if (!isExe && !anyMod.engineLocked) {
    try {
      const detected = await detectModEngineFromFiles(
        modInstallPath,
        anyMod.engineId,
      )
      if (detected.isExecutable) {
        isExe = true
      }
    } catch {
    }
  }

  if (isExe) {
    const exePath = await findModExecutable(modInstallPath)
    if (!exePath) {
      return {
        success: false,
        reason: 'executable_not_found',
        error: `No executable was found inside "${anyMod.name || anyMod.title}".`,
      }
    }

    try {
      const isWin = isWindowsPlatform()
      const formattedExe = isWin ? exePath.replace(/\//g, '\\') : exePath
      const lastSlash = exePath.lastIndexOf('/')
      const exeDir =
        lastSlash > 0 ? exePath.substring(0, lastSlash) : modInstallPath
      const formattedCwd = isWin ? exeDir.replace(/\//g, '\\') : exeDir

      const exeFileName = exePath.split(/[/\\]/).pop() || 'game.exe'
      const trackingId = getExecutableTrackingId(
        anyMod.id ?? anyMod.folderName ?? exeFileName,
      )
      const label = anyMod.title || anyMod.name || exeFileName

      if (host.platform === 'desktop') {
        const proc = await host.process.spawn(formattedExe, { cwd: formattedCwd })
        const numericPid = Number(proc.pid ?? proc.id)
        if (!Number.isNaN(numericPid) && numericPid > 0) {
          registerRunningEngineSession(trackingId, numericPid, exeFileName, label)
        } else {
          recordEngineLaunch(trackingId, label)
        }
        return { success: true, isExecutable: true }
      } else {
        const bridgeRes = await callDevFsBridge<{
          ok?: boolean
          pid?: number
        }>({
          action: 'spawnProcess',
          command: `"${formattedExe}"`,
          cwd: formattedCwd,
        })
        if (bridgeRes?.ok) {
          if (typeof bridgeRes.pid === 'number' && bridgeRes.pid > 0) {
            registerRunningEngineSession(trackingId, bridgeRes.pid, exeFileName, label)
          } else {
            recordEngineLaunch(trackingId, label)
          }
          return { success: true, isExecutable: true }
        }
      }
      return {
        success: false,
        reason: 'launch_failed',
        error: 'Process spawning is not supported in this environment.',
      }
    } catch (err) {
      return {
        success: false,
        reason: 'launch_failed',
        error: `Failed to launch executable: ${err instanceof Error ? err.message : String(err)}`,
      }
    }
  }

  const engineId = resolveModEngineId(anyMod)
  const engineDef = ENGINE_DEFINITIONS[engineId]
  const engineName = engineDef?.name || anyMod.engineName || engineId

  const installedVersions = await getInstalledEngineVersions(engineId)
  if (!installedVersions || installedVersions.length === 0) {
    return {
      success: false,
      reason: 'engine_not_installed',
      engineId,
      engineName,
      error: `The required engine (${engineName}) is not installed. Please install it to play this mod.`,
    }
  }

  let chosenVersion: InstalledEngineVersion | undefined
  if (
    preferredVersion &&
    preferredVersion !== 'any' &&
    preferredVersion !== 'Any version' &&
    preferredVersion !== 'latest'
  ) {
    chosenVersion = installedVersions.find((v) => v.version === preferredVersion)
  }
  if (!chosenVersion) {
    chosenVersion = sortInstalledVersionsDesc(installedVersions)[0]
  }

  const engineInstallPath = chosenVersion.installPath
  if (!engineInstallPath || !(await host.fs.exists(engineInstallPath))) {
    return {
      success: false,
      reason: 'engine_not_installed',
      engineId,
      engineName,
      error: `The installed engine directory for ${engineName} (${chosenVersion.version}) was not found.`,
    }
  }

  const modFolderName =
    anyMod.folderName ||
    (modInstallPath.includes('/')
      ? modInstallPath.substring(modInstallPath.lastIndexOf('/') + 1)
      : anyMod.name || 'mod')

  await syncEngineMods(engineId, engineInstallPath, {
    singleMod: {
      ...anyMod,
      folderName: modFolderName,
      installPath: modInstallPath,
    },
  })

  const launched = await launchEngineVersion(engineId, chosenVersion.version)
  if (!launched) {
    return {
      success: false,
      reason: 'launch_failed',
      engineId,
      engineName,
      version: chosenVersion.version,
      error: `Failed to start ${engineName} (${chosenVersion.version}).`,
    }
  }

  return {
    success: true,
    isExecutable: false,
    engineId,
    engineName,
    version: chosenVersion.version,
  }
}
