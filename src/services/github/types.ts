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

export interface GitHubCacheEntry {
  timestamp: number
  releases: GitHubRelease[]
}
