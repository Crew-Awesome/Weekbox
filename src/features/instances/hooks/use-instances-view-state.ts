import { useState, useEffect, useMemo, useCallback } from 'react'
import { marked } from 'marked'
import { initHost } from '@/core/host'
import {
  getCompatibleAsset,
  setFocusedInstanceView,
  type EngineId,
  type GitHubRelease,
  type EngineDownloadTask,
  type EnginePlatform,
} from '@/core/engines'
import type { InstalledModRecord } from '@/core/mods'
import { ENGINE_DESCRIPTIONS } from '../descriptions'
import type { EngineInstallVisualPhase } from '../components/EngineInstallVisual'
import type { InstanceDisplayDefinition } from './use-executable-instances'

interface UseInstancesViewStateProps {
  selectedEngineId: EngineId
  currentEngine: InstanceDisplayDefinition
  selectedVersion: string | null
  selectedRelease: GitHubRelease | undefined
  selectedTask: EngineDownloadTask | undefined
  platform: EnginePlatform
  isExecutableInstance?: boolean
  executableMod?: InstalledModRecord | null
}

const INSTALL_STARTING_MIN_MS = 260

export function useInstancesViewState({
  selectedEngineId,
  currentEngine,
  selectedVersion,
  selectedRelease,
  selectedTask,
  platform,
  isExecutableInstance = false,
  executableMod = null,
}: UseInstancesViewStateProps) {
  const [descriptionTab, setDescriptionTab] = useState<'general' | 'version'>('general')
  const [isTranslationActive, setIsTranslationActive] = useState(false)
  const [installRequest, setInstallRequest] = useState<{
    version: string
    requestedAt: number
  } | null>(null)

  const isTerminalTask =
    selectedTask?.status === 'error' ||
    selectedTask?.status === 'completed' ||
    selectedTask?.status === 'canceling'
  const isInstallStarting = Boolean(
    installRequest?.version === selectedVersion && !isTerminalTask,
  )

  const recommendedAsset = useMemo(() => {
    return getCompatibleAsset(selectedRelease?.assets ?? [], platform)
  }, [selectedRelease?.assets, platform])

  useEffect(() => {
    if (!installRequest) return
    const elapsed = Date.now() - installRequest.requestedAt
    const remaining = Math.max(0, INSTALL_STARTING_MIN_MS - elapsed)
    const timeout = window.setTimeout(() => setInstallRequest(null), remaining)
    return () => window.clearTimeout(timeout)
  }, [installRequest])

  useEffect(() => {
    if (!isExecutableInstance && selectedVersion) {
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
  }, [isExecutableInstance, selectedEngineId, selectedVersion])

  useEffect(() => {
    const versionStr = selectedVersion ?? ''
    const dataEngine = isExecutableInstance ? currentEngine.id : selectedEngineId
    document.documentElement.setAttribute('data-engine', dataEngine)
    document.documentElement.setAttribute('data-version', versionStr)
    document.documentElement.dataset.engine = dataEngine
    document.documentElement.dataset.version = versionStr

    const rootEl = document.getElementById('root')
    if (rootEl) {
      rootEl.setAttribute('data-engine', dataEngine)
      rootEl.setAttribute('data-version', versionStr)
      rootEl.dataset.engine = dataEngine
      rootEl.dataset.version = versionStr
    }
  }, [isExecutableInstance, currentEngine.id, selectedEngineId, selectedVersion])

  const descriptionHtml = useMemo(() => {
    if (isExecutableInstance) {
      if (executableMod?.htmlBody?.trim()) {
        return executableMod.htmlBody
      }
      const modDesc = executableMod?.description?.trim() ?? ''
      if (!modDesc) return ''
      return marked.parse(modDesc, {
        async: false,
        gfm: true,
      }) as string
    }

    const source =
      descriptionTab === 'general'
        ? ENGINE_DESCRIPTIONS[selectedEngineId]
        : selectedRelease?.body?.trim() ?? ''

    if (!source) return ''

    return marked.parse(source, {
      async: false,
      gfm: true,
    }) as string
  }, [
    isExecutableInstance,
    executableMod,
    descriptionTab,
    selectedEngineId,
    selectedRelease,
  ])

  const descriptionTitle = useMemo(() => {
    if (isExecutableInstance || descriptionTab === 'general') {
      return `About ${currentEngine.name}`
    }
    return selectedVersion
      ? `${selectedVersion} release notes`
      : 'Version description'
  }, [isExecutableInstance, descriptionTab, currentEngine.name, selectedVersion])

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
