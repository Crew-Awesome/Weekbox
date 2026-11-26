import React, { useId } from 'react'
import type { InstalledEngineVersion } from '@/core/engines'
import { useEnginePlaytime } from '@/core/engines'
import { UNDETECTED_ENGINE_WARNING_MSG } from '@/core/mods/mod-filesystem'
import { formatFileSize } from '@/utils/formatters'
import type { InstanceDisplayDefinition } from '../hooks/use-executable-instances'
import { ICON_BUTTON_STYLE, ACTIONS_MENU_STYLE } from '../constants'

export interface InstancesEngineIdentityProps {
  engine: InstanceDisplayDefinition
  installedVersions: InstalledEngineVersion[]
  activeVersion: string | null
  isLoadingReleases: boolean
  onRefreshReleases: () => void
  onOpenFolder: () => void
  onOpenGitHub: () => void
  isExecutableInstance?: boolean
  hasWarning?: boolean
  warningMessage?: string
  executableExeName?: string | null
  executableFileSize?: number
  sourceUrl?: string
  onOpenSourceUrl?: () => void
  mobileVersionSelector?: React.ReactNode
  mobileActionButtons?: React.ReactNode
}

export const InstancesEngineIdentity: React.FC<InstancesEngineIdentityProps> = ({
  engine,
  installedVersions,
  activeVersion,
  isLoadingReleases,
  onRefreshReleases,
  onOpenFolder,
  onOpenGitHub,
  isExecutableInstance = false,
  hasWarning = false,
  warningMessage,
  executableExeName,
  executableFileSize = 0,
  sourceUrl,
  onOpenSourceUrl,
  mobileVersionSelector,
  mobileActionButtons,
}) => {
  const { formattedPlaytime } = useEnginePlaytime(engine.id)
  const rawId = useId()
  const warningId = `instances-identity-warning-${rawId.replace(/:/g, '-')}`

  return (
    <section className="flex items-center gap-3 sm:gap-4 min-w-0">
      <div className="relative shrink-0">
        <img
          src={engine.icon}
          alt={engine.name}
          className={`w-12 h-12 sm:w-16 sm:h-16 object-contain drop-shadow aspect-square transition-all duration-200 ${
            hasWarning ? 'grayscale brightness-90 opacity-75' : ''
          }`}
          style={{ aspectRatio: '1 / 1' }}
        />
        {hasWarning && (
          <>
            <span
              id={warningId}
              className="absolute -top-1 -right-1 z-10 flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-black shadow-md cursor-help overflow-hidden"
              aria-label="Executable warning"
            >
              <svg
                viewBox="0 0 24 24"
                className="w-3.5 h-3.5 fill-black shrink-0"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M12 2.5c-.7 0-1.34.37-1.69.97l-9.15 15.84c-.36.63-.37 1.4-.01 2.03.35.63 1.01 1.02 1.73 1.02h18.24c.72 0 1.38-.39 1.73-1.02.36-.63.35-1.4-.01-2.03L13.69 3.47c-.35-.6-.99-.97-1.69-.97zm0 13.5c-.69 0-1.25.56-1.25 1.25s.56 1.25 1.25 1.25 1.25-.56 1.25-1.25-.56-1.25-1.25-1.25zm-1-6.5c0-.55.45-1 1-1s1 .45 1 1v4c0 .55-.45 1-1 1s-1-.45-1-1v-4z"
                />
              </svg>
            </span>
            <m3e-tooltip for={warningId} position="below">
              {warningMessage || UNDETECTED_ENGINE_WARNING_MSG}
            </m3e-tooltip>
          </>
        )}
      </div>

      <div className="hidden md:block min-w-0 flex-1">
        <h2
          className="text-xl sm:text-3xl font-black tracking-tight truncate"
          style={{ color: 'var(--md-sys-color-on-surface)' }}
        >
          {engine.name}
        </h2>
        <div
          className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-1 text-[11px] sm:text-xs"
          style={{ color: 'var(--md-sys-color-on-surface-variant)' }}
        >
          {isExecutableInstance ? (
            <>
              <span>{executableExeName || 'No executable detected'}</span>
              {executableFileSize > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{formatFileSize(executableFileSize)}</span>
                </>
              )}
              <span aria-hidden="true">·</span>
            </>
          ) : (
            <>
              <span>
                {installedVersions.length} version
                {installedVersions.length === 1 ? '' : 's'} installed
              </span>
              <span aria-hidden="true">·</span>
              <span>
                {activeVersion ? `Default ${activeVersion}` : 'No default yet'}
              </span>
              <span aria-hidden="true">·</span>
            </>
          )}
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

      {mobileVersionSelector || mobileActionButtons ? (
        <div className="md:hidden flex items-center gap-1.5 min-w-0 flex-1 justify-between">
          {mobileVersionSelector ? (
            <div className="min-w-0 flex-1">{mobileVersionSelector}</div>
          ) : (
            <div className="min-w-0 flex-1">
              <h2
                className="text-base font-black tracking-tight truncate"
                style={{ color: 'var(--md-sys-color-on-surface)' }}
              >
                {engine.name}
              </h2>
              <span
                className="inline-flex items-center gap-1 text-[11px] font-semibold"
                style={{ color: 'var(--md-sys-color-primary)' }}
              >
                <span className="material-symbols-rounded text-[11px] leading-none">
                  schedule
                </span>
                <span>{formattedPlaytime} played</span>
              </span>
            </div>
          )}
          {mobileActionButtons && <div className="shrink-0">{mobileActionButtons}</div>}
        </div>
      ) : (
        <div className="md:hidden min-w-0 flex-1">
          <h2
            className="text-xl font-black tracking-tight truncate"
            style={{ color: 'var(--md-sys-color-on-surface)' }}
          >
            {engine.name}
          </h2>
        </div>
      )}

      <div className="relative shrink-0">
        <m3e-icon-button
          variant="standard"
          aria-label={isExecutableInstance ? 'Instance actions' : 'Engine actions'}
          title={isExecutableInstance ? 'Instance actions' : 'Engine actions'}
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
          {!isExecutableInstance && (
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
          )}
          <m3e-menu-item onClick={onOpenFolder}>
            <span slot="icon" className="material-symbols-rounded">
              folder_open
            </span>
            <span className="text-sm">
              {isExecutableInstance ? 'Open mod folder' : 'Open engine folder'}
            </span>
          </m3e-menu-item>
          {isExecutableInstance ? (
            sourceUrl &&
            onOpenSourceUrl && (
              <m3e-menu-item onClick={onOpenSourceUrl}>
                <span slot="icon" className="material-symbols-rounded">
                  open_in_new
                </span>
                <span className="text-sm">View mod page</span>
              </m3e-menu-item>
            )
          ) : (
            <m3e-menu-item onClick={onOpenGitHub}>
              <span slot="icon" className="material-symbols-rounded">
                open_in_new
              </span>
              <span className="text-sm">View on GitHub</span>
            </m3e-menu-item>
          )}
        </m3e-menu>
      </div>
    </section>
  )
}
