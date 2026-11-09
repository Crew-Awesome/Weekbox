import React, { useState, useMemo } from 'react'
import type {
  EngineDownloadTask,
  GitHubRelease,
  GitHubReleaseAsset,
  InstalledEngineVersion,
} from '@/core/engines'
import { ReleaseCard } from './ReleaseCard'

interface ReleasesListProps {
  releases: GitHubRelease[]
  isLoading: boolean
  error: string | null
  installedMap: Map<string, InstalledEngineVersion>
  downloadTasks: Record<string, EngineDownloadTask>
  onDownload: (release: GitHubRelease, asset: GitHubReleaseAsset) => void
  onCancelDownload: (version: string) => void
  onRetry: () => void
}

export const ReleasesList: React.FC<ReleasesListProps> = ({
  releases,
  isLoading,
  error,
  installedMap,
  downloadTasks,
  onDownload,
  onCancelDownload,
  onRetry,
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedChangelog, setExpandedChangelog] = useState<Record<number, boolean>>({})
  const [selectedAssetPerRelease, setSelectedAssetPerRelease] = useState<Record<number, number>>({})

  const filteredReleases = useMemo(() => {
    if (!searchQuery.trim()) return releases
    const q = searchQuery.toLowerCase().trim()
    return releases.filter(
      (r) =>
        r.tagName.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        r.body.toLowerCase().includes(q),
    )
  }, [releases, searchQuery])

  const toggleChangelog = (releaseId: number) => {
    setExpandedChangelog((prev) => ({
      ...prev,
      [releaseId]: !prev[releaseId],
    }))
  }

  if (isLoading) {
    return (
      <div className="w-full flex flex-col gap-4 py-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="w-full h-32 rounded-2xl animate-pulse"
            style={{
              backgroundColor: 'var(--md-sys-color-surface-container)',
            }}
          />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div
        className="w-full flex flex-col items-center justify-center p-8 rounded-3xl border border-dashed text-center min-h-[220px]"
        style={{
          borderColor: 'var(--md-sys-color-error)',
          backgroundColor: 'var(--md-sys-color-error-container)',
          color: 'var(--md-sys-color-on-error-container)',
        }}
      >
        <span className="material-symbols-rounded text-4xl mb-2">cloud_off</span>
        <h3 className="text-base font-bold">Failed to load releases from GitHub</h3>
        <p className="text-xs sm:text-sm mt-1 max-w-md opacity-90">{error}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer hover:opacity-90 shadow-sm"
          style={{
            backgroundColor: 'var(--md-sys-color-error)',
            color: 'var(--md-sys-color-on-error)',
          }}
        >
          Retry Connection
        </button>
      </div>
    )
  }

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div
          className="flex-1 flex items-center gap-2.5 px-3.5 py-2 rounded-2xl border"
          style={{
            backgroundColor: 'var(--md-sys-color-surface-container-high)',
            borderColor: 'var(--md-sys-color-outline-variant)',
          }}
        >
          <span
            className="material-symbols-rounded text-lg"
            style={{ color: 'var(--md-sys-color-on-surface-variant)' }}
          >
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter GitHub versions (e.g. 1.0.4, v0.8)..."
            className="w-full bg-transparent border-none outline-none text-xs sm:text-sm"
            style={{ color: 'var(--md-sys-color-on-surface)' }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="p-1 rounded-full hover:bg-[var(--md-sys-color-surface-container-highest)] cursor-pointer text-xs"
              style={{ color: 'var(--md-sys-color-on-surface-variant)' }}
            >
              <span className="material-symbols-rounded text-base">close</span>
            </button>
          )}
        </div>
      </div>

      {filteredReleases.length === 0 ? (
        <div
          className="w-full flex flex-col items-center justify-center p-8 rounded-2xl border border-dashed text-center min-h-[180px]"
          style={{
            borderColor: 'var(--md-sys-color-outline-variant)',
            color: 'var(--md-sys-color-on-surface-variant)',
          }}
        >
          <span className="material-symbols-rounded text-3xl mb-1.5 opacity-60">
            search_off
          </span>
          <p className="text-sm font-medium">No releases found matching your search</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredReleases.map((release, index) => {
            const isLatest = index === 0 && !release.prerelease
            const isInstalled =
              installedMap.has(release.tagName) || installedMap.has(release.name)
            const task = downloadTasks[release.tagName]
            const isExpanded = Boolean(expandedChangelog[release.id])

            return (
              <ReleaseCard
                key={release.id}
                release={release}
                isLatest={isLatest}
                isInstalled={isInstalled}
                task={task}
                selectedAssetId={selectedAssetPerRelease[release.id]}
                isExpanded={isExpanded}
                onSelectAsset={(newId) => {
                  setSelectedAssetPerRelease((prev) => ({
                    ...prev,
                    [release.id]: newId,
                  }))
                }}
                onToggleChangelog={() => toggleChangelog(release.id)}
                onDownload={onDownload}
                onCancelDownload={onCancelDownload}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
