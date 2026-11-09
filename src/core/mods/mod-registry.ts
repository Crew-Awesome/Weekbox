import { initHost } from '@/core/host'
import { ensureWeekBoxLibrary, joinPaths } from '@/core/storage'
import { extractBaseModId } from './mod-filesystem'
import {
  MODS_CHANGED_EVENT,
  BOOKMARKS_CHANGED_EVENT,
  FAVORITES_CHANGED_EVENT,
  queueManifestMutation,
  normalizeEngineFields,
  matchesModId,
  writeInstalledMods,
  writeInstalledMetadata,
  cacheModCoverImage,
} from './mod-registry-helpers'
import {
  getInstalledMods,
  getInstalledModById,
  saveInstalledMods,
} from './mod-registry-scanner'
import {
  getBookmarkedMods,
  toggleModBookmark,
  getFavoriteModIds,
  toggleModFavoriteId,
} from './mod-bookmarks-favorites'
import type { InstalledModRecord } from './types'

export {
  MODS_CHANGED_EVENT,
  BOOKMARKS_CHANGED_EVENT,
  FAVORITES_CHANGED_EVENT,
  normalizeEngineFields,
  matchesModId,
  cacheModCoverImage,
  getInstalledMods,
  getInstalledModById,
  saveInstalledMods,
  getBookmarkedMods,
  toggleModBookmark,
  getFavoriteModIds,
  toggleModFavoriteId,
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
      hasEngineWarning: record.hasEngineWarning,
      engineWarningMessage: record.engineWarningMessage,
      meta: {
        ...record.meta,
        link: record.downloadUrl || record.meta?.link,
        downloadUrl: record.downloadUrl || record.meta?.link,
        sourceUrl:
          record.sourceUrl ||
          (baseId ? `https://gamebanana.com/mods/${baseId}` : undefined),
      },
      modId: record.modId || baseId,
      source: record.source || 'gamebanana',
      sourceUrl:
        record.sourceUrl ||
        (baseId ? `https://gamebanana.com/mods/${baseId}` : undefined),
      downloadUrl: record.downloadUrl || record.meta?.link,
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

export async function toggleModVisibility(
  modId: string | number,
): Promise<InstalledModRecord | null> {
  const mod = await getInstalledModById(modId)
  if (!mod) return null
  const currentVisible = mod.visible !== false && !mod.hidden
  const nextVisible = !currentVisible
  return updateInstalledModMetadata(modId, {
    visible: nextVisible,
    hidden: !nextVisible,
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
