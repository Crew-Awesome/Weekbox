import { initHost, callDevFsBridge } from '@/core/host'
import { ensureWeekBoxLibrary, joinPaths } from '@/core/storage'
import { extractBaseModId } from './mod-filesystem'
import type { InstalledModRecord } from './types'

const FAVORITES_STORAGE_KEY = 'wbr:favorite_mods'
let manifestMutationQueue: Promise<void> = Promise.resolve()

export const MODS_CHANGED_EVENT = 'wb:mods-changed'
export const BOOKMARKS_CHANGED_EVENT = 'wb:bookmarks-changed'
export const FAVORITES_CHANGED_EVENT = 'wb:favorites-changed'

function queueManifestMutation<T>(mutation: () => Promise<T>): Promise<T> {
  const result = manifestMutationQueue.then(mutation)
  manifestMutationQueue = result.then(
    () => undefined,
    () => undefined,
  )
  return result
}

function emitEvent(name: string, detail?: unknown): void {
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

export async function getInstalledMods(): Promise<InstalledModRecord[]> {
  const host = initHost()
  try {
    const { paths } = await ensureWeekBoxLibrary()
    const recordsMap = new Map<string, InstalledModRecord>()

    const candidateFiles = [
      paths.installedMods,
      joinPaths(paths.dataDir, 'installed-mods.json'),
    ]

    for (const filePath of candidateFiles) {
      try {
        const exists = await host.fs.exists(filePath)
        if (exists) {
          const raw = await host.fs.readTextFile(filePath)
          if (raw && raw.trim()) {
            const parsed = JSON.parse(raw)
            if (Array.isArray(parsed)) {
              for (const item of parsed as InstalledModRecord[]) {
                const key = String(item.id || item.modId || item.folderName || '')
                if (key && !recordsMap.has(key)) {
                  const engineNorm = normalizeEngineFields(item)

                  recordsMap.set(key, {
                    ...item,
                    title: item.title || item.name,
                    engineId: engineNorm.engineId,
                    engineName: engineNorm.engineName,
                    isExecutable: engineNorm.isExecutable,
                    defaultEngineId: engineNorm.defaultEngineId,
                    defaultEngineName: engineNorm.defaultEngineName,
                    icon: engineNorm.icon || item.icon,
                    installPath:
                      item.installPath ||
                      (item.folderName ? joinPaths(paths.modsDir, item.folderName) : ''),
                  })
                }
              }
            }
          }
        }
      } catch (err) {
        console.warn(`[WeekBox] Failed to read ${filePath}:`, err)
      }
    }

    try {
      const existsModsDir = await host.fs.exists(paths.modsDir)
      if (existsModsDir) {
        const modEntries = await host.fs.readDirectory(paths.modsDir)
        for (const entry of modEntries) {
          if (entry.isDirectory) {
            const modJsonPath = joinPaths(entry.path, 'mod.json')
            try {
              const hasModJson = await host.fs.exists(modJsonPath)
              if (hasModJson) {
                const rawMod = await host.fs.readTextFile(modJsonPath)
                if (rawMod && rawMod.trim()) {
                  const modData = JSON.parse(rawMod) as InstalledModRecord
                  const key = String(modData.id || modData.modId || entry.name)
                  if (!recordsMap.has(key)) {
                    const engineNorm = normalizeEngineFields(modData)

                    recordsMap.set(key, {
                      ...modData,
                      title: modData.title || modData.name || entry.name,
                      engineId: engineNorm.engineId,
                      engineName: engineNorm.engineName,
                      isExecutable: engineNorm.isExecutable,
                      defaultEngineId: engineNorm.defaultEngineId,
                      defaultEngineName: engineNorm.defaultEngineName,
                      icon: engineNorm.icon || modData.icon,
                      installPath: modData.installPath || entry.path,
                      folderName: modData.folderName || entry.name,
                    })
                  }
                }
              }
            } catch {
            }
          }
        }
      }
    } catch (e) {
      console.warn('[WeekBox] Error scanning mods directory:', e)
    }

    return Array.from(recordsMap.values())
  } catch (err) {
    console.warn('[WeekBox] Failed to read installed mods:', err)
    return []
  }
}

export async function getInstalledModById(
  modId: string | number | undefined | null,
): Promise<InstalledModRecord | null> {
  if (modId === undefined || modId === null) return null
  const list = await getInstalledMods()
  return list.find((item) => matchesModId(item, modId)) || null
}

async function writeInstalledMods(
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

export function saveInstalledMods(
  records: InstalledModRecord[],
): Promise<void> {
  return queueManifestMutation(() => writeInstalledMods(records))
}

async function writeInstalledMetadata(
  host: ReturnType<typeof initHost>,
  record: InstalledModRecord,
): Promise<void> {
  if (!record.installPath) return
  const dirExists = await host.fs.exists(record.installPath)
  if (!dirExists) await host.fs.createDirectory(record.installPath)
  if (record.downloadUrl) {
    const modUrlPath = joinPaths(record.installPath, 'mod_url.txt')
    await host.fs.writeTextFile(modUrlPath, record.downloadUrl)
  }
  const modJsonPath = joinPaths(record.installPath, 'mod.json')
  await host.fs.writeTextFile(modJsonPath, JSON.stringify(record, null, 2))
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

export async function registerInstalledMod(
  record: InstalledModRecord,
): Promise<InstalledModRecord> {
  return queueManifestMutation(async () => {
    const host = initHost()
    const currentList = await getInstalledMods()

    const baseId = extractBaseModId(record.id || record.modId || '')
    let remoteThumbnail =
      (record.thumbnail && record.thumbnail.startsWith('http')
        ? record.thumbnail
        : undefined) ||
      (record.image && record.image.startsWith('http')
        ? record.image
        : undefined)
    let previewMedia = record.previewMedia
    let description = record.description
    let htmlBody = record.htmlBody
    let author = record.author
    let userPfp = record.userPfp

    if (
      (!remoteThumbnail || !previewMedia || previewMedia.length === 0) &&
      baseId &&
      /^\d+$/.test(baseId)
    ) {
      try {
        const { getModById } = await import('@/services/gamebanana')
        const gbMod = await getModById(Number(baseId))
        if (gbMod) {
          if (!remoteThumbnail) {
            remoteThumbnail = gbMod.thumbnail || ''
          }
          if (!previewMedia || previewMedia.length === 0) {
            previewMedia = gbMod.previewMedia
          }
          if (!description) description = gbMod.description
          if (!htmlBody) htmlBody = gbMod.htmlBody
          if (!author || author === 'Unknown Creator' || author === 'Unknown Author') {
            author = gbMod.author
          }
          if (!userPfp) userPfp = gbMod.userPfp
        }
      } catch {
      }
    }

    const cachedCover = await cacheModCoverImage(
      record.id,
      remoteThumbnail,
    )

    const engineNorm = normalizeEngineFields({
      ...record,
      description: description ?? record.description,
      htmlBody: htmlBody ?? record.htmlBody,
    })

    const enrichedRecord: InstalledModRecord = {
      ...record,
      engineId: engineNorm.engineId,
      engineName: engineNorm.engineName,
      isExecutable: engineNorm.isExecutable,
      defaultEngineId: engineNorm.defaultEngineId,
      defaultEngineName: engineNorm.defaultEngineName,
      icon: engineNorm.icon || record.icon,
      modId: record.modId || baseId,
      source: record.source || 'gamebanana',
      sourceUrl:
        record.sourceUrl ||
        (baseId ? `https://gamebanana.com/mods/${baseId}` : undefined),
      thumbnail: remoteThumbnail || record.thumbnail,
      image: remoteThumbnail || record.image,
      previewMedia: previewMedia || record.previewMedia,
      description: description ?? record.description,
      htmlBody: htmlBody ?? record.htmlBody,
      author: author || record.author,
      userPfp: userPfp || record.userPfp,
      coverPath: cachedCover?.relativeCoverPath || record.coverPath,
      localCoverPath: cachedCover?.fullPath || record.localCoverPath,
    }

    const existingIdx = currentList.findIndex((item) =>
      matchesModId(item, record.id),
    )
    const nextList = [...currentList]
    if (existingIdx >= 0) {
      nextList[existingIdx] = {
        ...currentList[existingIdx],
        ...enrichedRecord,
      }
    } else {
      nextList.unshift(enrichedRecord)
    }

    await writeInstalledMetadata(host, enrichedRecord)
    await writeInstalledMods(nextList)
    return enrichedRecord
  })
}

export async function updateInstalledModMetadata(
  modId: string | number,
  updates: Partial<InstalledModRecord>,
): Promise<InstalledModRecord | null> {
  return queueManifestMutation(async () => {
    const host = initHost()
    const list = await getInstalledMods()
    const index = list.findIndex((item) => matchesModId(item, modId))

    if (index === -1) return null

    const updatedRecord: InstalledModRecord = {
      ...list[index],
      ...updates,
    }
    const nextList = [...list]
    nextList[index] = updatedRecord
    await writeInstalledMetadata(host, updatedRecord)
    await writeInstalledMods(nextList)
    return updatedRecord
  })
}

export async function uninstallModById(
  modId: string | number,
): Promise<boolean> {
  return queueManifestMutation(async () => {
    const host = initHost()
    const list = await getInstalledMods()
    const existing = list.find((item) => matchesModId(item, modId))
    const { paths } = await ensureWeekBoxLibrary()
    const baseId = extractBaseModId(modId)

  if (existing?.installPath) {
    try {
      const dirExists = await host.fs.exists(existing.installPath)
      if (dirExists) {
        await host.fs.remove(existing.installPath)
      }
    } catch (err) {
      console.warn('[WeekBox] Failed to remove mod directory on disk:', err)
    }
  }

  const candidateCovers: string[] = []
  if (existing?.coverPath) {
    candidateCovers.push(joinPaths(paths.root, 'data', existing.coverPath))
    candidateCovers.push(
      joinPaths(
        paths.modCoversDir,
        existing.coverPath.replace(/^mod-covers[/\\]/, ''),
      ),
    )
  }
  if (existing?.localCoverPath) {
    candidateCovers.push(existing.localCoverPath)
  }
  if (existing?.id) {
    candidateCovers.push(
      joinPaths(paths.modCoversDir, `${String(existing.id)}.webp`),
    )
  }
  candidateCovers.push(joinPaths(paths.modCoversDir, `${baseId}.webp`))
  candidateCovers.push(joinPaths(paths.modCoversDir, `mod_${baseId}.webp`))

  for (const coverPath of candidateCovers) {
    try {
      const exists = await host.fs.exists(coverPath)
      if (exists) {
        await host.fs.remove(coverPath)
      }
    } catch {
    }
  }

  try {
    const coverEntries = await host.fs.readDirectory(paths.modCoversDir)
    for (const entry of coverEntries) {
      const lower = entry.name.toLowerCase()
      if (
        lower.startsWith(`${baseId}.`) ||
        lower.startsWith(`${baseId}--`) ||
        lower.startsWith(`mod_${baseId}.`) ||
        (existing?.id &&
          lower.startsWith(String(existing.id).toLowerCase()))
      ) {
        try {
          await host.fs.remove(entry.path)
        } catch {
        }
      }
    }
  } catch {
  }

    const nextList = list.filter((item) => !matchesModId(item, modId))
    await writeInstalledMods(nextList)
    return true
  })
}

export async function getBookmarkedMods(): Promise<Array<string | number>> {
  const host = initHost()
  try {
    const { paths } = await ensureWeekBoxLibrary()
    const exists = await host.fs.exists(paths.bookmarks)
    if (!exists) return []
    const raw = await host.fs.readTextFile(paths.bookmarks)
    if (!raw || !raw.trim()) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export async function toggleModBookmark(
  modId: string | number,
): Promise<boolean> {
  const host = initHost()
  const { paths } = await ensureWeekBoxLibrary()
  const current = await getBookmarkedMods()
  const target = String(modId)
  const exists = current.some((id) => String(id) === target)

  const next = exists
    ? current.filter((id) => String(id) !== target)
    : [...current, modId]

  await host.fs.writeTextFile(paths.bookmarks, JSON.stringify(next, null, 2))
  emitEvent(BOOKMARKS_CHANGED_EVENT, next)
  return !exists
}

export function getFavoriteModIds(): Set<string> {
  try {
    if (typeof window === 'undefined') return new Set()
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return new Set(parsed.map((id) => String(id)))
    }
  } catch {
  }
  return new Set()
}

export function toggleModFavoriteId(modId: string | number): boolean {
  const current = getFavoriteModIds()
  const target = String(modId)
  const nextState = !current.has(target)
  if (nextState) {
    current.add(target)
  } else {
    current.delete(target)
  }
  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify([...current]))
  } catch {
  }
  emitEvent(FAVORITES_CHANGED_EVENT, [...current])
  return nextState
}
