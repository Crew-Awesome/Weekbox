import { initHost } from '@/core/host'
import { ensureWeekBoxLibrary, joinPaths } from '@/core/storage'
import { openFolderInExplorer } from '@/core/mods/mod-filesystem'
import { trackEngineSession } from './engine-playtime'
export { findEngineExecutable, scanLocalEnginesDirectory } from './engine-scanner'
import type {
  EngineId,
  EngineRecord,
  EngineUpdateStateData,
  InstalledEngineVersion,
} from './types'

export const ENGINES_CHANGED_EVENT = 'wb:engines-changed'

function emitEnginesChanged(detail?: unknown): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(ENGINES_CHANGED_EVENT, { detail }))
  }
}

export function sanitizeVersionFolderName(version: string): string {
  return version.replace(/[^a-zA-Z0-9._-]/g, '_')
}

export async function getEngineUpdateState(): Promise<EngineUpdateStateData> {
  const host = initHost()
  try {
    const { paths } = await ensureWeekBoxLibrary()
    const exists = await host.fs.exists(paths.engineUpdateState)
    if (!exists) {
      return { lastChecked: null, engines: {} }
    }
    const raw = await host.fs.readTextFile(paths.engineUpdateState)
    if (!raw || !raw.trim()) {
      return { lastChecked: null, engines: {} }
    }
    const parsed = JSON.parse(raw) as EngineUpdateStateData
    if (!parsed || typeof parsed !== 'object') {
      return { lastChecked: null, engines: {} }
    }
    return {
      lastChecked: parsed.lastChecked || null,
      engines: parsed.engines || {},
    }
  } catch (err) {
    console.warn('[WeekBox] Failed to read engineupdatestate.json:', err)
    return { lastChecked: null, engines: {} }
  }
}

export async function saveEngineUpdateState(
  state: EngineUpdateStateData,
): Promise<void> {
  const host = initHost()
  const { paths } = await ensureWeekBoxLibrary()
  await host.fs.writeTextFile(
    paths.engineUpdateState,
    JSON.stringify(state, null, 2),
  )
  emitEnginesChanged(state)
}

export async function getInstalledEngineVersions(
  engineId: EngineId,
): Promise<InstalledEngineVersion[]> {
  const state = await getEngineUpdateState()
  const engineRecord = state.engines[engineId]
  return engineRecord?.installedVersions || []
}

export async function getActiveEngineVersion(
  engineId: EngineId,
): Promise<string | null> {
  const state = await getEngineUpdateState()
  const engineRecord = state.engines[engineId]
  if (!engineRecord) return null
  if (engineRecord.activeVersion) return engineRecord.activeVersion
  const firstInstalled = engineRecord.installedVersions?.[0]
  return firstInstalled ? firstInstalled.version : null
}

export async function setActiveEngineVersion(
  engineId: EngineId,
  version: string,
): Promise<void> {
  const state = await getEngineUpdateState()
  const engineRecord: EngineRecord = state.engines[engineId] || {
    engineId,
    installedVersions: [],
  }

  engineRecord.activeVersion = version
  engineRecord.installedVersions = (engineRecord.installedVersions || []).map(
    (item) => ({
      ...item,
      isDefault: item.version === version,
    }),
  )

  state.engines[engineId] = engineRecord
  await saveEngineUpdateState(state)
}

export async function registerInstalledEngine(
  record: InstalledEngineVersion,
  engineId: EngineId,
): Promise<void> {
  const state = await getEngineUpdateState()
  const engineRecord: EngineRecord = state.engines[engineId] || {
    engineId,
    installedVersions: [],
  }

  const existingIndex = engineRecord.installedVersions.findIndex(
    (item) => item.version === record.version,
  )

  const isFirst = engineRecord.installedVersions.length === 0
  const updatedItem: InstalledEngineVersion = {
    ...record,
    isDefault: record.isDefault ?? (isFirst || existingIndex === 0),
  }

  if (existingIndex >= 0) {
    engineRecord.installedVersions[existingIndex] = updatedItem
  } else {
    engineRecord.installedVersions.push(updatedItem)
  }

  if (updatedItem.isDefault || !engineRecord.activeVersion) {
    engineRecord.activeVersion = updatedItem.version
  }

  state.engines[engineId] = engineRecord
  await saveEngineUpdateState(state)
}

export async function deleteInstalledEngineVersion(
  engineId: EngineId,
  version: string,
): Promise<boolean> {
  const host = initHost()
  const { paths } = await ensureWeekBoxLibrary()
  const safeVersion = sanitizeVersionFolderName(version)
  const versionDir = joinPaths(paths.enginesDir, `${engineId}/${safeVersion}`)

  try {
    const exists = await host.fs.exists(versionDir)
    if (exists) {
      await host.fs.remove(versionDir)
    }

    const state = await getEngineUpdateState()
    const engineRecord = state.engines[engineId]
    if (engineRecord) {
      engineRecord.installedVersions = engineRecord.installedVersions.filter(
        (v) => v.version !== version,
      )
      if (engineRecord.activeVersion === version) {
        engineRecord.activeVersion =
          engineRecord.installedVersions[0]?.version || null
      }
      state.engines[engineId] = engineRecord
      await saveEngineUpdateState(state)
    }

    return true
  } catch (err) {
    console.error(`[WeekBox] Failed to delete engine ${engineId} ${version}:`, err)
    return false
  }
}

export async function openEngineDirectory(
  engineId: EngineId,
  version?: string,
): Promise<boolean> {
  const { paths } = await ensureWeekBoxLibrary()
  const target = version
    ? joinPaths(paths.enginesDir, `${engineId}/${sanitizeVersionFolderName(version)}`)
    : joinPaths(paths.enginesDir, engineId)
  return await openFolderInExplorer(target)
}

export async function launchEngineVersion(
  engineId: EngineId,
  version: string,
): Promise<boolean> {
  const host = initHost()
  const versions = await getInstalledEngineVersions(engineId)
  const item = versions.find((v) => v.version === version)
  if (!item || !item.executablePath) {
    console.error(`[WeekBox] No executable found for ${engineId} ${version}`)
    return false
  }

  try {
    const exe = item.executablePath.replace(/\//g, '\\')
    const cwd = item.installPath.replace(/\//g, '\\')

    if (host.platform === 'desktop') {
      const proc = await host.process.spawn(exe, { cwd })
      trackEngineSession(engineId, proc.id ?? proc.pid)
      return true
    }
    return false
  } catch (err) {
    console.error(`[WeekBox] Failed to launch engine ${engineId} ${version}:`, err)
    return false
  }
}
