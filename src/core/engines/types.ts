export type EngineId = 'vslice' | 'psych' | 'codename' | 'pslice' | 'fpsplus' | 'psychonline'

export interface EngineDefinition {
  id: EngineId
  categoryId: number
  name: string
  repo: string
  icon: string
  banner?: string
  description: string
  accent: string
  defaultExeName: string
}

export interface GitHubReleaseAsset {
  id: number
  name: string
  size: number
  downloadUrl: string
  contentType: string
  downloadCount?: number
  updatedAt?: string
}

export interface GitHubRelease {
  id: number
  tagName: string
  name: string
  body: string
  publishedAt: string
  prerelease: boolean
  draft: boolean
  assets: GitHubReleaseAsset[]
  htmlUrl: string
}

export interface InstalledEngineVersion {
  version: string
  tag: string
  name: string
  releaseId?: number
  assetName?: string
  assetSize?: number
  downloadUrl?: string
  installPath: string
  executablePath?: string
  installedAt: number
  isDefault?: boolean
}

export interface DayPlaytimeStat {
  date: string
  playtimeSeconds: number
  launchCount: number
}

export interface WeekPlaytimeStat {
  weekNumber: number
  weekLabel: string
  playtimeSeconds: number
  launchCount: number
  days: Record<string, DayPlaytimeStat>
}

export interface MonthPlaytimeStat {
  monthKey: string
  year: number
  month: number
  playtimeSeconds: number
  launchCount: number
  weeks: Record<string, WeekPlaytimeStat>
}

export interface EnginePlaytimeStats {
  totalSeconds: number
  totalLaunches: number
  months: Record<string, MonthPlaytimeStat>
}

export interface EngineRecord {
  engineId: EngineId
  activeVersion?: string | null
  installedVersions: InstalledEngineVersion[]
  lastChecked?: number | null
  latestVersion?: string | null
  playtimeSeconds?: number
  launchCount?: number
  playtimeStats?: EnginePlaytimeStats
}

export interface EngineUpdateStateData {
  lastChecked: number | null
  engines: Partial<Record<EngineId, EngineRecord>>
}

export type EngineDownloadPhase =
  | 'idle'
  | 'downloading'
  | 'extracting'
  | 'canceling'
  | 'completed'
  | 'error'

export interface EngineDownloadProgress {
  progress: number
  downloaded: number
  total: number
  speed: string
  statusText?: string
  currentFile?: string
}

export interface EngineDownloadTask {
  taskKey: string
  engineId: EngineId
  version: string
  assetName: string
  downloadUrl: string
  progress: number
  downloaded: number
  total: number
  speed: string
  status: EngineDownloadPhase
  statusText?: string
  currentFile?: string
  error?: string
  installPath?: string
  calloutId?: string
}

export interface StartEngineDownloadParams {
  engineId: EngineId
  release: GitHubRelease
  asset: GitHubReleaseAsset
  onProgress?: (progress: EngineDownloadProgress) => void
  onComplete?: (installed: InstalledEngineVersion) => void
  onError?: (err: Error) => void
}
