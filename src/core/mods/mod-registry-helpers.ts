import { initHost, callDevFsBridge } from '@/core/host'
import { ensureWeekBoxLibrary, joinPaths } from '@/core/storage/weekbox-library'
import { extractBaseModId } from './mod-filesystem'
import { resolveOnDiskCover, safeCoverFileName } from './mod-v2-compat'
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

export interface NormalizedEngineMeta {
  engineId: string
  engineName: string
  categoryId: number
  icon: string
  isExecutable: boolean
}

export const ENGINE_META_BY_ID: Record<string, NormalizedEngineMeta> = {
  executable: {
    engineId: 'executable',
    engineName: 'Executable Mods',
    categoryId: 3827,
    icon: '/imgs/icons/categories/exe.png',
    isExecutable: true,
  },
  exe: {
    engineId: 'executable',
    engineName: 'Executable Mods',
    categoryId: 3827,
    icon: '/imgs/icons/categories/exe.png',
    isExecutable: true,
  },
  vslice: {
    engineId: 'vslice',
    engineName: 'V-Slice / Base Game',
    categoryId: 29202,
    icon: '/imgs/icons/categories/vslice.png',
    isExecutable: false,
  },
  psych: {
    engineId: 'psych',
    engineName: 'Psych Engine',
    categoryId: 28367,
    icon: '/imgs/icons/categories/psych.png',
    isExecutable: false,
  },
  codename: {
    engineId: 'codename',
    engineName: 'Codename Engine',
    categoryId: 34764,
    icon: '/imgs/icons/categories/codename.png',
    isExecutable: false,
  },
  pslice: {
    engineId: 'pslice',
    engineName: 'P-Slice Engine',
    categoryId: 43798,
    icon: '/imgs/icons/categories/pslice.png',
    isExecutable: false,
  },
  fpsplus: {
    engineId: 'fpsplus',
    engineName: 'FPS Plus',
    categoryId: 43850,
    icon: '/imgs/icons/categories/fpsplus.png',
    isExecutable: false,
  },
  psychonline: {
    engineId: 'psychonline',
    engineName: 'Psych Online',
    categoryId: 43788,
    icon: '/imgs/icons/categories/psychonline.png',
    isExecutable: false,
  },
}

const ENGINE_ALIAS_MAP: Record<string, string> = {
  'v-slice': 'vslice',
  base: 'vslice',
  basegame: 'vslice',
  'base game': 'vslice',
  'juego base': 'vslice',
  executable: 'executable',
  exe: 'executable',
}

export function normalizeEngineFields(item: Partial<InstalledModRecord>) {
  const rawEngineLower = String(item.engineId || '').trim().toLowerCase()
  const mappedEngineKey = ENGINE_ALIAS_MAP[rawEngineLower] || rawEngineLower

  const isExe = Boolean(
    item.isExecutable ||
      mappedEngineKey === 'executable',
  )

  if (isExe) {
    const exeMeta = ENGINE_META_BY_ID.executable
    return {
      engineId: exeMeta.engineId,
      engineName: exeMeta.engineName,
      categoryId: exeMeta.categoryId,
      categoryName: exeMeta.engineName,
      isExecutable: true,
      defaultEngineId: item.defaultEngineId,
      defaultEngineName: item.defaultEngineName,
      icon: exeMeta.icon,
    }
  }

  const knownMeta =
    mappedEngineKey && mappedEngineKey !== 'unknown'
      ? ENGINE_META_BY_ID[mappedEngineKey]
      : undefined

  if (knownMeta) {
    return {
      engineId: knownMeta.engineId,
      engineName: item.engineName || knownMeta.engineName,
      categoryId: knownMeta.categoryId,
      categoryName: knownMeta.engineName,
      isExecutable: knownMeta.isExecutable,
      defaultEngineId: item.defaultEngineId,
      defaultEngineName: item.defaultEngineName,
      icon: knownMeta.icon,
    }
  }

  const catStr = `${item.categoryName || ''} ${item.engineName || ''} ${item.defaultEngineName || ''}`.toLowerCase()
  const isBaseGame =
    item.categoryId === 43777 ||
    item.categoryId === 29202 ||
    catStr.includes('v-slice') ||
    catStr.includes('vslice') ||
    catStr.includes('base game') ||
    catStr.includes('basegame') ||
    catStr.includes('juego base') ||
    catStr.includes('(base)')

  const fallbackMeta = isBaseGame ? ENGINE_META_BY_ID.vslice : undefined
  return {
    engineId: fallbackMeta?.engineId || item.engineId,
    engineName: fallbackMeta?.engineName || item.engineName || 'Default Engine',
    categoryId: fallbackMeta?.categoryId ?? item.categoryId,
    categoryName: fallbackMeta?.engineName || item.categoryName,
    isExecutable: false,
    defaultEngineId: fallbackMeta ? 'vslice' : item.defaultEngineId,
    defaultEngineName: fallbackMeta
      ? 'V-Slice / Base Game'
      : item.defaultEngineName,
    icon: fallbackMeta?.icon || item.icon,
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

export const INSTALLED_MODS_STORAGE_KEY = 'wbr:installed_mods'
export const MOD_CATEGORIES_STORAGE_KEY = 'wbr:mod_categories'

export function syncInstalledModsToLocalStorage(
  records: InstalledModRecord[],
): void {
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    window.localStorage.setItem(
      INSTALLED_MODS_STORAGE_KEY,
      JSON.stringify(records),
    )
    const categoryMap: Record<
      string,
      {
        categoryId?: number
        engineId?: string
        engineName?: string
        isExecutable?: boolean
        icon?: string
        hasEngineWarning?: boolean
        engineWarningMessage?: string
      }
    > = {}
    for (const rec of records) {
      const baseId = extractBaseModId(rec.id || rec.modId || '')
      const keys = [String(rec.id || ''), baseId].filter(Boolean)
      const entry = {
        categoryId: rec.categoryId,
        engineId: rec.engineId,
        engineName: rec.engineName,
        isExecutable: rec.isExecutable,
        icon: rec.icon,
        hasEngineWarning: rec.hasEngineWarning,
        engineWarningMessage: rec.engineWarningMessage,
      }
      for (const key of keys) {
        categoryMap[key] = entry
      }
    }
    window.localStorage.setItem(
      MOD_CATEGORIES_STORAGE_KEY,
      JSON.stringify(categoryMap),
    )
  } catch (err) {
    console.warn(
      '[WeekBox] Failed to sync installed mods to localStorage:',
      err,
    )
  }
}

export function getCachedInstalledModsFromLocalStorage(): InstalledModRecord[] {
  if (typeof window === 'undefined' || !window.localStorage) return []
  try {
    const raw = window.localStorage.getItem(INSTALLED_MODS_STORAGE_KEY)
    if (!raw || !raw.trim()) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as InstalledModRecord[]) : []
  } catch {
    return []
  }
}

export async function writeInstalledMods(
  records: InstalledModRecord[],
  options: { emit?: boolean; localStorageOnly?: boolean } = {},
): Promise<void> {
  const normalizedRecords = records.map((rec) => {
    const isHidden = rec.hidden !== undefined ? Boolean(rec.hidden) : rec.visible === false
    const cleanName = rec.name || rec.title || rec.folderName || 'Unnamed Mod'
    return {
      ...rec,
      name: cleanName,
      title: rec.title || cleanName,
      hidden: isHidden,
      visible: !isHidden,
      engineFolderName: rec.engineFolderName || rec.folderName,
    }
  })

  syncInstalledModsToLocalStorage(normalizedRecords)

  if (!options.localStorageOnly) {
    const host = initHost()
    const { paths } = await ensureWeekBoxLibrary()
    const targetFiles = Array.from(
      new Set([paths.installedMods, paths.legacyInstalledMods]),
    )
    const payload = JSON.stringify(normalizedRecords, null, 2)

    for (const targetFile of targetFiles) {
      try {
        const tempPath = `${targetFile}.tmp`
        await host.fs.writeTextFile(tempPath, payload)
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
  }

  if (options.emit !== false) {
    emitEvent(MODS_CHANGED_EVENT, normalizedRecords)
  }
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

async function cacheRemoteImageFile(
  downloadUrl: string,
  fullPath: string,
): Promise<boolean> {
  if (!downloadUrl || !downloadUrl.startsWith('http')) return false
  const host = initHost()

  try {
    if (await host.fs.exists(fullPath)) {
      return true
    }
  } catch {
  }

  try {
    const bridgeRes = await callDevFsBridge<{ ok?: boolean }>({
      action: 'cacheCover',
      url: downloadUrl,
      imageUrl: downloadUrl,
      destPath: fullPath,
    })
    if (bridgeRes?.ok) return true
  } catch {
  }

  if (host.platform === 'desktop') {
    try {
      await host.downloadFile({
        url: downloadUrl,
        destinationPath: fullPath,
      })
      return true
    } catch {
    }
  }

  return false
}

function resolveImageExtension(url: string, fallback = 'webp'): string {
  try {
    const pathname = new URL(url).pathname.toLowerCase()
    const match = pathname.match(/\.(webp|png|jpg|jpeg|gif|avif)$/)
    if (match) return match[1] === 'jpeg' ? 'jpg' : match[1]
  } catch {
  }
  return fallback
}

function hashAvatarUrl(url: string): string {
  let hash = 2166136261
  for (let i = 0; i < url.length; i += 1) {
    hash ^= url.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36)
}

export async function cacheModCoverImage(
  compositeId: string | number,
  imageUrl?: string,
): Promise<{ fullPath: string; relativeCoverPath: string } | undefined> {
  try {
    const { paths } = await ensureWeekBoxLibrary()
    const existing = await resolveOnDiskCover(initHost(), paths, [compositeId])
    if (existing.coverPath && existing.localCoverPath) {
      return {
        fullPath: existing.localCoverPath,
        relativeCoverPath: existing.coverPath,
      }
    }

    const fileName = `${safeCoverFileName(compositeId)}.webp`
    const fullPath = joinPaths(paths.modCoversDir, fileName)
    const relativeCoverPath = `mod-covers/${fileName}`

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

    if (downloadUrl && downloadUrl.startsWith('http')) {
      await cacheRemoteImageFile(downloadUrl, fullPath)
    }

    return { fullPath, relativeCoverPath }
  } catch {
  }
  return undefined
}

export async function cacheModAvatars(
  compositeId: string | number,
  record: Partial<InstalledModRecord>,
): Promise<{
  userPfpPath?: string
  localUserPfp?: string
  credits?: InstalledModRecord['credits']
  authors?: InstalledModRecord['authors']
}> {
  try {
    const { paths } = await ensureWeekBoxLibrary()
    const baseId = extractBaseModId(compositeId)
    const urlToLocal = new Map<
      string,
      { avatarPath: string; localAvatarPath: string }
    >()

    let userPfpPath = record.userPfpPath
    let localUserPfp = record.localUserPfp

    if (record.userPfp && record.userPfp.startsWith('http')) {
      const ext = resolveImageExtension(record.userPfp, 'jpg')
      const fileName = `${baseId}--submitter.${ext}`
      const fullPath = joinPaths(paths.modAvatarsDir, fileName)
      const relPath = `mod-avatars/${fileName}`
      const ok = await cacheRemoteImageFile(record.userPfp, fullPath)
      if (ok) {
        userPfpPath = relPath
        localUserPfp = fullPath
      }
    }

    const remoteCreditUrls = new Set<string>()
    for (const group of record.credits || []) {
      for (const member of group.authors || []) {
        if (member.avatarUrl && member.avatarUrl.startsWith('http')) {
          remoteCreditUrls.add(member.avatarUrl)
        }
      }
    }
    for (const author of record.authors || []) {
      if (author.avatarUrl && author.avatarUrl.startsWith('http')) {
        remoteCreditUrls.add(author.avatarUrl)
      }
    }

    const urlList = Array.from(remoteCreditUrls)
    const AVATAR_BATCH_SIZE = 4
    for (let i = 0; i < urlList.length; i += AVATAR_BATCH_SIZE) {
      const batch = urlList.slice(i, i + AVATAR_BATCH_SIZE)
      await Promise.all(
        batch.map(async (url) => {
          const ext = resolveImageExtension(url, 'jpg')
          const fileName = `${baseId}--credit-${hashAvatarUrl(url)}.${ext}`
          const fullPath = joinPaths(paths.modAvatarsDir, fileName)
          const relPath = `mod-avatars/${fileName}`
          const ok = await cacheRemoteImageFile(url, fullPath)
          if (ok) {
            urlToLocal.set(url, {
              avatarPath: relPath,
              localAvatarPath: fullPath,
            })
          }
        }),
      )
    }

    const patchAuthor = <
      T extends {
        avatarUrl?: string
        avatarPath?: string
        localAvatarPath?: string
      },
    >(
      author: T,
    ): T => {
      const cached =
        author.avatarUrl ? urlToLocal.get(author.avatarUrl) : undefined
      if (!cached) return author
      return {
        ...author,
        avatarPath: cached.avatarPath,
        localAvatarPath: cached.localAvatarPath,
      }
    }

    const nextCredits = record.credits
      ? record.credits.map((group) => ({
          ...group,
          authors: (group.authors || []).map(patchAuthor),
        }))
      : undefined

    const nextAuthors = record.authors
      ? record.authors.map(patchAuthor)
      : undefined

    return {
      userPfpPath,
      localUserPfp,
      credits: nextCredits,
      authors: nextAuthors,
    }
  } catch {
  }
  return {
    userPfpPath: record.userPfpPath,
    localUserPfp: record.localUserPfp,
    credits: record.credits,
    authors: record.authors,
  }
}
