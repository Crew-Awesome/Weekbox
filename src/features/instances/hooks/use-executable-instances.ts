import { useState, useEffect, useCallback, useMemo } from 'react'
import { initHost } from '@/core/host'
import {
  getExecutableTrackingId,
  type EngineDefinition,
} from '@/core/engines'
import {
  getInstalledMods,
  launchMod,
  uninstallModById,
  MODS_CHANGED_EVENT,
  type InstalledModRecord,
} from '@/core/mods'
import {
  openFolderInExplorer,
  resolveModInstallDirectory,
} from '@/core/mods/mod-filesystem'
import { findModExecutable } from '@/core/mods/mod-launcher'
import { resolveModThumbnail } from '@/features/library/utils'
import { useSystemDialog } from '@/ui/dialog/context'

const INSTANCES_MODE_STORAGE_KEY = 'weekbox:instances:selection_mode'
const INSTANCES_EXECUTABLE_STORAGE_KEY = 'weekbox:instances:selected_executable'

export type InstancesSelectionMode = 'engine' | 'executable'

export type InstanceDisplayDefinition = Pick<
  EngineDefinition,
  'name' | 'icon' | 'banner' | 'description' | 'accent'
> & {
  id: string
  repo?: string
}

function getInitialSelectionMode(): InstancesSelectionMode {
  if (typeof localStorage === 'undefined') return 'engine'
  try {
    return localStorage.getItem(INSTANCES_MODE_STORAGE_KEY) === 'executable'
      ? 'executable'
      : 'engine'
  } catch {
    return 'engine'
  }
}

function getInitialExecutableId(): string | null {
  if (typeof localStorage === 'undefined') return null
  try {
    return localStorage.getItem(INSTANCES_EXECUTABLE_STORAGE_KEY) || null
  } catch {
    return null
  }
}

function isInstalledExecutableMod(mod: InstalledModRecord): boolean {
  const hasLocation = Boolean(mod.installPath || mod.folderName)
  const isExe = Boolean(
    mod.isExecutable ||
      mod.engineId === 'executable' ||
      mod.engineId === 'exe',
  )
  return hasLocation && isExe
}

function resolveExecutableBanner(mod: InstalledModRecord): string | undefined {
  const preview = mod.previewMedia?.find(
    (url) => typeof url === 'string' && url.trim().length > 0,
  )
  if (preview) return preview
  const resolved = resolveModThumbnail(mod)
  return resolved.includes('placeholder-mini') ? undefined : resolved
}

/**
 * Manages installed executable mods for the Instances view ("Instances" submenu),
 * exposing selection, metadata mapping, executable scanning, launch, folder, and uninstall actions.
 */
export function useExecutableInstances() {
  const { openDialog } = useSystemDialog()
  const [executableMods, setExecutableMods] = useState<InstalledModRecord[]>([])
  const [selectionMode, setSelectionMode] = useState<InstancesSelectionMode>(
    getInitialSelectionMode,
  )
  const [selectedExecutableId, setSelectedExecutableId] = useState<string | null>(
    getInitialExecutableId,
  )
  const [resolvedExeState, setResolvedExeState] = useState<{
    modId: string
    exePath: string | null
  } | null>(null)
  const [isUninstalling, setIsUninstalling] = useState(false)

  const refreshExecutableMods = useCallback(async () => {
    try {
      const installed = await getInstalledMods()
      const exes = installed.filter(isInstalledExecutableMod)
      setExecutableMods(exes)
    } catch (err) {
      console.warn('[useExecutableInstances] Failed to load executable mods:', err)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const syncMods = () => {
      void getInstalledMods()
        .then((installed) => {
          if (!cancelled) {
            setExecutableMods(installed.filter(isInstalledExecutableMod))
          }
        })
        .catch((err) => {
          console.warn(
            '[useExecutableInstances] Failed to load executable mods:',
            err,
          )
        })
    }

    syncMods()
    window.addEventListener(MODS_CHANGED_EVENT, syncMods)
    return () => {
      cancelled = true
      window.removeEventListener(MODS_CHANGED_EVENT, syncMods)
    }
  }, [])

  const selectedExecutableMod = useMemo<InstalledModRecord | null>(() => {
    if (executableMods.length === 0) return null
    if (selectedExecutableId) {
      const found = executableMods.find(
        (m) => String(m.id) === selectedExecutableId,
      )
      if (found) return found
    }
    return executableMods[0]
  }, [executableMods, selectedExecutableId])

  const isExecutableSelected =
    selectionMode === 'executable' && selectedExecutableMod !== null

  const activeModId = selectedExecutableMod
    ? String(selectedExecutableMod.id)
    : null
  const activeInstallPath = selectedExecutableMod?.installPath

  useEffect(() => {
    if (!isExecutableSelected || !activeModId || !activeInstallPath) return
    let cancelled = false
    void findModExecutable(activeInstallPath)
      .then((exePath) => {
        if (!cancelled) {
          setResolvedExeState({ modId: activeModId, exePath })
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResolvedExeState({ modId: activeModId, exePath: null })
        }
      })
    return () => {
      cancelled = true
    }
  }, [isExecutableSelected, activeModId, activeInstallPath])

  const selectedExecutableExePath =
    activeModId && resolvedExeState?.modId === activeModId
      ? resolvedExeState.exePath
      : null

  const selectedExecutableExeName = useMemo(() => {
    if (!selectedExecutableExePath) return null
    return selectedExecutableExePath.split(/[/\\]/).pop() || null
  }, [selectedExecutableExePath])

  const selectedExecutableDisplay = useMemo<InstanceDisplayDefinition | null>(() => {
    if (!selectedExecutableMod) return null
    return {
      id: getExecutableTrackingId(selectedExecutableMod.id),
      name: selectedExecutableMod.title || selectedExecutableMod.name || 'Executable',
      icon: selectedExecutableMod.icon || '/imgs/icons/categories/exe.png',
      banner: resolveExecutableBanner(selectedExecutableMod),
      description: selectedExecutableMod.description || '',
      accent: '#8b5cf6',
    }
  }, [selectedExecutableMod])

  const persistMode = useCallback((mode: InstancesSelectionMode, execId?: string) => {
    try {
      localStorage.setItem(INSTANCES_MODE_STORAGE_KEY, mode)
      if (execId !== undefined) {
        localStorage.setItem(INSTANCES_EXECUTABLE_STORAGE_KEY, execId)
      }
    } catch {
    }
  }, [])

  const selectExecutable = useCallback(
    (modId: string) => {
      setSelectedExecutableId(modId)
      setSelectionMode('executable')
      persistMode('executable', modId)
    },
    [persistMode],
  )

  const clearExecutableSelection = useCallback(() => {
    setSelectionMode('engine')
    persistMode('engine')
  }, [persistMode])

  const handleLaunchExecutable = useCallback(async () => {
    if (!selectedExecutableMod) return
    try {
      const res = await launchMod(selectedExecutableMod)
      if (res.success && typeof window !== 'undefined' && window.callout) {
        window.callout.primary(
          `Launching ${selectedExecutableMod.title || selectedExecutableMod.name || 'executable'}...`,
          'Playing Mod',
        )
      } else if (!res.success && typeof window !== 'undefined' && window.callout) {
        window.callout.error(res.error || 'Failed to launch mod', 'Launch Error')
      }
    } catch (err: unknown) {
      if (typeof window !== 'undefined' && window.callout) {
        window.callout.error(
          err instanceof Error ? err.message : 'Error launching mod',
          'Launch Error',
        )
      }
    }
  }, [selectedExecutableMod])

  const handleOpenExecutableFolder = useCallback(async () => {
    if (!selectedExecutableMod) return
    let folderPath = selectedExecutableMod.installPath
    if (!folderPath) {
      const resolved = await resolveModInstallDirectory(
        selectedExecutableMod.id,
        selectedExecutableMod.title || selectedExecutableMod.name,
      )
      folderPath = resolved.modInstallDir
    }
    const opened = await openFolderInExplorer(folderPath)
    if (!opened && typeof window !== 'undefined' && window.callout) {
      window.callout.surface(`Directory: ${folderPath}`, 'Mod Directory Location', {
        duration: 4500,
      })
    }
  }, [selectedExecutableMod])

  const handleOpenExecutableSource = useCallback(() => {
    if (!selectedExecutableMod?.sourceUrl) return
    void initHost().openUrl(selectedExecutableMod.sourceUrl)
  }, [selectedExecutableMod])

  const handleUninstallExecutable = useCallback(() => {
    if (!selectedExecutableMod) return
    const title = selectedExecutableMod.title || selectedExecutableMod.name || 'this mod'
    openDialog({
      type: 'confirm',
      title: 'Uninstall Executable',
      message: `Are you sure you want to uninstall "${title}"? Its files will be deleted from your WeekBoxLibrary.`,
      confirmText: 'Uninstall',
      cancelText: 'Cancel',
      onConfirm: async () => {
        setIsUninstalling(true)
        try {
          const ok = await uninstallModById(selectedExecutableMod.id)
          if (ok) {
            await refreshExecutableMods()
            window.callout?.secondary(
              `"${title}" was uninstalled from your library.`,
              'Mod Uninstalled',
              { duration: 3500 },
            )
          }
        } finally {
          setIsUninstalling(false)
        }
      },
    })
  }, [selectedExecutableMod, openDialog, refreshExecutableMods])

  return {
    executableMods,
    isExecutableSelected,
    selectedExecutableMod,
    selectedExecutableId: activeModId,
    selectedExecutableDisplay,
    selectedExecutableExeName,
    isExecutableUninstalling: isUninstalling,
    selectExecutable,
    clearExecutableSelection,
    launchExecutable: handleLaunchExecutable,
    openExecutableFolder: handleOpenExecutableFolder,
    openExecutableSource: handleOpenExecutableSource,
    uninstallExecutable: handleUninstallExecutable,
  }
}
