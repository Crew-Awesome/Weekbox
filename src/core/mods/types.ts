import type {
  ModItem,
  GameBananaFile,
  ModCreditGroup,
  ModCreditAuthor,
} from '@/ui/mod-details-modal/types'

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
  visible?: boolean
  kind?: 'mod' | 'addon' | 'dependency' | 'engine' | string
  categoryId?: number
  source?: string
  sourceUrl?: string
  downloadUrl?: string
  engineLocked?: boolean
  engineId?: string
  engineName?: string
  engineVersion?: string | null
  defaultEngineId?: string
  defaultEngineName?: string
  engineFolderName?: string
  iconPath?: string | null
  coverPath?: string | null
  localCoverPath?: string
  coverFallback?: string | null
  exePath?: string
  tags?: string[]
  lastPlayedAt?: number
  gameBananaId?: string | number | null
  gameBananaType?: string | null
  providerSource?: string | null
  providerId?: string | number | null
  providerType?: string | null
  providerUrl?: string | null
  description?: string
  htmlBody?: string
  author?: string
  userPfp?: string
  userPfpPath?: string
  localUserPfp?: string
  authors?: ModCreditAuthor[]
  credits?: ModCreditGroup[]
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
  hasEngineWarning?: boolean
  engineWarningMessage?: string
  meta?: {
    link?: string
    [key: string]: unknown
  }
  views?: number
  likes?: number
  followers?: number
  downloads?: number
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
