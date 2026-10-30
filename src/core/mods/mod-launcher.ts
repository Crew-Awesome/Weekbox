import { initHost, callDevFsBridge } from '@/core/host'
import { ensureWeekBoxLibrary, joinPaths } from '@/core/storage'
import {
  getInstalledEngineVersions,
  launchEngineVersion,
  trackEngineSession,
  ENGINE_DEFINITIONS,
  type EngineId,
  type InstalledEngineVersion,
} from '@/core/engines'
import type { InstalledModRecord } from './types'
import type { ModItem } from '@/ui/mod-details-modal/types'

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

function isWindowsPlatform(): boolean {
  if (typeof (window as unknown as { NL_OS?: string }).NL_OS !== 'undefined') {
    return (window as unknown as { NL_OS: string }).NL_OS === 'Windows'
  }
  if (typeof navigator !== 'undefined') {
    return navigator.userAgent.toLowerCase().includes('win')
  }
  return false
}

export async function createDirectoryJunction(
  linkPath: string,
  targetPath: string,
): Promise<boolean> {
  const host = initHost()
  const isWin = isWindowsPlatform()

  const lastSlash = linkPath.lastIndexOf('/')
  const parentDir = lastSlash > 0 ? linkPath.substring(0, lastSlash) : linkPath
  if (!(await host.fs.exists(parentDir))) {
    try {
      await host.fs.createDirectory(parentDir)
    } catch {
    }
  }

  if (await host.fs.exists(linkPath)) {
    try {
      if (isWin) {
        const winLink = linkPath.replace(/\//g, '\\')
        await host.process.execute(`cmd.exe /c rmdir "${winLink}"`)
      } else {
        await host.process.execute(`rm -rf "${linkPath}"`)
      }
    } catch {
    }
  }

  try {
    const bridgeRes = await callDevFsBridge<{ ok?: boolean }>({
      action: 'createLink',
      sourcePath: targetPath,
      destinationPath: linkPath,
    })
    if (bridgeRes?.ok) {
      return true
    }
  } catch {
  }

  try {
    if (isWin) {
      const winLink = linkPath.replace(/\//g, '\\')
      const winTarget = targetPath.replace(/\//g, '\\')
      const res = await host.process.execute(
        `cmd.exe /c mklink /J "${winLink}" "${winTarget}"`,
      )
      if (res.exitCode === 0 || (await host.fs.exists(linkPath))) {
        return true
      }
    } else {
      await host.process.execute(`ln -s "${targetPath}" "${linkPath}"`)
      if (await host.fs.exists(linkPath)) {
        return true
      }
    }
  } catch (err) {
    console.warn('[WeekBox] Directory junction creation failed:', err)
  }

  return await host.fs.exists(linkPath)
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

  try {
    const entries = await host.fs.readDirectory(dirPath)
    for (const entry of entries) {
      if (!entry.isDirectory && isExecutableCandidate(entry.name)) {
        return entry.path
      }
    }
    for (const entry of entries) {
      if (entry.isDirectory && entry.name !== '.' && entry.name !== '..') {
        try {
          const subEntries = await host.fs.readDirectory(entry.path)
          for (const sub of subEntries) {
            if (!sub.isDirectory && isExecutableCandidate(sub.name)) {
              return sub.path
            }
          }
        } catch {
        }
      }
    }
  } catch (err) {
    console.warn(`[WeekBox] Failed to scan for executable in ${dirPath}:`, err)
  }
  return null
}

export async function launchMod(
  mod: InstalledModRecord | ModItem,
  preferredVersion?: string,
): Promise<ModLaunchResult> {
  const host = initHost()
  const { paths } = await ensureWeekBoxLibrary()

  const anyMod = mod as Partial<InstalledModRecord> & Partial<ModItem>

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

  const isExe = Boolean(
    anyMod.isExecutable ||
      anyMod.engineId === 'executable' ||
      anyMod.engineId === 'exe',
  )

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

      if (host.platform === 'desktop') {
        const proc = await host.process.spawn(formattedExe, { cwd: formattedCwd })
        if (anyMod.defaultEngineId && anyMod.defaultEngineId in ENGINE_DEFINITIONS) {
          trackEngineSession(anyMod.defaultEngineId as EngineId, proc.id ?? proc.pid)
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
          if (anyMod.defaultEngineId && anyMod.defaultEngineId in ENGINE_DEFINITIONS) {
            trackEngineSession(anyMod.defaultEngineId as EngineId, bridgeRes.pid)
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

  let rawEngine = String(anyMod.engineId || anyMod.defaultEngineId || 'psych')
  if (rawEngine === 'executable' || rawEngine === 'exe') {
    rawEngine = String(anyMod.defaultEngineId || 'psych')
  }
  const lowerEngine = rawEngine.toLowerCase()
  if (
    lowerEngine === 'base' ||
    lowerEngine === 'basegame' ||
    lowerEngine === 'base game' ||
    lowerEngine === 'juego base' ||
    lowerEngine === 'v-slice' ||
    lowerEngine === 'vslice'
  ) {
    rawEngine = 'vslice'
  }
  const engineId = rawEngine as EngineId

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
    chosenVersion =
      installedVersions.find((v) => v.isDefault) || installedVersions[0]
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

  const engineModsDir = joinPaths(engineInstallPath, 'mods')
  if (!(await host.fs.exists(engineModsDir))) {
    try {
      await host.fs.createDirectory(engineModsDir)
    } catch (err) {
      console.warn(
        `[WeekBox] Failed to create mods folder in ${engineInstallPath}:`,
        err,
      )
    }
  }

  const modFolderName =
    anyMod.folderName ||
    (modInstallPath.includes('/')
      ? modInstallPath.substring(modInstallPath.lastIndexOf('/') + 1)
      : anyMod.name || 'mod')

  const destinationLinkPath = joinPaths(engineModsDir, modFolderName)
  await createDirectoryJunction(destinationLinkPath, modInstallPath)

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
