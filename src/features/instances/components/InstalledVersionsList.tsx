import React from 'react'
import { formatDate } from '@/utils/formatters'
import type { InstalledEngineVersion, EngineDefinition } from '@/core/engines'

interface InstalledVersionsListProps {
  engine: EngineDefinition
  versions: InstalledEngineVersion[]
  activeVersion: string | null
  onSetDefault: (version: string) => void
  onLaunch: (version: string) => void
  onOpenFolder: (version: string) => void
  onDelete: (version: string) => void
  onGoToReleases: () => void
}

export const InstalledVersionsList: React.FC<InstalledVersionsListProps> = ({
  engine,
  versions,
  activeVersion,
  onSetDefault,
  onLaunch,
  onOpenFolder,
  onDelete,
  onGoToReleases,
}) => {
  if (versions.length === 0) {
    return (
      <div
        className="w-full flex flex-col items-center justify-center p-8 sm:p-12 rounded-3xl border border-dashed text-center min-h-[240px]"
        style={{
          borderColor: 'var(--md-sys-color-outline-variant)',
          color: 'var(--md-sys-color-on-surface-variant)',
        }}
      >
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
          style={{
            backgroundColor: 'var(--md-sys-color-surface-container-high)',
            color: 'var(--md-sys-color-primary)',
          }}
        >
          <span className="material-symbols-rounded text-3xl">download_for_offline</span>
        </div>

        <h3
          className="text-base font-bold"
          style={{ color: 'var(--md-sys-color-on-surface)' }}
        >
          No installed versions of {engine.name}
        </h3>
        <p className="text-xs sm:text-sm mt-1 max-w-md">
          Download release binaries directly from GitHub to run mods requiring this engine.
        </p>

        <m3e-button
          variant="filled"
          onClick={onGoToReleases}
          style={{ cursor: 'pointer', marginTop: '1rem' }}
        >
          <span
            slot="icon"
            className="material-symbols-rounded text-base flex items-center justify-center leading-none"
          >
            cloud_download
          </span>
          <span>Explore GitHub Releases</span>
        </m3e-button>
      </div>
    )
  }

  return (
    <div className="w-full flex flex-col gap-3">
      {versions.map((ver) => {
        const isActive = ver.version === activeVersion || Boolean(ver.isDefault)
        const hasExe = Boolean(ver.executablePath)
        const exeFileName = ver.executablePath
          ? ver.executablePath.split(/[/\\]/).pop()
          : null

        return (
          <div
            key={ver.version}
            className="w-full rounded-2xl border p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-shadow duration-200"
            style={{
              backgroundColor: 'var(--md-sys-color-surface-container)',
              borderColor: isActive
                ? 'var(--md-sys-color-primary)'
                : 'var(--md-sys-color-outline-variant)',
            }}
          >
            <div className="flex items-start gap-3.5 min-w-0">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  backgroundColor: isActive
                    ? 'var(--md-sys-color-primary-container)'
                    : 'var(--md-sys-color-surface-container-high)',
                  color: isActive
                    ? 'var(--md-sys-color-on-primary-container)'
                    : 'var(--md-sys-color-on-surface-variant)',
                }}
              >
                <span className="material-symbols-rounded text-2xl">
                  {isActive ? 'stars' : 'sports_esports'}
                </span>
              </div>

              <div className="flex flex-col min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="font-bold text-base tracking-tight"
                    style={{ color: 'var(--md-sys-color-on-surface)' }}
                  >
                    {ver.name || `${engine.name} ${ver.version}`}
                  </span>

                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-mono font-semibold"
                    style={{
                      backgroundColor:
                        'var(--md-sys-color-surface-container-highest)',
                      color: 'var(--md-sys-color-on-surface-variant)',
                    }}
                  >
                    {ver.version}
                  </span>

                  {isActive && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 flex items-center gap-1">
                      <span className="material-symbols-rounded text-xs">
                        verified
                      </span>
                      Default Version
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs mt-1 text-[var(--md-sys-color-on-surface-variant)]">
                  <span>Installed: {formatDate(ver.installedAt)}</span>
                  {exeFileName && (
                    <>
                      <span>•</span>
                      <span className="font-mono text-[11px] bg-[var(--md-sys-color-surface-container-high)] px-1.5 py-0.5 rounded">
                        {exeFileName}
                      </span>
                    </>
                  )}
                </div>

                <div
                  className="text-[11px] font-mono mt-1.5 truncate max-w-xl opacity-70"
                  title={ver.installPath}
                >
                  {ver.installPath}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              {hasExe && (
                <m3e-button
                  variant="filled"
                  onClick={() => onLaunch(ver.version)}
                  title="Launch this engine instance directly"
                  style={{ cursor: 'pointer' }}
                >
                  <span
                    slot="icon"
                    className="material-symbols-rounded text-base flex items-center justify-center leading-none"
                  >
                    play_arrow
                  </span>
                  <span>Launch</span>
                </m3e-button>
              )}

              {!isActive && (
                <m3e-button
                  variant="tonal"
                  onClick={() => onSetDefault(ver.version)}
                  title="Set this version as default for mods"
                  style={{ cursor: 'pointer' }}
                >
                  <span
                    slot="icon"
                    className="material-symbols-rounded text-sm flex items-center justify-center leading-none"
                  >
                    star
                  </span>
                  <span>Set Default</span>
                </m3e-button>
              )}

              <m3e-icon-button
                variant="standard"
                onClick={() => onOpenFolder(ver.version)}
                title="Open installation folder"
                style={{ cursor: 'pointer' }}
              >
                <span className="material-symbols-rounded text-base flex items-center justify-center leading-none">
                  folder
                </span>
              </m3e-icon-button>

              <m3e-icon-button
                variant="standard"
                onClick={() => onDelete(ver.version)}
                title="Uninstall version"
                style={{
                  cursor: 'pointer',
                  color: 'var(--md-sys-color-error)',
                }}
              >
                <span className="material-symbols-rounded text-base flex items-center justify-center leading-none text-rose-500">
                  delete
                </span>
              </m3e-icon-button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
