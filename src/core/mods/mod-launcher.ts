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
import { getInstalledMods, matchesModId } from './mod-registry'
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
      await removeDirectoryJunction(linkPath)
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

export async function removeDirectoryJunction(
  linkPath: string,
): Promise<boolean> {
  const host = initHost()
  const isWin = isWindowsPlatform()

  try {
    const bridgeRes = await callDevFsBridge<{ ok?: boolean }>({
      action: 'unlink',
      path: linkPath,
    })
    if (bridgeRes?.ok) {
      return true
    }
  } catch {
  }

  try {
    if (isWin) {
      const winLink = linkPath.replace(/\//g, '\\')
      await host.process.execute(`cmd.exe /c rmdir "${winLink}"`)
    } else {
      await host.process.execute(`unlink "${linkPath}" || rm -f "${linkPath}"`)
    }
  } catch {
  }

  return true
}

export type LaunchableMod = Partial<InstalledModRecord> & Partial<ModItem>

export function resolveModEngineId(
  mod: LaunchableMod,
): EngineId {
  let raw = String(mod.engineId || mod.defaultEngineId || 'psych').trim().toLowerCase()
  if (raw === 'executable' || raw === 'exe') {
    raw = String(mod.defaultEngineId || 'psych').trim().toLowerCase()
  }

  if (
    raw === 'base' ||
    raw === 'basegame' ||
    raw === 'base game' ||
    raw === 'juego base' ||
    raw === 'v-slice' ||
    raw === 'vslice'
  ) {
    return 'vslice'
  }

  if (raw in ENGINE_DEFINITIONS) {
    return raw as EngineId
  }

  if (raw.includes('codename')) return 'codename'
  if (raw.includes('pslice') || raw.includes('p-slice')) return 'pslice'
  if (raw.includes('psychonline') || raw.includes('online')) return 'psychonline'
  if (raw.includes('fpsplus') || raw.includes('fps plus')) return 'fpsplus'
  if (raw.includes('vslice') || raw.includes('v-slice')) return 'vslice'

  return 'psych'
}

export function isModCompatibleWithEngine(
  mod: LaunchableMod,
  targetEngineId: EngineId,
): boolean {
  if (
    mod.isExecutable ||
    mod.engineId === 'executable' ||
    mod.engineId === 'exe'
  ) {
    return false
  }

  const resolved = resolveModEngineId(mod)
  return resolved === targetEngineId
}

export async function syncEngineMods(
  engineId: EngineId,
  engineInstallPath: string,
  options: {
    singleMod?: LaunchableMod
    allMods?: boolean
  } = {},
): Promise<void> {
  const host = initHost()
  const engineModsDir = joinPaths(engineInstallPath, 'mods')
  if (!(await host.fs.exists(engineModsDir))) {
    try {
      await host.fs.createDirectory(engineModsDir)
    } catch (err) {
      console.warn(`[WeekBox] Failed to create mods folder in ${engineInstallPath}:`, err)
    }
  }

  const { paths } = await ensureWeekBoxLibrary()
  const allInstalled = await getInstalledMods()

  const knownModNames = new Set<string>()
  for (const m of allInstalled) {
    if (m.folderName) knownModNames.add(m.folderName)
    if (m.name) knownModNames.add(m.name)
    if (m.title) knownModNames.add(m.title)
  }

  if (options.singleMod) {
    const single = options.singleMod
    const singleInstallPath =
      single.installPath ||
      (single.folderName ? joinPaths(paths.modsDir, single.folderName) : null)
    const singleFolderName =
      single.folderName ||
      (singleInstallPath && singleInstallPath.includes('/')
        ? singleInstallPath.substring(singleInstallPath.lastIndexOf('/') + 1)
        : single.name || 'mod')

    for (const record of allInstalled) {
      const isTarget =
        (single.id !== undefined && matchesModId(record, single.id)) ||
        record.folderName === singleFolderName

      if (!isTarget) {
        if (record.folderName) {
          await removeDirectoryJunction(joinPaths(engineModsDir, record.folderName))
        }
        if (record.name && record.name !== singleFolderName) {
          await removeDirectoryJunction(joinPaths(engineModsDir, record.name))
        }
        if (record.title && record.title !== singleFolderName) {
          await removeDirectoryJunction(joinPaths(engineModsDir, record.title))
        }
      }
    }

    try {
      const entries = await host.fs.readDirectory(engineModsDir)
      for (const entry of entries) {
        if (entry.name !== singleFolderName && knownModNames.has(entry.name)) {
          await removeDirectoryJunction(joinPaths(engineModsDir, entry.name))
        }
      }
    } catch {
    }

    if (singleInstallPath) {
      const destLink = joinPaths(engineModsDir, singleFolderName)
      await createDirectoryJunction(destLink, singleInstallPath)
    }
  } else if (options.allMods) {
    for (const record of allInstalled) {
      const folder = record.folderName || record.name
      if (!folder) continue

      const modPath = record.installPath || joinPaths(paths.modsDir, folder)
      const linkPath = joinPaths(engineModsDir, folder)

      const isVisible = record.visible !== false && !record.hidden

      if (isModCompatibleWithEngine(record, engineId) && isVisible) {
        if (await host.fs.exists(modPath)) {
          await createDirectoryJunction(linkPath, modPath)
        }
      } else {
        await removeDirectoryJunction(linkPath)
        if (record.name && record.name !== folder) {
          await removeDirectoryJunction(joinPaths(engineModsDir, record.name))
        }
        if (record.title && record.title !== folder) {
          await removeDirectoryJunction(joinPaths(engineModsDir, record.title))
        }
      }
    }

    try {
      const entries = await host.fs.readDirectory(engineModsDir)
      for (const entry of entries) {
        const matchingMod = allInstalled.find(
          (m) => m.folderName === entry.name || m.name === entry.name || m.title === entry.name,
        )
        const isMatchingModVisible = matchingMod
          ? matchingMod.visible !== false && !matchingMod.hidden
          : false
        if (matchingMod && (!isModCompatibleWithEngine(matchingMod, engineId) || !isMatchingModVisible)) {
          await removeDirectoryJunction(joinPaths(engineModsDir, entry.name))
        }
      }
    } catch {
    }
  }
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
    chosenVersion = versions.find((v) => v.isDefault) || versions[0]
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
