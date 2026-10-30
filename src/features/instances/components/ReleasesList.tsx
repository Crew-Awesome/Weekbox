import React, { useState, useMemo } from 'react'
import { getRecommendedAsset } from '@/core/engines'
import { formatDate, formatFileSize } from '@/utils/formatters'
import type {
  EngineDownloadTask,
  GitHubRelease,
  GitHubReleaseAsset,
  InstalledEngineVersion,
} from '@/core/engines'

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
            const isDownloading =
              task &&
              (task.status === 'downloading' ||
                task.status === 'extracting' ||
                task.status === 'canceling')

            const recommendedAsset = getRecommendedAsset(release.assets)
            const selectedAssetId =
              selectedAssetPerRelease[release.id] ?? recommendedAsset?.id
            const activeAsset =
              release.assets.find((a) => a.id === selectedAssetId) ||
              recommendedAsset ||
              release.assets[0]

            const isExpanded = Boolean(expandedChangelog[release.id])

            return (
              <div
                key={release.id}
                className="w-full rounded-2xl border p-4 sm:p-5 transition-shadow duration-200"
                style={{
                  backgroundColor: 'var(--md-sys-color-surface-container)',
                  borderColor: isInstalled
                    ? 'var(--md-sys-color-outline)'
                    : 'var(--md-sys-color-outline-variant)',
                }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor: isInstalled
                          ? 'var(--md-sys-color-secondary-container)'
                          : 'var(--md-sys-color-surface-container-high)',
                        color: isInstalled
                          ? 'var(--md-sys-color-on-secondary-container)'
                          : 'var(--md-sys-color-primary)',
                      }}
                    >
                      <span className="material-symbols-rounded text-xl">
                        {isInstalled ? 'task_alt' : 'download'}
                      </span>
                    </div>

                    <div className="flex flex-col min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className="font-bold text-base tracking-tight"
                          style={{ color: 'var(--md-sys-color-on-surface)' }}
                        >
                          {release.name || release.tagName}
                        </span>

                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-mono font-semibold"
                          style={{
                            backgroundColor:
                              'var(--md-sys-color-surface-container-highest)',
                            color: 'var(--md-sys-color-on-surface-variant)',
                          }}
                        >
                          {release.tagName}
                        </span>

                        {isLatest && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                            Latest
                          </span>
                        )}

                        {release.prerelease && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-500 border border-amber-500/30">
                            Pre-release
                          </span>
                        )}

                        {isInstalled && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-500 flex items-center gap-1">
                            <span className="material-symbols-rounded text-xs">
                              check
                            </span>
                            Installed
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs mt-1 text-[var(--md-sys-color-on-surface-variant)]">
                        <span>Released: {formatDate(release.publishedAt)}</span>
                        <span>•</span>
                        <span>{release.assets.length} binary assets</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                    {release.assets.length > 1 && !isDownloading && (
                      <select
                        value={activeAsset?.id}
                        onChange={(e) => {
                          const newId = Number(e.target.value)
                          setSelectedAssetPerRelease((prev) => ({
                            ...prev,
                            [release.id]: newId,
                          }))
                        }}
                        className="px-2.5 py-1.5 rounded-xl text-xs font-medium border outline-none cursor-pointer max-w-[160px] truncate"
                        style={{
                          backgroundColor:
                            'var(--md-sys-color-surface-container-high)',
                          borderColor: 'var(--md-sys-color-outline-variant)',
                          color: 'var(--md-sys-color-on-surface)',
                        }}
                        title="Select downloadable asset"
                      >
                        {release.assets.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name} ({formatFileSize(a.size)})
                          </option>
                        ))}
                      </select>
                    )}

                    {isDownloading ? (
                      <div className="flex items-center gap-2">
                        {task?.status !== 'extracting' && task?.status !== 'canceling' ? (
                          <m3e-button
                            variant="outlined"
                            onClick={() => onCancelDownload(release.tagName)}
                            style={{
                              cursor: 'pointer',
                              color: 'rgb(244, 63, 94)',
                            }}
                          >
                            <span
                              slot="icon"
                              className="material-symbols-rounded text-base flex items-center justify-center leading-none text-rose-500"
                            >
                              close
                            </span>
                            <span>Cancel</span>
                          </m3e-button>
                        ) : task?.status === 'canceling' ? (
                          <span className="text-xs font-semibold text-rose-500">Canceling...</span>
                        ) : null}
                      </div>
                    ) : (
                      <m3e-button
                        variant={isInstalled ? 'tonal' : 'filled'}
                        onClick={() => {
                          if (activeAsset) {
                            onDownload(release, activeAsset)
                          }
                        }}
                        disabled={!activeAsset}
                        style={{ cursor: activeAsset ? 'pointer' : 'default' }}
                      >
                        <span
                          slot="icon"
                          className="material-symbols-rounded text-base flex items-center justify-center leading-none"
                        >
                          {isInstalled ? 'replay' : 'download'}
                        </span>
                        <span>
                          {isInstalled
                            ? 'Reinstall'
                            : activeAsset
                              ? `Download (${formatFileSize(activeAsset.size)})`
                              : 'No Assets'}
                        </span>
                      </m3e-button>
                    )}
                  </div>
                </div>

                {isDownloading && task && (
                  <div
                    className="mt-3.5 p-3 rounded-xl border flex flex-col gap-2"
                    style={{
                      backgroundColor:
                        'var(--md-sys-color-surface-container-high)',
                      borderColor: 'var(--md-sys-color-outline-variant)',
                    }}
                  >
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span style={{ color: 'var(--md-sys-color-on-surface)' }}>
                        {task.status === 'extracting'
                          ? 'Extracting engine archive...'
                          : `Downloading ${task.assetName}`}
                      </span>
                      <span style={{ color: 'var(--md-sys-color-primary)' }}>
                        {task.status === 'extracting'
                          ? 'Processing'
                          : `${Math.round(task.progress)}% • ${task.speed}`}
                      </span>
                    </div>

                    <m3e-linear-progress-indicator
                      variant="wavy"
                      value={Math.max(0, Math.min(100, Math.round(task.progress)))}
                      max="100"
                      mode={task.status === 'extracting' ? 'indeterminate' : 'determinate'}
                      style={
                        {
                          width: '100%',
                          display: 'block',
                          '--m3e-linear-progress-indicator-thickness': '4.5px',
                          '--m3e-linear-wavy-progress-indicator-amplitude': '2.5px',
                          '--m3e-linear-wavy-progress-indicator-wavelength': '18px',
                          '--m3e-progress-indicator-color': 'var(--md-sys-color-primary)',
                          '--m3e-progress-indicator-track-color':
                            'color-mix(in srgb, var(--md-sys-color-outline-variant) 40%, transparent)',
                        } as React.CSSProperties
                      }
                    />

                    <div className="flex items-center justify-between text-[11px] text-[var(--md-sys-color-on-surface-variant)]">
                      <span>
                        {formatFileSize(task.downloaded)} of{' '}
                        {formatFileSize(task.total)}
                      </span>
                      <span>{task.statusText}</span>
                    </div>

                    {task.currentFile && (
                      <div
                        className="flex items-center gap-1.5 min-w-0 text-[11px] font-mono text-[var(--md-sys-color-on-surface-variant)]"
                        title={task.currentFile}
                      >
                        <span className="material-symbols-rounded text-[13px] shrink-0">
                          draft
                        </span>
                        <span className="truncate">{task.currentFile}</span>
                      </div>
                    )}
                  </div>
                )}

                {release.body && (
                  <div className="mt-3 pt-2.5 border-t border-[var(--md-sys-color-outline-variant)]/40">
                    <button
                      type="button"
                      onClick={() => toggleChangelog(release.id)}
                      className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer hover:underline"
                      style={{ color: 'var(--md-sys-color-primary)' }}
                    >
                      <span className="material-symbols-rounded text-sm">
                        {isExpanded ? 'expand_less' : 'expand_more'}
                      </span>
                      <span>
                        {isExpanded ? 'Hide release notes' : 'View release notes'}
                      </span>
                    </button>

                    {isExpanded && (
                      <div
                        className="mt-2 p-3 rounded-xl text-xs font-mono whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto"
                        style={{
                          backgroundColor:
                            'var(--md-sys-color-surface-container-highest)',
                          color: 'var(--md-sys-color-on-surface-variant)',
                        }}
                      >
                        {release.body}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
