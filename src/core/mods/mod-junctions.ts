import { initHost, callDevFsBridge } from '@/core/host'
import { ensureWeekBoxLibrary, joinPaths } from '@/core/storage/weekbox-library'
import { ENGINE_DEFINITIONS, type EngineId } from '@/core/engines'
import { getInstalledMods, matchesModId } from './mod-registry'
import type { InstalledModRecord } from './types'
import type { ModItem } from '@/ui/mod-details-modal/types'

export type LaunchableMod = Partial<InstalledModRecord> & Partial<ModItem>

export function isWindowsPlatform(): boolean {
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
