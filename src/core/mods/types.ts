import type { ModItem, GameBananaFile } from '@/ui/mod-details-modal/types'

export type ModDownloadPhase =
  | 'download'
  | 'downloading'
  | 'extracting'
  | 'canceling'
  | 'completed'
  | 'error'

export interface DownloadProgressDetails {
  progress: number
  downloaded: number
  total: number
  speed: string
  statusText?: string
  currentFile?: string
}

export interface InstalledModRecord {
  id: string | number
  modId?: string | number
  name: string
  title?: string
  hidden?: boolean
  kind?: 'mod' | 'engine' | string
  categoryId?: number
  source?: string
  sourceUrl?: string
  downloadUrl?: string
  engineLocked?: boolean
  engineId?: string
  engineName?: string
  engineFolderName?: string
  coverPath?: string
  localCoverPath?: string
  description?: string
  htmlBody?: string
  author?: string
  userPfp?: string
  image?: string
  thumbnail?: string
  previewMedia?: string[]
  icon?: string
  categoryName?: string
  installPath: string
  folderName: string
  installedAt?: number
  updatedAt?: number | string
  submittedAt?: number | string
  downloadedFileId?: string | number
  installedFileId?: string | number
  fileName?: string
  fileSize?: number
  isExecutable?: boolean
}

export interface ModDownloadTask {
  taskKey: string
  modId: string | number
  fileId: string
  modTitle: string
  fileName: string
  url: string
  progress: number
  downloaded: number
  total: number
  speed: string
  status: ModDownloadPhase
  statusText?: string
  currentFile?: string
  error?: string
  installPath?: string
  calloutId?: string
}

export interface StartModDownloadParams {
  mod: ModItem
  file?: GameBananaFile
  url?: string
  fileId?: string
  onComplete?: (record: InstalledModRecord) => void
  onError?: (error: Error) => void
}
