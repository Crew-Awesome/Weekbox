import { initHost } from '@/core/host'
import { ensureWeekBoxLibrary, joinPaths } from '@/core/storage/weekbox-library'
import { detectModEngineFromFiles } from './mod-filesystem'
import {
  normalizeEngineFields,
  matchesModId,
  queueManifestMutation,
  writeInstalledMods,
} from './mod-registry-helpers'
import type { InstalledModRecord } from './types'

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
                  let warning = item.hasEngineWarning
                  let warningMsg = item.engineWarningMessage
                  let resolvedEngineId = engineNorm.engineId
                  let resolvedEngineName = engineNorm.engineName
                  let resolvedIsExe = engineNorm.isExecutable

                  const installPath =
                    item.installPath ||
                    (item.folderName ? joinPaths(paths.modsDir, item.folderName) : '')

                  if (warning === undefined && installPath) {
                    try {
                      const dirExists = await host.fs.exists(installPath)
                      if (dirExists) {
                        const isVslice =
                          resolvedEngineId === 'vslice' ||
                          item.defaultEngineId === 'vslice'
                        if (isVslice) {
                          const hasPoly = await host.fs.exists(
                            joinPaths(installPath, '_polymod_meta.json'),
                          )
                          if (!hasPoly) {
                            const hasPack = await host.fs.exists(
                              joinPaths(installPath, 'pack.json'),
                            )
                            if (hasPack) {
                              resolvedEngineId = 'psych'
                              resolvedEngineName = 'Psych Engine'
                              resolvedIsExe = false
                              warning = false
                            } else {
                              const detected = await detectModEngineFromFiles(
                                installPath,
                                'vslice',
                              )
                              resolvedEngineId = detected.engineId
                              resolvedEngineName =
                                detected.engineId === 'executable'
                                  ? 'Executable Mods'
                                  : engineNorm.engineName
                              resolvedIsExe = detected.isExecutable
                              warning = detected.hasEngineWarning
                              warningMsg = detected.engineWarningMessage
                            }
                          }
                        }
                      }
                    } catch {
                    }
                  }

                  recordsMap.set(key, {
                    ...item,
                    title: item.title || item.name,
                    engineId: resolvedEngineId,
                    engineName: resolvedEngineName,
                    isExecutable: resolvedIsExe,
                    defaultEngineId: engineNorm.defaultEngineId,
                    defaultEngineName: engineNorm.defaultEngineName,
                    icon: engineNorm.icon || item.icon,
                    hasEngineWarning: warning,
                    engineWarningMessage: warningMsg,
                    meta: {
                      ...item.meta,
                      link: item.downloadUrl || item.meta?.link,
                      downloadUrl: item.downloadUrl || item.meta?.link,
                    },
                    installPath,
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

export function saveInstalledMods(
  records: InstalledModRecord[],
): Promise<void> {
  return queueManifestMutation(() => writeInstalledMods(records))
}
