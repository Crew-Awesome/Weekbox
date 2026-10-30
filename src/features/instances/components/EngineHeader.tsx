import React from 'react'
import type { EngineDefinition, GitHubRelease } from '@/core/engines'

interface EngineHeaderProps {
  engine: EngineDefinition
  installedCount: number
  activeVersion: string | null
  latestRelease?: GitHubRelease
  isLoadingReleases: boolean
  onRefreshReleases: () => void
  onOpenFolder: () => void
  onOpenGitHub: () => void
}

export const EngineHeader: React.FC<EngineHeaderProps> = ({
  engine,
  installedCount,
  activeVersion,
  latestRelease,
  isLoadingReleases,
  onRefreshReleases,
  onOpenFolder,
  onOpenGitHub,
}) => {
  return (
    <div
      className="w-full rounded-3xl p-5 sm:p-6 border relative overflow-hidden flex flex-col md:flex-row gap-5 items-start md:items-center justify-between"
      style={{
        backgroundColor: 'var(--md-sys-color-surface-container)',
        borderColor: 'var(--md-sys-color-outline-variant)',
      }}
    >
      <div className="flex items-start gap-4 sm:gap-5 flex-1 min-w-0">
        <div
          className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden flex items-center justify-center p-2.5 shrink-0 shadow-sm border"
          style={{
            backgroundColor: 'var(--md-sys-color-surface-container-high)',
            borderColor: 'var(--md-sys-color-outline-variant)',
          }}
        >
          <img
            src={engine.icon}
            alt={engine.name}
            className="w-full h-full object-contain drop-shadow"
          />
        </div>

        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1
              className="text-xl sm:text-2xl font-bold tracking-tight truncate"
              style={{ color: 'var(--md-sys-color-on-surface)' }}
            >
              {engine.name}
            </h1>

            <button
              type="button"
              onClick={onOpenGitHub}
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold hover:opacity-80 transition cursor-pointer"
              style={{
                backgroundColor: 'var(--md-sys-color-secondary-container)',
                color: 'var(--md-sys-color-on-secondary-container)',
              }}
              title="Open repository on GitHub"
            >
              <span className="material-symbols-rounded text-sm">code</span>
              <span className="truncate max-w-[160px]">{engine.repo}</span>
              <span className="material-symbols-rounded text-xs">open_in_new</span>
            </button>
          </div>

          <p
            className="text-xs sm:text-sm mt-1.5 line-clamp-2 max-w-2xl leading-relaxed"
            style={{ color: 'var(--md-sys-color-on-surface-variant)' }}
          >
            {engine.description}
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-3 pt-2 border-t border-[var(--md-sys-color-outline-variant)]/40 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-[var(--md-sys-color-on-surface-variant)]">
                Installed versions:
              </span>
              <span
                className="font-bold px-2 py-0.5 rounded-md"
                style={{
                  backgroundColor: 'var(--md-sys-color-surface-container-highest)',
                  color: 'var(--md-sys-color-on-surface)',
                }}
              >
                {installedCount}
              </span>
            </div>

            {activeVersion && (
              <div className="flex items-center gap-1.5">
                <span className="text-[var(--md-sys-color-on-surface-variant)]">
                  Active:
                </span>
                <span
                  className="font-semibold text-emerald-500 flex items-center gap-0.5"
                  title="Currently active engine version"
                >
                  <span className="material-symbols-rounded text-sm">check_circle</span>
                  {activeVersion}
                </span>
              </div>
            )}

            {latestRelease && (
              <div className="flex items-center gap-1.5">
                <span className="text-[var(--md-sys-color-on-surface-variant)]">
                  Latest GitHub:
                </span>
                <span
                  className="font-semibold px-2 py-0.5 rounded-md"
                  style={{
                    backgroundColor: 'var(--md-sys-color-primary-container)',
                    color: 'var(--md-sys-color-on-primary-container)',
                  }}
                >
                  {latestRelease.tagName}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 self-stretch md:self-auto justify-end shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-[var(--md-sys-color-outline-variant)]">
        <button
          type="button"
          onClick={onRefreshReleases}
          disabled={isLoadingReleases}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer disabled:opacity-60"
          style={{
            backgroundColor: 'var(--md-sys-color-surface-container-high)',
            color: 'var(--md-sys-color-on-surface)',
            border: '1px solid var(--md-sys-color-outline-variant)',
          }}
          title="Fetch latest versions from GitHub"
        >
          <span
            className={`material-symbols-rounded text-base ${
              isLoadingReleases ? 'animate-spin' : ''
            }`}
          >
            refresh
          </span>
          <span>Refresh</span>
        </button>

        <button
          type="button"
          onClick={onOpenFolder}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer hover:bg-[var(--md-sys-color-surface-container-highest)]"
          style={{
            backgroundColor: 'var(--md-sys-color-surface-container-high)',
            color: 'var(--md-sys-color-on-surface)',
            border: '1px solid var(--md-sys-color-outline-variant)',
          }}
          title="Open engine installation folder on disk"
        >
          <span className="material-symbols-rounded text-base">folder_open</span>
          <span>Open Folder</span>
        </button>
      </div>
    </div>
  )
}
