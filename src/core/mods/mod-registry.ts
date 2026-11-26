import { initHost } from '@/core/host'
import { ensureWeekBoxLibrary, joinPaths } from '@/core/storage/weekbox-library'
import { extractBaseModId, detectModEngineFromFiles } from './mod-filesystem'
import {
  MODS_CHANGED_EVENT,
  BOOKMARKS_CHANGED_EVENT,
  FAVORITES_CHANGED_EVENT,
  INSTALLED_MODS_STORAGE_KEY,
  MOD_CATEGORIES_STORAGE_KEY,
  queueManifestMutation,
  normalizeEngineFields,
  matchesModId,
  writeInstalledMods,
  writeInstalledMetadata,
  cacheModCoverImage,
  cacheModAvatars,
  syncInstalledModsToLocalStorage,
  getCachedInstalledModsFromLocalStorage,
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
  INSTALLED_MODS_STORAGE_KEY,
  MOD_CATEGORIES_STORAGE_KEY,
  normalizeEngineFields,
  matchesModId,
  cacheModCoverImage,
  syncInstalledModsToLocalStorage,
  getCachedInstalledModsFromLocalStorage,
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
    const currentList = await getInstalledMods({ persistChanges: false })

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
    let credits = record.credits
    let authors = record.authors

    if (
      (!remoteThumbnail ||
        !previewMedia ||
        previewMedia.length === 0 ||
        !userPfp ||
        !credits ||
        credits.length === 0) &&
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
          if (!credits || credits.length === 0) credits = gbMod.credits
          if (!authors || authors.length === 0) {
            authors = gbMod.authors?.map((name) => ({ name }))
          }
        }
      } catch {
      }
    }

    const [cachedCover, cachedAvatars] = await Promise.all([
      cacheModCoverImage(record.id, remoteThumbnail),
      cacheModAvatars(record.id, {
        ...record,
        userPfp,
        credits,
        authors,
      }),
    ])

    let detectedFromDisk:
      | Awaited<ReturnType<typeof detectModEngineFromFiles>>
      | undefined
    if (record.installPath && !record.engineLocked) {
      try {
        if (await host.fs.exists(record.installPath)) {
          detectedFromDisk = await detectModEngineFromFiles(
            record.installPath,
            record.engineId || record.defaultEngineId,
          )
        }
      } catch {
      }
    }

    const effectiveIsExe =
      detectedFromDisk?.isExecutable ||
      detectedFromDisk?.engineId === 'executable' ||
      detectedFromDisk?.engineId === 'exe'

    const engineNorm = normalizeEngineFields({
      ...record,
      ...(detectedFromDisk
        ? {
            engineId: effectiveIsExe ? 'executable' : detectedFromDisk.engineId,
            isExecutable: effectiveIsExe,
            hasEngineWarning: detectedFromDisk.hasEngineWarning,
            engineWarningMessage: detectedFromDisk.engineWarningMessage,
          }
        : {}),
      description: description ?? record.description,
      htmlBody: htmlBody ?? record.htmlBody,
    })

    const enrichedRecord: InstalledModRecord = {
      ...record,
      categoryId: engineNorm.categoryId ?? record.categoryId,
      categoryName: engineNorm.isExecutable
        ? 'Executable Mods'
        : (engineNorm.categoryName ?? record.categoryName),
      engineId: engineNorm.engineId,
      engineName: engineNorm.engineName,
      isExecutable: engineNorm.isExecutable,
      defaultEngineId: engineNorm.defaultEngineId,
      defaultEngineName: engineNorm.defaultEngineName,
      icon: engineNorm.icon || record.icon,
      hasEngineWarning:
        detectedFromDisk !== undefined
          ? detectedFromDisk.hasEngineWarning
          : record.hasEngineWarning,
      engineWarningMessage:
        detectedFromDisk !== undefined
          ? detectedFromDisk.engineWarningMessage
          : record.engineWarningMessage,
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
      userPfpPath: cachedAvatars.userPfpPath || record.userPfpPath,
      localUserPfp: cachedAvatars.localUserPfp || record.localUserPfp,
      authors: cachedAvatars.authors || authors || record.authors,
      credits: cachedAvatars.credits || credits || record.credits,
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
    const list = await getInstalledMods({ persistChanges: false })
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
    const list = await getInstalledMods({ persistChanges: false })
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

    const cleanupPrefixFiles = async (dirPath: string) => {
      try {
        const entries = await host.fs.readDirectory(dirPath)
        for (const entry of entries) {
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
    }

    await Promise.all([
      cleanupPrefixFiles(paths.modCoversDir),
      cleanupPrefixFiles(paths.modAvatarsDir),
    ])

    const nextList = list.filter((item) => !matchesModId(item, modId))
    await writeInstalledMods(nextList)
    return true
  })
}
