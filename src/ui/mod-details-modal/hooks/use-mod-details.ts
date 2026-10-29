import { useState, useMemo, useCallback } from 'react'
import { useViewport } from '@/utils/hooks/use-viewport'
import { updateInstalledModMetadata } from '@/core/mods'
import type { ModalViewProps, GameBananaFile } from '../types'
import type { EngineCategory } from '../constants'
import type { ModModalTab } from '../components/mod-nav-pills'
import { useModInstallState } from './use-mod-install-state'
import { useModInlineEdit } from './use-mod-inline-edit'
import { useModBookmarks } from './use-mod-bookmarks'
import { useModDownloadActions } from './use-mod-download-actions'

export function useModDetails({
  displayCard,
  isInstalled: isInstalledProp = false,
  onUpdateMod,
  onClose,
}: Pick<
  ModalViewProps,
  | 'displayCard'
  | 'engineName'
  | 'formatDate'
  | 'formatFullDate'
  | 'isInstalled'
  | 'onUpdateMod'
  | 'onClose'
>) {
  const { width: viewportWidth, isMobile: isMobilePlatform } = useViewport()

  const [hoverTooltip, setHoverTooltip] = useState<
    'submitted' | 'updated' | 'installed' | null
  >(null)

  const [activeTab, setActiveTab] = useState<ModModalTab>('description')
  const [prevCardId, setPrevCardId] = useState(displayCard?.id)
  const isDropdownOpen = activeTab === 'details'

  if (displayCard?.id !== prevCardId) {
    setPrevCardId(displayCard?.id)
    setActiveTab('description')
  }

  const authorAvatar = useMemo(() => {
    if (displayCard?.userPfp) return displayCard.userPfp
    const authorLower = (displayCard?.author || '').trim().toLowerCase()
    return displayCard?.credits
      ?.flatMap((g) => g.authors || [])
      ?.find(
        (a) =>
          a.name?.trim().toLowerCase() === authorLower && Boolean(a.avatarUrl),
      )?.avatarUrl
  }, [displayCard?.userPfp, displayCard?.credits, displayCard?.author])

  const [avatarError, setAvatarError] = useState(false)
  const [prevAuthorAvatar, setPrevAuthorAvatar] = useState(authorAvatar)
  if (authorAvatar !== prevAuthorAvatar) {
    setPrevAuthorAvatar(authorAvatar)
    setAvatarError(false)
  }

  const [isHeaderVisible, setIsHeaderVisible] = useState(true)

  const files = displayCard?.files
  const validFiles = useMemo<GameBananaFile[]>(() => {
    if (!files) return []
    return Array.isArray(files) ? files : Object.values(files)
  }, [files])

  const {
    installedRecord,
    setInstalledRecord,
    isInstalled,
    setIsInstalled,
    localInstalledAt,
    hasUpdate,
    isExecutable,
  } = useModInstallState({
    displayCard,
    isInstalledProp,
    validFiles,
    onUpdateMod,
  })

  const inlineEdit = useModInlineEdit({
    displayCard,
    isInstalled,
    onUpdateMod,
  })

  const bookmarks = useModBookmarks(displayCard?.id)

  const [isEngineDropdownOpen, setIsEngineDropdownOpen] = useState(false)
  const [isVersionDropdownOpen, setIsVersionDropdownOpen] = useState(false)
  const [selectedVersion, setSelectedVersion] = useState('latest')
  const [isInstallingEngine, setIsInstallingEngine] = useState(false)
  const installedEngineVersions = ['0.7.3', '0.7.2', 'latest']

  const downloadActions = useModDownloadActions({
    displayCard,
    validFiles,
    installedRecord,
    setInstalledRecord,
    setIsInstalled,
    onUpdateMod,
    selectedVersion,
  })

  const modId = displayCard?.id

  const handleSelectEngine = useCallback(
    (cat: EngineCategory) => {
      setIsEngineDropdownOpen(false)
      if (onUpdateMod) {
        void onUpdateMod({
          engineId: cat.id,
          engineName: cat.name,
          icon: cat.icon,
        })
      }
      if (isInstalled && modId !== undefined) {
        void updateInstalledModMetadata(modId, {
          engineId: cat.id,
          engineName: cat.name,
          icon: cat.icon,
        })
      }
    },
    [onUpdateMod, isInstalled, modId],
  )

  const handleSelectVersion = useCallback((ver: string) => {
    setSelectedVersion(ver)
    setIsVersionDropdownOpen(false)
  }, [])

  const handleInstallLatestEngine = useCallback(() => {
    setIsInstallingEngine(true)
    setTimeout(() => setIsInstallingEngine(false), 1500)
  }, [])

  return {
    viewportWidth,
    isMobilePlatform,
    isHeaderVisible,
    setIsHeaderVisible,
    isInstalled,
    localInstalledAt,
    isExecutable,
    isEngineInstalledOnDevice: true,
    handleInstallLatestEngine,
    isInstallingEngine,
    installedEngineVersions,
    isEngineDropdownOpen,
    setIsEngineDropdownOpen,
    handleSelectEngine,
    isVersionDropdownOpen,
    setIsVersionDropdownOpen,
    selectedVersion,
    handleSelectVersion,
    handleOpenFolder: downloadActions.handleOpenFolder,
    authorAvatar,
    avatarError,
    setAvatarError,
    ...inlineEdit,
    activeTab,
    setActiveTab,
    validFiles,
    ...bookmarks,
    handleDownload: downloadActions.handleDownload,
    handleCancelDownload: downloadActions.handleCancelDownload,
    downloadTasks: downloadActions.tasksByFileId,
    handleManage: downloadActions.handleManage,
    hoverTooltip,
    setHoverTooltip,
    hasUpdate,
    isUpdating: downloadActions.isUpdating,
    updateProgress: downloadActions.updateProgress,
    handleUpdateClick: downloadActions.handleUpdateClick,
    isStorageMigrating: false,
    playStatus: downloadActions.playStatus,
    handleStop: downloadActions.handleStop,
    handleUninstall: downloadActions.handleUninstall,
    isUninstalling: downloadActions.isUninstalling,
    isLoading: downloadActions.isLoading,
    hasNoFiles: validFiles.length === 0,
    hasMultipleFiles: validFiles.length > 1,
    singleFileProgress: downloadActions.singleFileProgress,
    singleFileStatus: downloadActions.singleFileStatus,
    singleFileCurrentFile: downloadActions.singleFileCurrentFile,
    singleFileDownloaded: downloadActions.singleFileDownloaded,
    singleFileTotal: downloadActions.singleFileTotal,
    activeDownloadsCount: downloadActions.activeDownloadsCount,
    isDropdownOpen,
    isUninstallConfirmOpen: downloadActions.isUninstallConfirmOpen,
    setIsUninstallConfirmOpen: downloadActions.setIsUninstallConfirmOpen,
    executeUninstall: downloadActions.executeUninstall,
    onClose,
  }
}
