import { initHost } from '@/core/host'
import { ensureWeekBoxLibrary } from '@/core/storage'
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

export async function scanLocalEnginesDirectory(): Promise<void> {
  const host = initHost()
  const { paths } = await ensureWeekBoxLibrary()

  try {
    const rootExists = await host.fs.exists(paths.enginesDir)
    if (!rootExists) {
      await host.fs.createDirectory(paths.enginesDir)
      return
    }

    const state = await getEngineUpdateState()
    const engineFolders = await host.fs.readDirectory(paths.enginesDir)

    for (const engineFolder of engineFolders) {
      if (!engineFolder.isDirectory) continue
      const engineId = engineFolder.name as EngineId
      const def = ENGINE_DEFINITIONS[engineId]
      if (!def) continue

      const versionFolders = await host.fs.readDirectory(engineFolder.path)
      const engineRecord: EngineRecord = state.engines[engineId] || {
        engineId,
        installedVersions: [],
      }

      for (const verFolder of versionFolders) {
        if (!verFolder.isDirectory) continue
        const version = verFolder.name
        const already = engineRecord.installedVersions.find(
          (v) => v.version === version,
        )

        const exePath = await findEngineExecutable(
          verFolder.path,
          def.defaultExeName,
        )

        if (!already) {
          engineRecord.installedVersions.push({
            version,
            tag: version,
            name: `${def.name} ${version}`,
            installPath: verFolder.path,
            executablePath: exePath || undefined,
            installedAt: Date.now(),
            isDefault: engineRecord.installedVersions.length === 0,
          })
        } else if (exePath && !already.executablePath) {
          already.executablePath = exePath
        }
      }

      if (
        !engineRecord.activeVersion &&
        engineRecord.installedVersions.length > 0
      ) {
        engineRecord.activeVersion = engineRecord.installedVersions[0].version
      }

      state.engines[engineId] = engineRecord
    }

    await saveEngineUpdateState(state)
  } catch (err) {
    console.warn('[WeekBox] Local engines scan warning:', err)
  }
}
