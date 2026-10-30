import React from 'react'
import type { EngineDefinition, InstalledEngineVersion } from '@/core/engines'
import { useEnginePlaytime } from '@/core/engines'
import { ICON_BUTTON_STYLE, ACTIONS_MENU_STYLE } from '../constants'

export interface InstancesEngineIdentityProps {
  engine: EngineDefinition
  installedVersions: InstalledEngineVersion[]
  activeVersion: string | null
  isLoadingReleases: boolean
  onRefreshReleases: () => void
  onOpenFolder: () => void
  onOpenGitHub: () => void
}

export const InstancesEngineIdentity: React.FC<InstancesEngineIdentityProps> = ({
  engine,
  installedVersions,
  activeVersion,
  isLoadingReleases,
  onRefreshReleases,
  onOpenFolder,
  onOpenGitHub,
}) => {
  const { formattedPlaytime } = useEnginePlaytime(engine.id)

  return (
    <section className="flex items-center gap-3 sm:gap-4 min-w-0">
      <img
        src={engine.icon}
        alt={engine.name}
        className="w-14 h-14 sm:w-16 sm:h-16 object-contain shrink-0 drop-shadow aspect-square"
        style={{ aspectRatio: '1 / 1' }}
      />

      <div className="min-w-0 flex-1">
        <h2
          className="text-2xl sm:text-3xl font-black tracking-tight truncate"
          style={{ color: 'var(--md-sys-color-on-surface)' }}
        >
          {engine.name}
        </h2>
        <div
          className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-1 text-[11px] sm:text-xs"
          style={{ color: 'var(--md-sys-color-on-surface-variant)' }}
        >
          <span>
            {installedVersions.length} version
            {installedVersions.length === 1 ? '' : 's'} installed
          </span>
          <span aria-hidden="true">·</span>
          <span>
            {activeVersion ? `Default ${activeVersion}` : 'No default yet'}
          </span>
          <span aria-hidden="true">·</span>
          <span
            className="inline-flex items-center gap-1 font-semibold"
            style={{ color: 'var(--md-sys-color-primary)' }}
            title={`Playtime for ${engine.name}`}
          >
            <span className="material-symbols-rounded text-[12px] leading-none">
              schedule
            </span>
            <span>{formattedPlaytime} played</span>
          </span>
        </div>
      </div>

      <div className="relative shrink-0">
        <m3e-icon-button
          variant="standard"
          aria-label="Engine actions"
          title="Engine actions"
          style={ICON_BUTTON_STYLE}
        >
          <m3e-menu-trigger for="instances-engine-actions">
            <span className="material-symbols-rounded text-[22px]">
              more_vert
            </span>
          </m3e-menu-trigger>
        </m3e-icon-button>

        <m3e-menu
          id="instances-engine-actions"
          position-x="before"
          position-y="below"
          style={ACTIONS_MENU_STYLE}
        >
          <m3e-menu-item
            onClick={onRefreshReleases}
            disabled={isLoadingReleases}
          >
            <span slot="icon" className="material-symbols-rounded">
              <span
                className={isLoadingReleases ? 'inline-block animate-spin' : ''}
              >
                refresh
              </span>
            </span>
            <span className="text-sm">Refresh releases</span>
          </m3e-menu-item>
          <m3e-menu-item onClick={onOpenFolder}>
            <span slot="icon" className="material-symbols-rounded">
              folder_open
            </span>
            <span className="text-sm">Open engine folder</span>
          </m3e-menu-item>
          <m3e-menu-item onClick={onOpenGitHub}>
            <span slot="icon" className="material-symbols-rounded">
              open_in_new
            </span>
            <span className="text-sm">View on GitHub</span>
          </m3e-menu-item>
        </m3e-menu>
      </div>
    </section>
  )
}
