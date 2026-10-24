import React from 'react'
import { formatFileSize, type ModItem, type GameBananaFile } from '../types'

interface ModDetailsTabProps {
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

/**
 * Displays downloadable mod files, statistics, and external references.
 */
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

  const getFileTimestamp = (val?: number | string) => {
    if (!val) return 0
    if (typeof val === 'number') return val < 10_000_000_000 ? val * 1000 : val
    const t = new Date(val).getTime()
    return isNaN(t) ? 0 : t
  }

  return (
    <div className={`flex flex-col gap-6 pb-6 ${className}`}>
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-[var(--wb-primary)] uppercase tracking-wider">
            <span className="material-symbols-rounded text-base">storage</span>
            <span>Available Downloads ({files.length})</span>
          </div>
        </div>

        {files.length === 0 ? (
          <div className="p-6 rounded-2xl bg-[var(--wb-surface-bright)]/40 border border-[var(--wb-outline-variant)]/20 text-center text-sm text-[var(--wb-on-surface-variant)] flex flex-col items-center justify-center gap-2">
            <span className="material-symbols-rounded text-3xl opacity-40 mb-1">
              storage
            </span>
            <span className="font-semibold">No downloads available</span>
            <span className="text-xs opacity-70">
              No downloadable files reported for this mod.
            </span>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {files.map((file, idx) => {
              const task = downloadTasks[String(file._idRow)]
              const prog = task?.progress
              const isDownloading = prog !== undefined && prog >= 0 && prog < 100
              const isCompleted = prog === 100
              const installedTime = getFileTimestamp(displayCard.installedAt)
              const fileTime = getFileTimestamp(
                file._tsDateAdded || file.date || file._tsDateModified,
              )
              const fileHasUpdate =
                isInstalled && installedTime > 0 && fileTime > installedTime + 60000

              const isFileInstalled =
                (isInstalled &&
                  (String(displayCard.downloadedFileId) === String(file._idRow) ||
                    String(displayCard.installedFileId) === String(file._idRow) ||
                    files.length === 1)) ||
                isCompleted

              return (
                <div
                  key={file._idRow || `file-${idx}`}
                  className="flex flex-col gap-2.5 p-3.5 rounded-xl bg-[var(--wb-surface-bright)]/60 border border-[var(--wb-outline-variant)]/20 hover:border-[var(--wb-primary)]/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-bold text-[var(--wb-on-surface)] truncate">
                        {file._sFile}
                      </span>
                      {file._sDescription && (
                        <span className="text-xs text-[var(--wb-on-surface-variant)] mt-1 break-words opacity-90">
                          {file._sDescription}
                        </span>
                      )}
                    </div>

                    {file._sDownloadUrl &&
                      (isFileInstalled ? (
                        <div className="shrink-0 flex items-center gap-2">
                          {fileHasUpdate && onDownloadFile && (
                            <m3e-button
                              variant="tonal"
                              onClick={() =>
                                onDownloadFile(
                                  file._sDownloadUrl!,
                                  String(file._idRow),
                                )
                              }
                              disabled={isDownloading}
                              className={`flex items-center gap-1 text-xs font-bold ${
                                isDownloading
                                  ? 'bg-amber-500/20 text-amber-300 cursor-wait'
                                  : 'bg-amber-500 hover:bg-amber-400 text-black cursor-pointer shadow-sm'
                              }`}
                              title="Update to this version"
                            >
                              {isDownloading ? (
                                <>
                                  <span className="material-symbols-rounded text-sm animate-spin shrink-0">
                                    progress_activity
                                  </span>
                                  <span>{prog}%</span>
                                </>
                              ) : (
                                <>
                                  <span className="material-symbols-rounded text-sm shrink-0">
                                    refresh
                                  </span>
                                  <span>Update</span>
                                </>
                              )}
                            </m3e-button>
                          )}
                          <m3e-button
                            variant="filled"
                            onClick={() => onManageFile?.(file)}
                            className="text-xs font-bold"
                          >
                            <span className="material-symbols-rounded text-sm shrink-0">
                              play_arrow
                            </span>
                            <span>Play</span>
                          </m3e-button>
                        </div>
                      ) : onDownloadFile ? (
                        <m3e-button
                          variant="filled"
                          onClick={() => {
                            if (isDownloading && onCancelDownload) {
                              onCancelDownload(String(file._idRow))
                            } else {
                              onDownloadFile(
                                file._sDownloadUrl!,
                                String(file._idRow),
                              )
                            }
                          }}
                          className="shrink-0 text-xs font-bold"
                          title={isDownloading ? 'Click to cancel download' : 'Download file'}
                        >
                          {isDownloading ? (
                            prog <= 1 ? (
                              <>
                                <m3e-circular-progress-indicator
                                  variant="wavy"
                                  indeterminate
                                  style={
                                    {
                                      '--m3e-circular-wavy-progress-indicator-diameter':
                                        '16px',
                                      '--m3e-circular-progress-indicator-thickness':
                                        '2.5px',
                                      '--m3e-circular-wavy-progress-indicator-amplitude':
                                        '1.2px',
                                      '--m3e-circular-wavy-progress-indicator-wavelength':
                                        '8px',
                                      '--m3e-progress-indicator-color':
                                        'var(--md-sys-color-on-primary)',
                                    } as React.CSSProperties
                                  }
                                />
                                <span>Starting...</span>
                              </>
                            ) : (
                              <>
                                <span className="material-symbols-rounded text-sm animate-spin shrink-0">
                                  progress_activity
                                </span>
                                <span>{prog}%</span>
                              </>
                            )
                          ) : (
                            <>
                              <span className="material-symbols-rounded text-sm shrink-0">
                                download
                              </span>
                              <span>Download</span>
                            </>
                          )}
                        </m3e-button>
                      ) : null)}
                  </div>

                  <div className="flex items-center gap-4 flex-wrap text-xs text-[var(--wb-on-surface-variant)] opacity-80 pt-2 border-t border-[var(--wb-outline-variant)]/15">
                    <span className="font-semibold text-[var(--wb-on-surface)]">
                      {formatFileSize(file._nFilesize)}
                    </span>
                    <span>
                      {file._nDownloadCount
                        ? `${Intl.NumberFormat().format(file._nDownloadCount)} downloads`
                        : '0 downloads'}
                    </span>
                    {file._tsDateAdded && (
                      <span>Added {formatDate(file._tsDateAdded)}</span>
                    )}
                    {file._sAnalysisState && (
                      <span className="flex items-center gap-1 text-emerald-400 font-medium">
                        <span className="material-symbols-rounded text-xs shrink-0">
                          verified_user
                        </span>
                        {file._sAnalysisState === 'passed'
                          ? 'Clean / Verified'
                          : file._sAnalysisState}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <div className="flex flex-col p-3 rounded-xl bg-[var(--wb-surface-bright)]/60 border border-[var(--wb-outline-variant)]/20">
            <div className="flex items-center gap-1.5 text-xs text-[var(--wb-on-surface-variant)] mb-1">
              <span className="material-symbols-rounded text-sm text-[var(--wb-primary)]">
                calendar_today
              </span>
              <span>Uploaded</span>
            </div>
            <span
              className="text-sm font-semibold text-[var(--wb-on-surface)] truncate"
              title={
                formatFullDate ? formatFullDate(displayCard.submittedAt) : undefined
              }
            >
              {formatDate(displayCard.submittedAt)}
            </span>
          </div>

          <div className="flex flex-col p-3 rounded-xl bg-[var(--wb-surface-bright)]/60 border border-[var(--wb-outline-variant)]/20">
            <div className="flex items-center gap-1.5 text-xs text-[var(--wb-on-surface-variant)] mb-1">
              <span className="material-symbols-rounded text-sm text-[var(--wb-primary)]">
                refresh
              </span>
              <span>Last Updated</span>
            </div>
            <span
              className="text-sm font-semibold text-[var(--wb-on-surface)] truncate"
              title={
                formatFullDate ? formatFullDate(displayCard.updatedAt) : undefined
              }
            >
              {displayCard.updatedAt ? formatDate(displayCard.updatedAt) : 'Never'}
            </span>
          </div>

          {displayCard.installedAt && (
            <div className="flex flex-col p-3 rounded-xl bg-[var(--wb-surface-bright)]/60 border border-[var(--wb-outline-variant)]/20">
              <div className="flex items-center gap-1.5 text-xs text-[var(--wb-on-surface-variant)] mb-1">
                <span className="material-symbols-rounded text-sm text-[var(--wb-primary)]">
                  storage
                </span>
                <span>Installed</span>
              </div>
              <span
                className="text-sm font-semibold text-[var(--wb-on-surface)] truncate"
                title={
                  formatFullDate
                    ? formatFullDate(displayCard.installedAt)
                    : undefined
                }
              >
                {formatDate(displayCard.installedAt)}
              </span>
            </div>
          )}

          <div className="flex flex-col p-3 rounded-xl bg-[var(--wb-surface-bright)]/60 border border-[var(--wb-outline-variant)]/20">
            <div className="flex items-center gap-1.5 text-xs text-[var(--wb-on-surface-variant)] mb-1">
              <span className="material-symbols-rounded text-sm text-[var(--wb-primary)]">
                layers
              </span>
              <span>Updates</span>
            </div>
            <span className="text-sm font-semibold text-[var(--wb-on-surface)]">
              {updatesCount} {updatesCount === 1 ? 'update' : 'updates'}
            </span>
          </div>

          <div className="flex flex-col p-3 rounded-xl bg-[var(--wb-surface-bright)]/60 border border-[var(--wb-outline-variant)]/20">
            <div className="flex items-center gap-1.5 text-xs text-[var(--wb-on-surface-variant)] mb-1">
              <span className="material-symbols-rounded text-sm text-[var(--wb-primary)]">
                visibility
              </span>
              <span>Views</span>
            </div>
            <span className="text-sm font-semibold text-[var(--wb-on-surface)]">
              {displayCard.views !== undefined
                ? Intl.NumberFormat().format(displayCard.views)
                : 'N/A'}
            </span>
          </div>

          <div className="flex flex-col p-3 rounded-xl bg-[var(--wb-surface-bright)]/60 border border-[var(--wb-outline-variant)]/20">
            <div className="flex items-center gap-1.5 text-xs text-[var(--wb-on-surface-variant)] mb-1">
              <span className="material-symbols-rounded text-sm text-[var(--wb-primary)]">
                favorite
              </span>
              <span>Likes</span>
            </div>
            <span className="text-sm font-semibold text-[var(--wb-on-surface)]">
              {displayCard.likes !== undefined
                ? Intl.NumberFormat().format(displayCard.likes)
                : 'N/A'}
            </span>
          </div>

          <div className="flex flex-col p-3 rounded-xl bg-[var(--wb-surface-bright)]/60 border border-[var(--wb-outline-variant)]/20">
            <div className="flex items-center gap-1.5 text-xs text-[var(--wb-on-surface-variant)] mb-1">
              <span className="material-symbols-rounded text-sm text-[var(--wb-primary)]">
                download
              </span>
              <span>Downloads</span>
            </div>
            <span className="text-sm font-semibold text-[var(--wb-on-surface)]">
              {displayCard.downloads !== undefined
                ? Intl.NumberFormat().format(displayCard.downloads)
                : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <a
            href={`https://gamebanana.com/mods/${displayCard.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3 rounded-xl bg-[var(--wb-surface-bright)]/60 hover:bg-[var(--wb-surface-bright)] border border-[var(--wb-outline-variant)]/20 transition-all text-xs text-[var(--wb-on-surface)] font-semibold group"
          >
            <div className="flex items-center gap-2.5">
              <img
                src="/imgs/icons/app/gamebanana.webp"
                alt="GameBanana"
                className="w-4 h-4 object-contain opacity-80"
              />
              <span>GameBanana Mod Page</span>
            </div>
            <span className="material-symbols-rounded text-sm text-[var(--wb-on-surface-variant)] group-hover:text-[var(--wb-primary)] transition-colors">
              open_in_new
            </span>
          </a>

          {engineName && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--wb-surface-bright)]/60 border border-[var(--wb-outline-variant)]/20 text-xs text-[var(--wb-on-surface-variant)]">
              <span>Engine</span>
              <span className="font-semibold text-[var(--wb-on-surface)]">
                {engineName}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--wb-surface-bright)]/60 border border-[var(--wb-outline-variant)]/20 text-xs text-[var(--wb-on-surface-variant)]">
            <span>ID</span>
            <span className="font-mono font-bold text-[var(--wb-on-surface)]">
              #{displayCard.id}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
