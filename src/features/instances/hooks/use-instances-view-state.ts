import { useState, useEffect, useMemo, useCallback } from 'react'
import { marked } from 'marked'
import { initHost } from '@/core/host'
import {
  getCompatibleAsset,
  setFocusedInstanceView,
  type EngineId,
  type EngineDefinition,
  type GitHubRelease,
  type EngineDownloadTask,
  type EnginePlatform,
} from '@/core/engines'
import { ENGINE_DESCRIPTIONS } from '../descriptions'
import type { EngineInstallVisualPhase } from '../components/EngineInstallVisual'

interface UseInstancesViewStateProps {
  selectedEngineId: EngineId
  currentEngine: EngineDefinition
  selectedVersion: string | null
  selectedRelease: GitHubRelease | undefined
  selectedTask: EngineDownloadTask | undefined
  platform: EnginePlatform
}

const INSTALL_STARTING_MIN_MS = 700

export function useInstancesViewState({
  selectedEngineId,
  currentEngine,
  selectedVersion,
  selectedRelease,
  selectedTask,
  platform,
}: UseInstancesViewStateProps) {
  const [descriptionTab, setDescriptionTab] = useState<'general' | 'version'>('general')
  const [isTranslationActive, setIsTranslationActive] = useState(false)
  const [installRequest, setInstallRequest] = useState<{
    version: string
    requestedAt: number
  } | null>(null)

  const isInstallStarting = Boolean(installRequest?.version === selectedVersion)

  const recommendedAsset = useMemo(() => {
    return getCompatibleAsset(selectedRelease?.assets ?? [], platform)
  }, [selectedRelease?.assets, platform])

  useEffect(() => {
    if (!installRequest) return
    if (
      selectedTask &&
      (selectedTask.status === 'error' || selectedTask.status === 'completed')
    ) {
      setInstallRequest(null)
    }
  }, [installRequest, selectedTask])

  useEffect(() => {
    if (!installRequest) return
    const elapsed = Date.now() - installRequest.requestedAt
    const remaining = Math.max(0, INSTALL_STARTING_MIN_MS - elapsed)
    const timeout = window.setTimeout(() => setInstallRequest(null), remaining)
    return () => window.clearTimeout(timeout)
  }, [installRequest])

  useEffect(() => {
    if (selectedVersion) {
      setFocusedInstanceView({
        engineId: selectedEngineId,
        version: selectedVersion,
      })
    } else {
      setFocusedInstanceView(null)
    }
    return () => {
      setFocusedInstanceView(null)
    }
  }, [selectedEngineId, selectedVersion])

  useEffect(() => {
    const versionStr = selectedVersion ?? ''
    document.documentElement.setAttribute('data-engine', selectedEngineId)
    document.documentElement.setAttribute('data-version', versionStr)
    document.documentElement.dataset.engine = selectedEngineId
    document.documentElement.dataset.version = versionStr

    const rootEl = document.getElementById('root')
    if (rootEl) {
      rootEl.setAttribute('data-engine', selectedEngineId)
      rootEl.setAttribute('data-version', versionStr)
      rootEl.dataset.engine = selectedEngineId
      rootEl.dataset.version = versionStr
    }
  }, [selectedEngineId, selectedVersion])

  const descriptionHtml = useMemo(() => {
    const source =
      descriptionTab === 'general'
        ? ENGINE_DESCRIPTIONS[selectedEngineId]
        : selectedRelease?.body?.trim() ?? ''

    if (!source) return ''

    return marked.parse(source, {
      async: false,
      gfm: true,
    }) as string
  }, [descriptionTab, selectedEngineId, selectedRelease])

  const descriptionTitle = useMemo(() => {
    if (descriptionTab === 'general') {
      return `About ${currentEngine.name}`
    }
    return selectedVersion
      ? `${selectedVersion} release notes`
      : 'Version description'
  }, [descriptionTab, currentEngine.name, selectedVersion])

  const handleMarkdownClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const anchor = (event.target as HTMLElement).closest('a')
    if (!anchor) return

    const href = anchor.getAttribute('href')
    if (!href || !/^https?:\/\//i.test(href)) return

    event.preventDefault()
    void initHost().openUrl(href)
  }, [])

  const triggerInstallRequest = useCallback((version: string) => {
    setInstallRequest({
      version,
      requestedAt: Date.now(),
    })
  }, [])

  const busyPhase: EngineInstallVisualPhase =
    selectedTask?.status === 'extracting'
      ? 'extracting'
      : selectedTask?.status === 'canceling'
        ? 'canceling'
        : 'downloading'

  const busyLabel =
    selectedTask?.status === 'extracting'
      ? 'Extracting'
      : selectedTask?.status === 'canceling'
        ? 'Canceling'
        : 'Downloading'

  const busyDetail =
    selectedTask?.currentFile ||
    selectedTask?.statusText ||
    selectedTask?.assetName ||
    ''

  return {
    descriptionTab,
    setDescriptionTab,
    isTranslationActive,
    setIsTranslationActive,
    isInstallStarting,
    recommendedAsset,
    descriptionHtml,
    descriptionTitle,
    handleMarkdownClick,
    triggerInstallRequest,
    busyPhase,
    busyLabel,
    busyDetail,
  }
}
