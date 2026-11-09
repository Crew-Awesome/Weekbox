import { useState, useEffect } from 'react'
import {
  matchesModId,
  registerInstalledMod,
  extractBaseModId,
  uninstallModById,
  type InstalledModRecord,
} from '@/core/mods'
import { openFolderInExplorer, resolveModInstallDirectory } from '@/core/mods/mod-filesystem'
import { ensureWeekBoxLibrary } from '@/core/storage/weekbox-library'
import { getModById, ENGINE_CATEGORIES } from '@/services/gamebanana'
import type { LibraryEngineSummary, LibraryStats } from '../types'

export function useOnlineModEnrichment(
  isOnline: boolean,
  mods: InstalledModRecord[],
  favoriteIds: Set<string>,
  bookmarkIds: Set<string>,
): InstalledModRecord[] {
  const [onlineSavedMods, setOnlineSavedMods] = useState<InstalledModRecord[]>([])

  useEffect(() => {
    if (!isOnline) {
      setOnlineSavedMods([])
      return
    }

    let isMounted = true

    const loadOnlineSaved = async () => {
      const savedList = Array.from(new Set([...favoriteIds, ...bookmarkIds]))
      const missingIds = savedList.filter((favId) => {
        return !mods.some((m) => matchesModId(m, favId))
      })

      if (missingIds.length === 0) {
        if (isMounted) setOnlineSavedMods([])
        return
      }

      const fetchedList: InstalledModRecord[] = []
      for (const rawId of missingIds) {
        const numId = Number(rawId)
        if (Number.isNaN(numId) || numId <= 0) continue

        try {
          const gbMod = await getModById(numId)
          if (!gbMod || !isMounted) continue
          const engineCategory = Object.values(ENGINE_CATEGORIES).find(
            (c) => c.id === gbMod.engineId,
          )

          fetchedList.push({
            id: gbMod.id,
            modId: gbMod.id,
            name: gbMod.title,
            title: gbMod.title,
            description: gbMod.description,
            htmlBody: gbMod.htmlBody,
            author: gbMod.author,
            userPfp: gbMod.userPfp,
            image: gbMod.thumbnail,
            thumbnail: gbMod.thumbnail,
            previewMedia: gbMod.previewMedia,
            icon: gbMod.engineIcon || engineCategory?.icon,
            engineId: gbMod.engineId,
            engineName: engineCategory?.name || 'Default Engine',
            installPath: '',
            folderName: '',
            fileSize: 0,
            submittedAt: gbMod.submittedAt,
            updatedAt: gbMod.updatedAt,
            views: gbMod.views,
            likes: gbMod.likes,
            downloads: gbMod.downloads,
          })
        } catch {
        }
      }

      if (isMounted) {
        setOnlineSavedMods(fetchedList)
      }
    }

    void loadOnlineSaved()

    return () => {
      isMounted = false
    }
  }, [isOnline, favoriteIds, bookmarkIds, mods])

  useEffect(() => {
    if (!isOnline || mods.length === 0) return

    let isMounted = true

    const enrichIncompleteMods = async () => {
      for (const mod of mods) {
        if (!isMounted) break
        const hasRemoteThumb =
          mod.thumbnail?.startsWith('http') || mod.image?.startsWith('http')
        const hasPreviews =
          Array.isArray(mod.previewMedia) && mod.previewMedia.length > 0

        if (hasRemoteThumb && hasPreviews && mod.description) continue

        const baseId = extractBaseModId(mod.id || mod.modId || '')
        if (!/^\d+$/.test(baseId)) continue

        try {
          const gbMod = await getModById(Number(baseId))
          if (!gbMod || !isMounted) continue

          const remoteThumb = gbMod.thumbnail || ''
          const isBase =
            gbMod.categoryId === 43777 ||
            gbMod.categoryId === 29202 ||
            gbMod.engineId === 'vslice' ||
            (gbMod.categoryName || '').toLowerCase().includes('base')
          const resolvedEngineId = isBase ? 'vslice' : (gbMod.engineId || mod.engineId)
          const resolvedEngineName = isBase
            ? 'V-Slice / Base Game'
            : (gbMod.engineName || mod.engineName || 'Default Engine')
          const resolvedIcon = isBase
            ? '/imgs/icons/categories/vslice.png'
            : (gbMod.engineIcon || mod.icon)

          const updated: InstalledModRecord = {
            ...mod,
            categoryId: mod.categoryId || gbMod.categoryId,
            categoryName: mod.categoryName || gbMod.categoryName,
            engineId: mod.isExecutable ? 'executable' : resolvedEngineId,
            engineName: mod.isExecutable ? 'Executable' : resolvedEngineName,
            defaultEngineId: isBase ? 'vslice' : mod.defaultEngineId,
            defaultEngineName: isBase ? 'V-Slice / Base Game' : mod.defaultEngineName,
            icon: resolvedIcon,
            modId: mod.modId || gbMod.id,
            source: mod.source || 'gamebanana',
            sourceUrl:
              mod.sourceUrl || `https://gamebanana.com/mods/${gbMod.id}`,
            thumbnail: remoteThumb || mod.thumbnail,
            image: remoteThumb || mod.image,
            previewMedia:
              gbMod.previewMedia && gbMod.previewMedia.length > 0
                ? gbMod.previewMedia
                : mod.previewMedia,
            description: mod.description || gbMod.description,
            htmlBody: mod.htmlBody || gbMod.htmlBody,
            author:
              !mod.author ||
              mod.author === 'Unknown Creator' ||
              mod.author === 'Unknown Author'
                ? gbMod.author
                : mod.author,
            userPfp: mod.userPfp || gbMod.userPfp,
            likes: mod.likes || gbMod.likes,
            views: mod.views || gbMod.views,
            downloads: mod.downloads || gbMod.downloads,
            submittedAt: mod.submittedAt || gbMod.submittedAt,
            updatedAt: mod.updatedAt || gbMod.updatedAt,
          }

          await registerInstalledMod(updated)
        } catch {
        }
      }
    }

    void enrichIncompleteMods()

    return () => {
      isMounted = false
    }
  }, [isOnline, mods])

  return onlineSavedMods
}

export function computeLibraryStats(
  mods: InstalledModRecord[],
  favoriteIds: Set<string>,
  bookmarkIds: Set<string>,
): LibraryStats {
  let totalSizeBytes = 0
  for (const mod of mods) {
    if (typeof mod.fileSize === 'number' && mod.fileSize > 0) {
      totalSizeBytes += mod.fileSize
    }
  }
  return {
    totalMods: mods.length,
    totalSizeBytes,
    favoritesCount: favoriteIds.size,
    bookmarksCount: bookmarkIds.size,
  }
}

export function computeEngineSummaries(
  allMods: InstalledModRecord[],
): LibraryEngineSummary[] {
  const map = new Map<string, { name: string; icon?: string; count: number }>()
  for (const mod of allMods) {
    const rawId = (mod.engineId || mod.engineName || 'vslice').toLowerCase()
    const isVSlice =
      rawId === 'vslice' ||
      rawId === 'v-slice' ||
      rawId === 'base' ||
      rawId === 'basegame' ||
      rawId.includes('v-slice') ||
      rawId.includes('base') ||
      mod.categoryId === 43777 ||
      mod.categoryId === 29202

    const id = isVSlice ? 'vslice' : rawId
    const name = isVSlice
      ? 'V-Slice / Base Game'
      : (mod.engineName || (id === 'executable' ? 'Executable' : 'Default Engine'))
    const icon = isVSlice ? '/imgs/icons/categories/vslice.png' : mod.icon

    const existing = map.get(id)
    if (existing) {
      existing.count += 1
      if (!existing.icon && icon) existing.icon = icon
    } else {
      map.set(id, { name, icon, count: 1 })
    }
  }
  return Array.from(map.entries()).map(([id, info]) => ({
    id,
    name: info.name,
    icon: info.icon,
    count: info.count,
  }))
}

export async function openModFolderAction(record: InstalledModRecord) {
  try {
    let folderPath = record.installPath
    if (!folderPath) {
      const resolved = await resolveModInstallDirectory(
        record.id,
        record.title || record.name,
      )
      folderPath = resolved.modInstallDir
    }
    const opened = await openFolderInExplorer(folderPath)
    if (!opened && typeof window !== 'undefined' && window.callout) {
      window.callout.surface(`Directory: ${folderPath}`, 'Mod Directory Location', { duration: 4500 })
    }
  } catch (err) {
    console.error('[WeekBox] Failed to open folder:', err)
    window.callout?.error('Could not open mod directory on disk.', 'Folder Error')
  }
}

export async function openAllModsFolderAction() {
  try {
    const { paths } = await ensureWeekBoxLibrary()
    const opened = await openFolderInExplorer(paths.modsDir)
    if (!opened && typeof window !== 'undefined' && window.callout) {
      window.callout.surface(`Mods directory: ${paths.modsDir}`, 'Library Location', { duration: 4500 })
    }
  } catch (err) {
    console.error('[WeekBox] Failed to open mods directory:', err)
    window.callout?.error('Could not open library folder.', 'Storage Error')
  }
}

export async function uninstallModAction(record: InstalledModRecord) {
  try {
    const success = await uninstallModById(record.id)
    if (success) {
      window.callout?.secondary(
        `"${record.title || record.name}" was uninstalled from your library.`,
        'Mod Uninstalled',
        { duration: 3500 },
      )
    }
  } catch (err) {
    console.error('[WeekBox] Failed to uninstall mod:', err)
    window.callout?.error(
      err instanceof Error ? err.message : 'Failed to uninstall mod.',
      'Uninstall Error',
    )
  }
}
