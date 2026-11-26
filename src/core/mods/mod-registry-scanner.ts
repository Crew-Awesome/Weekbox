import { initHost, type HostDirectoryEntry } from '@/core/host'
import {
  ensureWeekBoxLibrary,
  type WeekBoxLibraryPaths,
} from '@/core/storage/weekbox-library'
import {
  detectModEngineFromFiles,
  extractBaseModId,
  UNDETECTED_ENGINE_WARNING_MSG,
} from './mod-filesystem'
import {
  ENGINE_META_BY_ID,
  normalizeEngineFields,
  matchesModId,
  queueManifestMutation,
  writeInstalledMods,
} from './mod-registry-helpers'
import {
  discoverUnregisteredModDirectory,
  getModRecordMatchKeys,
  mergeModRecords,
  normalizeV2ModRecord,
  resolveDiskModPath,
  resolveOnDiskCover,
  resolveOnDiskSubmitterAvatar,
} from './mod-v2-compat'
import type { InstalledModRecord } from './types'

const FS_BATCH_SIZE = 8
let inFlightInstalledMods: Promise<InstalledModRecord[]> | null = null

async function resolveModRecord(
  rawItem: InstalledModRecord,
  paths: WeekBoxLibraryPaths,
  diskDirsByLower: Map<string, HostDirectoryEntry>,
  coversByLower: Map<string, HostDirectoryEntry>,
  avatarsByLower: Map<string, HostDirectoryEntry>,
  host: ReturnType<typeof initHost>,
  skipDiskEngineDetection = false,
): Promise<InstalledModRecord> {
  const item = normalizeV2ModRecord(rawItem)
  const engineNorm = normalizeEngineFields(item)
  let warning = item.hasEngineWarning
  let warningMsg = item.engineWarningMessage
  let resolvedEngineId = engineNorm.engineId
  let resolvedEngineName = engineNorm.engineName
  let resolvedCategoryId = engineNorm.categoryId
  let resolvedIsExe = engineNorm.isExecutable
  let resolvedIcon = engineNorm.icon || item.icon

  const diskLoc = await resolveDiskModPath(
    host,
    item,
    paths.modsDir,
    diskDirsByLower,
  )
  const installPath = diskLoc.installPath
  const folderName = diskLoc.folderName || item.folderName

  const isExeOrUnknown =
    resolvedIsExe ||
    resolvedEngineId === 'executable' ||
    resolvedEngineId === 'exe' ||
    resolvedEngineId === 'unknown'

  if (!skipDiskEngineDetection && installPath && !item.engineLocked) {
    try {
      const dirExists = diskDirsByLower.has(folderName.toLowerCase()) || (await host.fs.exists(installPath))
      if (dirExists) {
        const fallbackId =
          resolvedEngineId || item.defaultEngineId || 'executable'
        const detected = await detectModEngineFromFiles(installPath, fallbackId)
        const detectedMeta =
          ENGINE_META_BY_ID[detected.engineId.toLowerCase()]
        resolvedEngineId = detectedMeta?.engineId || detected.engineId
        resolvedEngineName =
          detectedMeta?.engineName || engineNorm.engineName
        resolvedCategoryId =
          detectedMeta?.categoryId ?? resolvedCategoryId
        resolvedIsExe = detected.isExecutable
        resolvedIcon = detectedMeta?.icon || resolvedIcon
        warning = detected.hasEngineWarning
        warningMsg = detected.engineWarningMessage
      } else if (isExeOrUnknown) {
        warning = true
        warningMsg = UNDETECTED_ENGINE_WARNING_MSG
      }
    } catch {
    }
  } else if (!installPath && isExeOrUnknown) {
    warning = true
    warningMsg = warningMsg || UNDETECTED_ENGINE_WARNING_MSG
  }

  let coverPath = item.coverPath
  let localCoverPath = item.localCoverPath
  if (!coverPath || !localCoverPath) {
    const recoveredCover = await resolveOnDiskCover(
      host,
      paths,
      [item.id, item.modId, folderName],
      coversByLower,
    )
    coverPath = coverPath || recoveredCover.coverPath
    localCoverPath = localCoverPath || recoveredCover.localCoverPath
  }

  let userPfpPath = item.userPfpPath
  let localUserPfp = item.localUserPfp
  if (!userPfpPath || !localUserPfp) {
    const baseId = extractBaseModId(item.modId || item.id || '')
    const recoveredAvatar = await resolveOnDiskSubmitterAvatar(
      host,
      paths,
      /^\d+$/.test(baseId) ? baseId : null,
      avatarsByLower,
    )
    userPfpPath = userPfpPath || recoveredAvatar.userPfpPath
    localUserPfp = localUserPfp || recoveredAvatar.localUserPfp
  }

  return {
    ...item,
    name: item.name || item.title || folderName || 'Unnamed Mod',
    title: item.title || item.name || folderName || 'Unnamed Mod',
    categoryId: resolvedCategoryId,
    categoryName: resolvedIsExe
      ? 'Executable Mods'
      : resolvedEngineName && resolvedEngineName !== 'Default Engine'
        ? resolvedEngineName
        : item.categoryName,
    engineId: resolvedEngineId,
    engineName: resolvedEngineName,
    isExecutable: resolvedIsExe,
    defaultEngineId: engineNorm.defaultEngineId,
    defaultEngineName: engineNorm.defaultEngineName,
    icon: resolvedIcon,
    hasEngineWarning: warning,
    engineWarningMessage: warningMsg,
    coverPath,
    localCoverPath,
    userPfpPath,
    localUserPfp,
    meta: {
      ...item.meta,
      link: item.downloadUrl || item.meta?.link,
      downloadUrl: item.downloadUrl || item.meta?.link,
    },
    folderName,
    installPath,
  }
}

function hasRecordMetadataDrift(
  raw: InstalledModRecord,
  resolved: InstalledModRecord,
): boolean {
  return (
    (raw.engineId || '') !== (resolved.engineId || '') ||
    (raw.engineName || '') !== (resolved.engineName || '') ||
    raw.categoryId !== resolved.categoryId ||
    (raw.categoryName || '') !== (resolved.categoryName || '') ||
    Boolean(raw.isExecutable) !== Boolean(resolved.isExecutable) ||
    (raw.icon || '') !== (resolved.icon || '') ||
    Boolean(raw.hasEngineWarning) !== Boolean(resolved.hasEngineWarning) ||
    (raw.installPath || '') !== (resolved.installPath || '') ||
    (raw.folderName || '') !== (resolved.folderName || '') ||
    (raw.coverPath || '') !== (resolved.coverPath || '')
  )
}

async function scanInstalledModsInternal(
  persistChanges = true,
): Promise<InstalledModRecord[]> {
  const host = initHost()
  try {
    const { paths } = await ensureWeekBoxLibrary()
    const recordsMap = new Map<string, InstalledModRecord>()
    const updatedRecordsByKey = new Map<string, InstalledModRecord>()

    // WeekBox v2 stores `data/installed-mods.json`; legacy/rew used `data/installedmods.json`.
    const candidateFiles = Array.from(
      new Set([paths.installedMods, paths.legacyInstalledMods]),
    )

    const readDirMap = async (dirPath: string): Promise<Map<string, HostDirectoryEntry>> => {
      const map = new Map<string, HostDirectoryEntry>()
      try {
        const entries = await host.fs.readDirectory(dirPath)
        for (const e of entries) {
          if (!e.isDirectory) map.set(e.name.toLowerCase(), e)
        }
      } catch {
      }
      return map
    }

    const [candidatePayloads, rawModEntries, coversByLower, avatarsByLower] =
      await Promise.all([
        Promise.all(
          candidateFiles.map(async (filePath) => {
            try {
              const raw = await host.fs.readTextFile(filePath)
              if (!raw || !raw.trim()) return []
              const parsed = JSON.parse(raw)
              return Array.isArray(parsed) ? (parsed as InstalledModRecord[]) : []
            } catch {
              return []
            }
          }),
        ),
        (async () => {
          try {
            return (await host.fs.readDirectory(paths.modsDir)).filter(
              (entry) => entry.isDirectory && !entry.name.startsWith('.'),
            )
          } catch {
            return []
          }
        })(),
        readDirMap(paths.modCoversDir),
        readDirMap(paths.modAvatarsDir),
      ])

    const diskDirsByLower = new Map<string, HostDirectoryEntry>()
    for (const entry of rawModEntries) {
      diskDirsByLower.set(entry.name.toLowerCase(), entry)
    }

    const mergedByCanonicalKey = new Map<
      string,
      { raw: InstalledModRecord; merged: InstalledModRecord }
    >()
    const seenLookup = new Map<string, string>()

    for (const list of candidatePayloads) {
      for (const rawItem of list) {
        const normalized = normalizeV2ModRecord(rawItem)
        const matchKeys = getModRecordMatchKeys(normalized)
        if (matchKeys.length === 0) continue

        let canonicalKey: string | undefined
        for (const k of matchKeys) {
          const hit = seenLookup.get(k)
          if (hit) {
            canonicalKey = hit
            break
          }
        }

        if (canonicalKey) {
          const existing = mergedByCanonicalKey.get(canonicalKey)!
          existing.merged = mergeModRecords(existing.merged, normalized)
          for (const k of getModRecordMatchKeys(existing.merged)) {
            seenLookup.set(k, canonicalKey)
          }
        } else {
          canonicalKey = String(normalized.id || matchKeys[0])
          mergedByCanonicalKey.set(canonicalKey, {
            raw: rawItem,
            merged: normalized,
          })
          for (const k of matchKeys) {
            seenLookup.set(k, canonicalKey)
          }
        }
      }
    }

    const itemsToResolve = Array.from(mergedByCanonicalKey.entries()).map(
      ([key, value]) => ({
        key,
        raw: value.raw,
        item: value.merged,
      }),
    )

    for (let i = 0; i < itemsToResolve.length; i += FS_BATCH_SIZE) {
      const batch = itemsToResolve.slice(i, i + FS_BATCH_SIZE)
      const resolvedBatch = await Promise.all(
        batch.map(async ({ key, raw, item }) => ({
          key,
          raw,
          record: await resolveModRecord(
            item,
            paths,
            diskDirsByLower,
            coversByLower,
            avatarsByLower,
            host,
          ),
        })),
      )
      for (const { key, raw, record } of resolvedBatch) {
        recordsMap.set(key, record)
        if (hasRecordMetadataDrift(raw, record)) {
          updatedRecordsByKey.set(key, record)
        }
      }
    }

    // Track every folder & identity already represented before recovering orphaned/v2 folders.
    const registeredFoldersLower = new Set<string>()
    const registeredIdsLower = new Set<string>()
    for (const record of recordsMap.values()) {
      for (const k of getModRecordMatchKeys(record)) {
        if (k.startsWith('folder:')) registeredFoldersLower.add(k.slice(7))
        if (k.startsWith('id:')) registeredIdsLower.add(k.slice(3))
      }
      if (record.installPath) {
        const clean = record.installPath.replace(/\\/g, '/').replace(/\/+$/, '')
        const base = clean.slice(clean.lastIndexOf('/') + 1).toLowerCase()
        if (base) registeredFoldersLower.add(base)
      }
    }

    const unregisteredDirs = rawModEntries.filter(
      (entry) => !registeredFoldersLower.has(entry.name.toLowerCase()),
    )

    for (let i = 0; i < unregisteredDirs.length; i += FS_BATCH_SIZE) {
      const batch = unregisteredDirs.slice(i, i + FS_BATCH_SIZE)
      const discoveredBatch = await Promise.all(
        batch.map((entry) =>
          discoverUnregisteredModDirectory(
            host,
            entry,
            paths,
            coversByLower,
            avatarsByLower,
          ),
        ),
      )

      for (const discovered of discoveredBatch) {
        if (!discovered) continue
        const key = String(discovered.id || discovered.folderName)
        if (registeredIdsLower.has(key.toLowerCase())) continue

        const resolved = await resolveModRecord(
          discovered,
          paths,
          diskDirsByLower,
          coversByLower,
          avatarsByLower,
          host,
          true,
        )
        recordsMap.set(key, resolved)
        updatedRecordsByKey.set(key, resolved)
        registeredIdsLower.add(key.toLowerCase())
        if (resolved.folderName) {
          registeredFoldersLower.add(resolved.folderName.toLowerCase())
        }
      }
    }

    const finalList = Array.from(recordsMap.values())

    if (persistChanges && updatedRecordsByKey.size > 0) {
      try {
        await queueManifestMutation(async () => {
          const latestByKey = new Map<string, InstalledModRecord>()
          for (const rec of finalList) {
            latestByKey.set(String(rec.id), rec)
          }

          for (const manifestFile of candidateFiles) {
            try {
              if (!(await host.fs.exists(manifestFile))) continue
              const rawLatest = await host.fs.readTextFile(manifestFile)
              if (!rawLatest || !rawLatest.trim()) continue
              const parsedLatest = JSON.parse(rawLatest)
              if (!Array.isArray(parsedLatest)) continue
              for (const item of parsedLatest as InstalledModRecord[]) {
                const key = String(
                  item.id || item.modId || item.folderName || '',
                )
                const updated = key ? updatedRecordsByKey.get(key) : undefined
                if (key && updated) {
                  latestByKey.set(key, mergeModRecords(updated, item))
                }
              }
            } catch {
            }
          }

          await writeInstalledMods(Array.from(latestByKey.values()), { emit: false })
        })
      } catch (err) {
        console.warn(
          '[WeekBox] Failed to persist re-scanned mod metadata:',
          err,
        )
        await writeInstalledMods(finalList, {
          emit: false,
          localStorageOnly: true,
        })
      }
    } else {
      await writeInstalledMods(finalList, {
        emit: false,
        localStorageOnly: true,
      })
    }

    return finalList
  } catch (err) {
    console.warn('[WeekBox] Failed to read installed mods:', err)
    return []
  }
}

export async function getInstalledMods(options?: {
  persistChanges?: boolean
}): Promise<InstalledModRecord[]> {
  if (options?.persistChanges === false) {
    return await scanInstalledModsInternal(false)
  }

  if (inFlightInstalledMods) {
    return await inFlightInstalledMods
  }

  inFlightInstalledMods = scanInstalledModsInternal(true).finally(() => {
    inFlightInstalledMods = null
  })
  return await inFlightInstalledMods
}

export async function getInstalledModById(
  modId: string | number | undefined | null,
): Promise<InstalledModRecord | null> {
  if (modId === undefined || modId === null) return null
  const list = await getInstalledMods()
  return list.find((item) => matchesModId(item, modId)) || null
}

export function saveInstalledMods(
  records: InstalledModRecord[],
): Promise<void> {
  return queueManifestMutation(() => writeInstalledMods(records))
}
