import { initHost, callDevFsBridge } from '@/core/host'
import { ensureWeekBoxLibrary, joinPaths } from '@/core/storage'
import { extractBaseModId } from './mod-filesystem'
import type { InstalledModRecord } from './types'

let manifestMutationQueue: Promise<void> = Promise.resolve()

export const MODS_CHANGED_EVENT = 'wb:mods-changed'
export const BOOKMARKS_CHANGED_EVENT = 'wb:bookmarks-changed'
export const FAVORITES_CHANGED_EVENT = 'wb:favorites-changed'

export function queueManifestMutation<T>(mutation: () => Promise<T>): Promise<T> {
  const result = manifestMutationQueue.then(mutation)
  manifestMutationQueue = result.then(
    () => undefined,
    () => undefined,
  )
  return result
}

export function emitEvent(name: string, detail?: unknown): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(name, { detail }))
  }
}

export function normalizeEngineFields(item: Partial<InstalledModRecord>) {
  const isExe = Boolean(
    item.isExecutable ||
    item.engineId === 'executable' ||
    item.engineId === 'exe',
  )

  const catStr = `${item.categoryName || ''} ${item.engineName || ''} ${item.engineId || ''} ${item.defaultEngineName || ''} ${item.description || ''} ${item.htmlBody || ''}`.toLowerCase()
  const isBaseGame =
    item.categoryId === 43777 ||
    item.categoryId === 29202 ||
    item.engineId === 'vslice' ||
    item.defaultEngineId === 'vslice' ||
    catStr.includes('v-slice') ||
    catStr.includes('vslice') ||
    catStr.includes('base game') ||
    catStr.includes('basegame') ||
    catStr.includes('juego base') ||
    catStr.includes('(base)') ||
    catStr.split(/\s+/).includes('base')

  const resolvedEngineId = isExe
    ? 'executable'
    : (isBaseGame ? 'vslice' : item.engineId)
  const resolvedEngineName = isExe
    ? 'Executable'
    : (isBaseGame ? 'V-Slice / Base Game' : (item.engineName || 'Default Engine'))
  const resolvedDefaultId = isBaseGame ? 'vslice' : item.defaultEngineId
  const resolvedDefaultName = isBaseGame ? 'V-Slice / Base Game' : item.defaultEngineName
  const resolvedIcon = isBaseGame
    ? (item.icon || '/imgs/icons/categories/vslice.png')
    : item.icon

  return {
    engineId: resolvedEngineId,
    engineName: resolvedEngineName,
    isExecutable: isExe,
    defaultEngineId: resolvedDefaultId,
    defaultEngineName: resolvedDefaultName,
    icon: resolvedIcon,
  }
}

export function matchesModId(
  item: InstalledModRecord,
  targetModId: string | number,
): boolean {
  const targetStr = String(targetModId)
  const targetBase = extractBaseModId(targetModId)
  const itemStr = String(item.id)
  const itemBase = extractBaseModId(item.id)

  if (itemStr === targetStr || itemBase === targetBase) {
    return true
  }
  if (item.modId !== undefined && String(item.modId) === targetBase) {
    return true
  }
  if (item.sourceUrl && item.sourceUrl.endsWith(`/${targetBase}`)) {
    return true
  }
  return false
}

export async function writeInstalledMods(
  records: InstalledModRecord[],
): Promise<void> {
  const host = initHost()
  const { paths } = await ensureWeekBoxLibrary()
  const targetFiles = [
    paths.installedMods,
    joinPaths(paths.dataDir, 'installed-mods.json'),
  ]

  for (const targetFile of targetFiles) {
    try {
      const tempPath = `${targetFile}.tmp`
      await host.fs.writeTextFile(tempPath, JSON.stringify(records, null, 2))
      try {
        await host.fs.move(tempPath, targetFile)
      } catch {
        try {
          await host.fs.remove(targetFile)
          await host.fs.move(tempPath, targetFile)
        } catch {
          try {
            await host.fs.remove(tempPath)
          } catch {
          }
        }
      }
    } catch (err) {
      console.warn(`[WeekBox] Failed to write ${targetFile}:`, err)
    }
  }

  emitEvent(MODS_CHANGED_EVENT, records)
}

export async function writeInstalledMetadata(
  host: ReturnType<typeof initHost>,
  record: InstalledModRecord,
): Promise<void> {
  if (!record.installPath) return
  try {
    const legacyFiles = [
      joinPaths(record.installPath, 'mod.json'),
      joinPaths(record.installPath, 'mod_url.txt'),
      joinPaths(record.installPath, 'link.txt'),
    ]
    for (const file of legacyFiles) {
      if (await host.fs.exists(file)) {
        await host.fs.remove(file)
      }
    }
  } catch {
  }
}

export async function cacheModCoverImage(
  compositeId: string | number,
  imageUrl?: string,
): Promise<{ fullPath: string; relativeCoverPath: string } | undefined> {
  const host = initHost()

  try {
    const { paths } = await ensureWeekBoxLibrary()
    const fileName = `${String(compositeId)}.webp`
    const fullPath = joinPaths(paths.modCoversDir, fileName)
    const relativeCoverPath = `mod-covers/${fileName}`

    try {
      if (await host.fs.exists(fullPath)) {
        return { fullPath, relativeCoverPath }
      }
    } catch {
    }

    let downloadUrl = imageUrl
    if (!downloadUrl || !downloadUrl.startsWith('http')) {
      const baseId = extractBaseModId(compositeId)
      if (/^\d+$/.test(baseId)) {
        try {
          const { getModById } = await import('@/services/gamebanana')
          const gbMod = await getModById(Number(baseId))
          if (gbMod?.thumbnail && gbMod.thumbnail.startsWith('http')) {
            downloadUrl = gbMod.thumbnail
          }
        } catch {
        }
      }
    }

    if (!downloadUrl || !downloadUrl.startsWith('http')) {
      return { fullPath, relativeCoverPath }
    }

    const bridgeRes = await callDevFsBridge<{ ok?: boolean }>({
      action: 'cacheCover',
      url: downloadUrl,
      imageUrl: downloadUrl,
      destPath: fullPath,
    })
    if (bridgeRes?.ok) {
      return { fullPath, relativeCoverPath }
    }

    if (host.platform === 'desktop') {
      await host.downloadFile({
        url: downloadUrl,
        destinationPath: fullPath,
      })
      return { fullPath, relativeCoverPath }
    }

    return { fullPath, relativeCoverPath }
  } catch {
  }
  return undefined
}
