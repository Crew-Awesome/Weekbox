import { initHost } from '@/core/host'
import { ensureWeekBoxLibrary } from '@/core/storage/weekbox-library'
import { ENGINE_DEFINITIONS } from './constants'
import { getEngineUpdateState, saveEngineUpdateState } from './engine-registry'
import type { EngineId, EngineRecord } from './types'

export async function findEngineExecutable(
  engineDir: string,
  preferredExeName?: string,
): Promise<string | null> {
  const host = initHost()
  let detectedExe: string | null = null

  const scan = async (dirPath: string, depth: number) => {
    if (depth > 2 || detectedExe) return
    try {
      const entries = await host.fs.readDirectory(dirPath)
      for (const entry of entries) {
        if (entry.name === '.' || entry.name === '..') continue
        const lower = entry.name.toLowerCase()

        if (!entry.isDirectory) {
          if (
            preferredExeName &&
            entry.name.toLowerCase() === preferredExeName.toLowerCase()
          ) {
            detectedExe = entry.path
            return
          }

          if (
            lower.endsWith('.exe') &&
            !lower.includes('crash') &&
            !lower.includes('unins') &&
            !lower.includes('unitycrash')
          ) {
            if (!detectedExe) {
              detectedExe = entry.path
            }
          }
        } else if (depth < 2) {
          await scan(entry.path, depth + 1)
        }
      }
    } catch {
    }
  }

  await scan(engineDir, 0)
  return detectedExe
}

let inFlightEngineScan: Promise<void> | null = null

export function scanLocalEnginesDirectory(): Promise<void> {
  if (inFlightEngineScan) return inFlightEngineScan

  inFlightEngineScan = (async () => {
    const host = initHost()
    const { paths } = await ensureWeekBoxLibrary()

    try {
      const rootExists = await host.fs.exists(paths.enginesDir)
      if (!rootExists) {
        await host.fs.createDirectory(paths.enginesDir)
        return
      }

      const [state, engineFolders] = await Promise.all([
        getEngineUpdateState(),
        host.fs.readDirectory(paths.enginesDir),
      ])

      let hasChanges = false

      const validEngineFolders = engineFolders.filter(
        (folder) =>
          folder.isDirectory && Boolean(ENGINE_DEFINITIONS[folder.name as EngineId]),
      )

      const scannedEngines = await Promise.all(
        validEngineFolders.map(async (engineFolder) => {
          const engineId = engineFolder.name as EngineId
          const def = ENGINE_DEFINITIONS[engineId]!
          const existingRecord = state.engines[engineId]
          const versionFolders = (
            await host.fs.readDirectory(engineFolder.path)
          ).filter((v) => v.isDirectory)

          const versionsWithExe = await Promise.all(
            versionFolders.map(async (verFolder) => {
              const already = existingRecord?.installedVersions.find(
                (v) => v.version === verFolder.name,
              )
              if (already?.executablePath) {
                return { version: verFolder.name, path: verFolder.path, exePath: already.executablePath }
              }
              const exePath = await findEngineExecutable(
                verFolder.path,
                def.defaultExeName,
              )
              return { version: verFolder.name, path: verFolder.path, exePath }
            }),
          )

          return { engineId, def, versionsWithExe }
        }),
      )

      for (const { engineId, def, versionsWithExe } of scannedEngines) {
        const hadRecord = Boolean(state.engines[engineId])
        const engineRecord: EngineRecord = state.engines[engineId] || {
          engineId,
          installedVersions: [],
        }

        for (const { version, path: verPath, exePath } of versionsWithExe) {
          const already = engineRecord.installedVersions.find(
            (v) => v.version === version,
          )
          if (!already) {
            engineRecord.installedVersions.push({
              version,
              tag: version,
              name: `${def.name} ${version}`,
              installPath: verPath,
              executablePath: exePath || undefined,
              installedAt: Date.now(),
              isDefault: engineRecord.installedVersions.length === 0,
            })
            hasChanges = true
          } else if (exePath && !already.executablePath) {
            already.executablePath = exePath
            hasChanges = true
          }
        }

        if (
          !engineRecord.activeVersion &&
          engineRecord.installedVersions.length > 0
        ) {
          engineRecord.activeVersion = engineRecord.installedVersions[0].version
          hasChanges = true
        }

        if (!hadRecord && engineRecord.installedVersions.length > 0) {
          state.engines[engineId] = engineRecord
          hasChanges = true
        }
      }

      if (hasChanges) {
        await saveEngineUpdateState(state)
      }
    } catch (err) {
      console.warn('[WeekBox] Local engines scan warning:', err)
    }
  })().finally(() => {
    inFlightEngineScan = null
  })

  return inFlightEngineScan
}
