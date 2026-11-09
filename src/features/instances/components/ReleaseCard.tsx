import React from 'react'
import { getRecommendedAsset } from '@/core/engines'
import { formatDate, formatFileSize } from '@/utils/formatters'
import type {
  EngineDownloadTask,
  GitHubRelease,
  GitHubReleaseAsset,
} from '@/core/engines'

export interface ReleaseCardProps {
  release: GitHubRelease
  isLatest: boolean
  isInstalled: boolean
  task?: EngineDownloadTask
  selectedAssetId?: number
  isExpanded: boolean
  onSelectAsset: (assetId: number) => void
  onToggleChangelog: () => void
  onDownload: (release: GitHubRelease, asset: GitHubReleaseAsset) => void
  onCancelDownload: (version: string) => void
}

export const ReleaseCard: React.FC<ReleaseCardProps> = ({
  release,
  isLatest,
  isInstalled,
  task,
  selectedAssetId,
  isExpanded,
  onSelectAsset,
  onToggleChangelog,
  onDownload,
  onCancelDownload,
}) => {
  const isDownloading = Boolean(
    task &&
      (task.status === 'downloading' ||
        task.status === 'extracting' ||
        task.status === 'canceling'),
  )

  const recommendedAsset = getRecommendedAsset(release.assets)
  const resolvedAssetId = selectedAssetId ?? recommendedAsset?.id
  const activeAsset =
    release.assets.find((a) => a.id === resolvedAssetId) ||
    recommendedAsset ||
    release.assets[0]

  return (
    <div
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
                  <span className="material-symbols-rounded text-xs">check</span>
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
              onChange={(e) => onSelectAsset(Number(e.target.value))}
              className="px-2.5 py-1.5 rounded-xl text-xs font-medium border outline-none cursor-pointer max-w-[160px] truncate"
              style={{
                backgroundColor: 'var(--md-sys-color-surface-container-high)',
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
                  style={{ cursor: 'pointer', color: 'rgb(244, 63, 94)' }}
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
              onClick={() => activeAsset && onDownload(release, activeAsset)}
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
            onClick={onToggleChangelog}
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
}
