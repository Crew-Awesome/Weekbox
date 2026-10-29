import React from 'react'
import type { ModItem, GameBananaFile } from '../../types'
import { ModDownloadList } from './ModDownloadList'
import { ModStatsGrid } from './ModStatsGrid'
import { ModExternalLinks } from './ModExternalLinks'

export interface ModDetailsTabProps {
  displayCard: ModItem
  engineName?: string
  formatDate: (timestamp?: number | string) => string
  formatFullDate?: (timestamp?: number | string) => string
  onDownloadFile?: (url: string, id: string) => void
  onCancelDownload?: (id: string) => void
  onManageFile?: (file?: GameBananaFile) => void
  downloadTasks?: Record<string, { progress?: number; status?: string }>
  isInstalled?: boolean
  className?: string
}

export const ModDetailsTab: React.FC<ModDetailsTabProps> = ({
  displayCard,
  engineName,
  formatDate,
  formatFullDate,
  onDownloadFile,
  onCancelDownload,
  onManageFile,
  downloadTasks = {},
  isInstalled = false,
  className = '',
}) => {
  const files: GameBananaFile[] = Array.isArray(displayCard.files)
    ? displayCard.files
    : Object.values(displayCard.files || {})
  const hasUpdates =
    displayCard.updatedAt && displayCard.updatedAt !== displayCard.submittedAt
  const updatesCount =
    displayCard.updatesCount !== undefined
      ? displayCard.updatesCount
      : displayCard.updates?.length || (hasUpdates ? 1 : 0)

  return (
    <div className={`flex flex-col gap-6 pb-6 ${className}`}>
      <ModDownloadList
        displayCard={displayCard}
        files={files}
        isInstalled={isInstalled}
        formatDate={formatDate}
        onDownloadFile={onDownloadFile}
        onCancelDownload={onCancelDownload}
        onManageFile={onManageFile}
        downloadTasks={downloadTasks}
      />

      <ModStatsGrid
        displayCard={displayCard}
        formatDate={formatDate}
        formatFullDate={formatFullDate}
        updatesCount={updatesCount}
      />

      <ModExternalLinks
        displayCard={displayCard}
        engineName={engineName}
      />
    </div>
  )
}

