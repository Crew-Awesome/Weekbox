import React from 'react'
import { formatFileSize, type ModItem, type GameBananaFile } from '../../types'
import { FileDownloadButton } from './FileDownloadButton'

interface ModDownloadListProps {
  displayCard: ModItem
  files: GameBananaFile[]
  isInstalled: boolean
  formatDate: (timestamp?: number | string) => string
  onDownloadFile?: (url: string, id: string) => void
  onCancelDownload?: (id: string) => void
  onManageFile?: (file?: GameBananaFile) => void
  downloadTasks?: Record<string, { progress?: number; status?: string }>
}

export const ModDownloadList: React.FC<ModDownloadListProps> = ({
  displayCard,
  files,
  isInstalled,
  formatDate,
  onDownloadFile,
  onCancelDownload,
  onManageFile,
  downloadTasks = {},
}) => {
  const getFileTimestamp = (val?: number | string) => {
    if (!val) return 0
    if (typeof val === 'number') return val < 10_000_000_000 ? val * 1000 : val
    const t = new Date(val).getTime()
    return isNaN(t) ? 0 : t
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold text-[var(--md-sys-color-primary)] uppercase tracking-wider">
          <span className="material-symbols-rounded text-base">storage</span>
          <span>Available Downloads ({files.length})</span>
        </div>
      </div>

      {files.length === 0 ? (
        <div className="p-6 rounded-2xl bg-[var(--md-sys-color-surface-bright)]/40 border border-[var(--md-sys-color-outline-variant)]/20 text-center text-sm text-[var(--md-sys-color-on-surface-variant)] flex flex-col items-center justify-center gap-2">
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
            const isExtracting = task?.status === 'extracting'
            const isDownloading =
              task?.status === 'downloading' ||
              (prog !== undefined && prog >= 0 && prog < 100 && !isExtracting)
            const isActive = isDownloading || isExtracting
            const isCompleted = prog === 100 || task?.status === 'completed'
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
                className="flex flex-col gap-2.5 p-3.5 rounded-xl bg-[var(--md-sys-color-surface-bright)]/60 border border-[var(--md-sys-color-outline-variant)]/20 hover:border-[var(--md-sys-color-primary)]/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-bold text-[var(--md-sys-color-on-surface)] truncate">
                      {file._sFile}
                    </span>
                    {file._sDescription && (
                      <span className="text-xs text-[var(--md-sys-color-on-surface-variant)] mt-1 break-words opacity-90">
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
                            onClick={(e: React.MouseEvent) => {
                              if (isExtracting) {
                                e.preventDefault()
                                return
                              }
                              onDownloadFile(
                                file._sDownloadUrl!,
                                String(file._idRow),
                              )
                            }}
                            className={`text-xs font-bold rounded-[12px] overflow-hidden ${
                              isActive
                                ? isExtracting
                                  ? 'cursor-default'
                                  : 'cursor-wait'
                                : 'cursor-pointer'
                            }`}
                            style={
                              {
                                '--m3e-button-shape-round': '12px',
                                '--m3e-button-icon-size': '14px',
                                '--m3e-button-icon-label-space': '6px',
                                '--m3e-button-leading-space': '12px',
                                '--m3e-button-trailing-space': '12px',
                                '--m3e-button-container-height': '32px',
                                '--m3e-button-label-text-font-size': '12px',
                                '--m3e-button-label-text-font-weight': '700',
                                '--m3e-button-label-text-line-height': '1',
                                '--m3e-button-tonal-container-color': isActive
                                  ? 'color-mix(in srgb, var(--md-sys-color-tertiary) 20%, transparent)'
                                  : 'var(--md-sys-color-tertiary)',
                                '--m3e-button-tonal-label-text-color': isActive
                                  ? 'var(--md-sys-color-tertiary)'
                                  : 'var(--md-sys-color-on-tertiary)',
                                '--m3e-button-hover-label-text-color': isActive
                                  ? 'var(--md-sys-color-tertiary)'
                                  : 'var(--md-sys-color-on-tertiary)',
                                borderRadius: '12px',
                              } as React.CSSProperties
                            }
                            title={isExtracting ? 'Extracting' : 'Update to this version'}
                          >
                            {isActive ? (
                              <>
                                <m3e-circular-progress-indicator
                                  slot="icon"
                                  variant="wavy"
                                  value={!isExtracting && prog && prog > 1 ? prog : undefined}
                                  indeterminate={isExtracting || !prog || prog <= 1}
                                  title={isExtracting ? 'Extracting' : undefined}
                                  className="shrink-0 flex items-center justify-center"
                                  style={
                                    {
                                      '--m3e-circular-wavy-progress-indicator-diameter':
                                        '14px',
                                      '--m3e-circular-flat-progress-indicator-diameter':
                                        '14px',
                                      '--m3e-circular-progress-indicator-thickness':
                                        '2px',
                                      '--m3e-circular-wavy-progress-indicator-amplitude':
                                        '1px',
                                      '--m3e-circular-wavy-progress-indicator-wavelength':
                                        '6px',
                                      '--m3e-progress-indicator-color':
                                        'currentColor',
                                      '--m3e-progress-indicator-track-color':
                                        prog && prog > 1
                                          ? 'rgba(0, 0, 0, 0.2)'
                                          : 'transparent',
                                      width: '14px',
                                      height: '14px',
                                    } as React.CSSProperties
                                  }
                                />
                                <span className="leading-none flex items-center">
                                  {isExtracting
                                    ? prog && prog > 1
                                      ? `Extracting ${prog}%`
                                      : 'Extracting...'
                                    : prog && prog > 1
                                      ? `${prog}%`
                                      : 'Starting...'}
                                </span>
                              </>
                            ) : (
                              <>
                                <span
                                  slot="icon"
                                  className="material-symbols-rounded text-sm shrink-0 leading-none flex items-center justify-center"
                                >
                                  refresh
                                </span>
                                <span className="leading-none flex items-center">Update</span>
                              </>
                            )}
                          </m3e-button>
                        )}
                        <m3e-button
                          variant="filled"
                          onClick={() => onManageFile?.(file)}
                          className="text-xs font-bold rounded-[12px] overflow-hidden cursor-pointer"
                          style={
                            {
                              '--m3e-button-shape-round': '12px',
                              '--m3e-button-icon-size': '14px',
                              '--m3e-button-icon-label-space': '6px',
                              '--m3e-button-leading-space': '12px',
                              '--m3e-button-trailing-space': '12px',
                              '--m3e-button-container-height': '32px',
                              '--m3e-button-label-text-font-size': '12px',
                              '--m3e-button-label-text-font-weight': '700',
                              '--m3e-button-label-text-line-height': '1',
                              borderRadius: '12px',
                            } as React.CSSProperties
                          }
                        >
                          <span
                            slot="icon"
                            className="material-symbols-rounded text-sm shrink-0 leading-none flex items-center justify-center"
                          >
                            play_arrow
                          </span>
                          <span className="leading-none flex items-center">Play</span>
                        </m3e-button>
                      </div>
                    ) : onDownloadFile ? (
                      <FileDownloadButton
                        file={file}
                        task={task}
                        onDownloadFile={onDownloadFile}
                        onCancelDownload={onCancelDownload}
                      />
                    ) : null)}
                </div>

                <div className="flex items-center gap-4 flex-wrap text-xs text-[var(--md-sys-color-on-surface-variant)] opacity-80 pt-2 border-t border-[var(--md-sys-color-outline-variant)]/15">
                  <span className="font-semibold text-[var(--md-sys-color-on-surface)]">
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
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
