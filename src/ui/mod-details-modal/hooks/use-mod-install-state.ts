import { useState, useEffect, useMemo } from 'react'
import {
  getInstalledModById,
  MODS_CHANGED_EVENT,
  type InstalledModRecord,
} from '@/core/mods'
import type { ModItem, GameBananaFile } from '../types'

interface UseModInstallStateParams {
  displayCard: ModItem
  isInstalledProp?: boolean
  validFiles: GameBananaFile[]
  onUpdateMod?: (updates: Partial<ModItem>) => Promise<void>
}

/**
 * Synchronizes a mod's installation state with `WeekBoxLibrary/data/installedmods.json`
 * and computes whether a newer version is available on GameBanana.
 */
export function useModInstallState({
  displayCard,
  isInstalledProp = false,
  validFiles,
  onUpdateMod,
}: UseModInstallStateParams) {
  const modId = displayCard?.id
  const cardIsInstalled = displayCard?.isInstalled

  const [installedRecord, setInstalledRecord] =
    useState<InstalledModRecord | null>(null)
  const [isInstalled, setIsInstalled] = useState<boolean>(
    Boolean(cardIsInstalled ?? isInstalledProp),
  )

  useEffect(() => {
    let cancelled = false

    const syncInstalledState = async () => {
      if (modId === undefined || modId === null) {
        if (!cancelled) {
          setInstalledRecord(null)
          setIsInstalled(false)
        }
        return
      }

      const record = await getInstalledModById(modId)
      if (cancelled) return

      if (record) {
        setInstalledRecord(record)
        setIsInstalled(true)
        if (onUpdateMod) {
          const patch: Partial<ModItem> = {
            isInstalled: true,
            installedAt: record.installedAt,
            downloadedFileId: record.downloadedFileId,
            installedFileId: record.installedFileId,
            fileName: record.fileName,
          }
          if (record.categoryId !== undefined) {
            patch.categoryId = record.categoryId
          }
          if (record.categoryName || record.isExecutable) {
            patch.categoryName = record.isExecutable
              ? 'Executable Mods'
              : record.categoryName
          }
          if (record.engineId) patch.engineId = record.engineId
          if (record.engineName) patch.engineName = record.engineName
          if (record.icon) patch.icon = record.icon
          if (record.isExecutable !== undefined) {
            patch.isExecutable = record.isExecutable
          }
          if (record.hasEngineWarning !== undefined) {
            patch.hasEngineWarning = record.hasEngineWarning
            patch.engineWarningMessage = record.engineWarningMessage
          } else if (record.engineWarningMessage) {
            patch.engineWarningMessage = record.engineWarningMessage
          }
          if (record.name) patch.name = record.name
          if (record.title) patch.title = record.title
          if (record.description !== undefined) {
            patch.description = record.description
          }
          if (record.userPfp) patch.userPfp = record.userPfp
          if (record.userPfpPath) patch.userPfpPath = record.userPfpPath
          if (record.localUserPfp) patch.localUserPfp = record.localUserPfp
          if (record.credits && record.credits.length > 0) {
            patch.credits = record.credits
          }
          if (record.authors && record.authors.length > 0) {
            patch.authors = record.authors
          }
          void onUpdateMod(patch)
        }
      } else {
        setInstalledRecord(null)
        setIsInstalled(Boolean(cardIsInstalled ?? isInstalledProp))
      }
    }

    void syncInstalledState()

    const handleModsChanged = () => {
      void syncInstalledState()
    }

    window.addEventListener(MODS_CHANGED_EVENT, handleModsChanged)
    return () => {
      cancelled = true
      window.removeEventListener(MODS_CHANGED_EVENT, handleModsChanged)
    }
  }, [modId, cardIsInstalled, isInstalledProp, onUpdateMod])

  const localInstalledAt = useMemo<number | undefined>(() => {
    if (installedRecord?.installedAt) return installedRecord.installedAt
    if (typeof displayCard?.installedAt === 'number') {
      return displayCard.installedAt
    }
    return undefined
  }, [installedRecord?.installedAt, displayCard?.installedAt])

  const hasUpdate = useMemo<boolean>(() => {
    if (!isInstalled || !localInstalledAt) return false
    const toMs = (val?: number | string) => {
      if (!val) return 0
      if (typeof val === 'number') {
        return val < 10_000_000_000 ? val * 1000 : val
      }
      const parsed = new Date(val).getTime()
      return Number.isNaN(parsed) ? 0 : parsed
    }

    const latestFileMs = validFiles.reduce((max, f) => {
      const t = toMs(f._tsDateAdded || f.date || f._tsDateModified)
      return t > max ? t : max
    }, 0)

    const updatedMs = Math.max(toMs(displayCard?.updatedAt), latestFileMs)
    return updatedMs > localInstalledAt + 60_000
  }, [isInstalled, localInstalledAt, validFiles, displayCard?.updatedAt])

  const isExecutable = Boolean(
    installedRecord?.isExecutable ||
      displayCard?.isExecutable ||
      displayCard?.engineId === 'exe' ||
      displayCard?.engineId === 'executable',
  )

  return {
    installedRecord,
    setInstalledRecord,
    isInstalled,
    setIsInstalled,
    localInstalledAt,
    hasUpdate,
    isExecutable,
  }
}
