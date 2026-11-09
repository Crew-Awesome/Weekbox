import React from 'react'
import { formatFileSize } from '@/utils/formatters'
import type {
  EngineDefinition,
  EnginePlatform,
  EngineDownloadTask,
} from '@/core/engines'
import type { EngineVersionOption } from '../hooks/use-engine-management'
import { EngineInstallVisual } from './EngineInstallVisual'
import {
  PLATFORM_LABELS,
  VERSION_TRIGGER_STYLE,
  VERSION_MENU_STYLE,
  ACTIONS_MENU_STYLE,
  MENU_LIST_STYLE,
  getVersionActionsMenuId,
  hideMenuById,
  getMenuHeight,
} from '../constants'

export interface InstancesVersionSelectorProps {
  currentEngine: EngineDefinition
  platform: EnginePlatform
  selectedVersion: string | null
  versionOptions: EngineVersionOption[]
  tasksByVersion: Record<string, EngineDownloadTask>
  isLoadingReleases: boolean
  smoothProgress: number
  onSelectVersion: (version: string) => void
  onOpenFolder: (version?: string) => void
  onSetDefault: (version: string) => void
  onDeleteVersion: (version: string) => void
  onLaunchVersion: (version: string) => void
}

export const InstancesVersionSelector: React.FC<InstancesVersionSelectorProps> = ({
  currentEngine,
  platform,
  selectedVersion,
  versionOptions,
  tasksByVersion,
  isLoadingReleases,
  smoothProgress,
  onSelectVersion,
  onOpenFolder,
  onSetDefault,
  onDeleteVersion,
  onLaunchVersion,
}) => {
  const versionMenuHeight = getMenuHeight(versionOptions.length, 40, 60)

  return (
    <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
      <m3e-button variant="text" style={VERSION_TRIGGER_STYLE} className="min-w-0 max-w-full">
        <m3e-menu-trigger for="instances-version-menu"></m3e-menu-trigger>
        <img
          slot="icon"
          src={currentEngine.icon}
          alt=""
          className="w-5 h-5 sm:w-6 sm:h-6 rounded-md object-contain shrink-0 aspect-square"
          style={{
            width: '24px',
            height: '24px',
            minWidth: '24px',
            minHeight: '24px',
            aspectRatio: '1 / 1',
            objectFit: 'contain',
          }}
        />
        <span className="flex flex-col items-start leading-tight min-w-0">
          <span
            className="text-[9px] sm:text-[10px] uppercase tracking-wider font-semibold"
            style={{
              color: 'var(--md-sys-color-on-surface-variant)',
            }}
          >
            Version
          </span>
          <span className="text-xs sm:text-sm font-bold truncate max-w-[5.5rem] min-[400px]:max-w-[8.5rem] sm:max-w-[14rem]">
            {selectedVersion ?? 'Select a version'}
          </span>
        </span>
        <span
          slot="trailing-icon"
          className="material-symbols-rounded text-[18px] shrink-0"
          style={{
            color: 'var(--md-sys-color-on-surface-variant)',
            fontSize: '18px',
            width: '18px',
            height: '18px',
            lineHeight: '18px',
          }}
        >
          expand_less
        </span>
      </m3e-button>

      <m3e-menu
        id="instances-version-menu"
        position-x="after"
        position-y="above"
        style={VERSION_MENU_STYLE}
      >
        {versionOptions.length === 0 ? (
          <m3e-menu-item disabled>
            <span className="text-sm opacity-70">
              {isLoadingReleases
                ? 'Loading versions...'
                : `No ${PLATFORM_LABELS[platform]} versions available`}
            </span>
          </m3e-menu-item>
        ) : (
          <m3e-overflow
            direction="vertical"
            style={{ width: '100%', height: versionMenuHeight }}
            thumb-color="var(--md-sys-color-primary)"
            track-color="var(--md-sys-color-outline-variant)"
          >
            <div style={MENU_LIST_STYLE}>
              {versionOptions.map((option, index) => {
                const isSelected = option.version === selectedVersion
                const versionTask = tasksByVersion[option.version]
                const isVersionBusy = Boolean(
                  versionTask &&
                    (versionTask.status === 'downloading' ||
                      versionTask.status === 'extracting' ||
                      versionTask.status === 'canceling'),
                )
                const statusLabel = option.isActive
                  ? 'Default'
                  : option.installed
                    ? 'Installed'
                    : 'Available'
                const assetLabel = option.asset
                  ? `${PLATFORM_LABELS[platform]} · ${formatFileSize(option.asset.size)}`
                  : PLATFORM_LABELS[platform]
                const actionsMenuId = getVersionActionsMenuId(
                  currentEngine.id,
                  index,
                )

                return (
                  <m3e-menu-item
                    key={option.version}
                    checked={isSelected}
                    onClick={() => {
                      onSelectVersion(option.version)
                      hideMenuById('instances-version-menu')
                    }}
                    style={{ margin: '3px 0' }}
                  >
                    <span
                      slot="icon"
                      className="shrink-0 flex items-center justify-center"
                    >
                      {isVersionBusy && versionTask ? (
                        <EngineInstallVisual
                          phase={
                            versionTask.status === 'canceling'
                              ? 'canceling'
                              : versionTask.status === 'extracting'
                                ? 'extracting'
                                : 'downloading'
                          }
                          progress={
                            option.version === selectedVersion
                              ? smoothProgress
                              : versionTask.progress
                          }
                          size={24}
                          showRing={false}
                          tone="primary"
                        />
                      ) : (
                        <span
                          className="material-symbols-rounded"
                          style={{ fontSize: '18px' }}
                        >
                          {option.isActive
                            ? 'check_circle'
                            : option.installed
                              ? 'folder_special'
                              : 'cloud_download'}
                        </span>
                      )}
                    </span>
                    <span className="inline-flex flex-col items-start leading-tight min-w-0 align-middle">
                      <span className="text-sm font-semibold truncate">
                        {option.version}
                      </span>
                      <span className="text-[11px] opacity-70 truncate">
                        {isVersionBusy && versionTask
                          ? `${versionTask.status === 'canceling' ? 'Canceling' : versionTask.status === 'extracting' ? 'Extracting' : `${Math.round(option.version === selectedVersion ? smoothProgress : versionTask.progress)}%`} · ${versionTask.speed || assetLabel}`
                          : `${statusLabel} · ${assetLabel}${
                              option.release?.prerelease
                                ? ' · Pre-release'
                                : ''
                            }`}
                      </span>
                    </span>
                    {option.installed && (
                      <m3e-menu-trigger
                        for={actionsMenuId}
                        style={{ display: 'none' }}
                      />
                    )}
                  </m3e-menu-item>
                )
              })}
            </div>
          </m3e-overflow>
        )}
      </m3e-menu>

      {versionOptions.map((option, index) => {
        if (!option.installed) return null

        const actionsMenuId = getVersionActionsMenuId(
          currentEngine.id,
          index,
        )

        return (
          <m3e-menu
            key={actionsMenuId}
            id={actionsMenuId}
            className="instances-version-actions-menu max-md:!left-4 max-md:!w-[min(340px,calc(100vw-24px))]"
            position-x="after"
            position-y="below"
            style={ACTIONS_MENU_STYLE}
          >
            <m3e-menu-item
              onClick={() => {
                void onOpenFolder(option.version)
              }}
              style={{ margin: '3px 0' }}
            >
              <span slot="icon" className="material-symbols-rounded">
                folder_open
              </span>
              <span className="text-sm">Open folder</span>
            </m3e-menu-item>
            <m3e-menu-item
              disabled={option.isActive}
              onClick={() => {
                if (!option.isActive) {
                  void onSetDefault(option.version)
                }
              }}
              style={{ margin: '3px 0' }}
            >
              <span slot="icon" className="material-symbols-rounded">
                {option.isActive ? 'check_circle' : 'star'}
              </span>
              <span className="text-sm">
                {option.isActive
                  ? 'Already selected as default'
                  : 'Set default'}
              </span>
            </m3e-menu-item>
            <m3e-menu-item
              onClick={() => {
                onDeleteVersion(option.version)
              }}
              style={{ margin: '3px 0' }}
            >
              <span slot="icon" className="material-symbols-rounded">
                delete
              </span>
              <span className="text-sm">Uninstall</span>
            </m3e-menu-item>
            <m3e-menu-item
              onClick={() => {
                void onLaunchVersion(option.version)
              }}
              style={{ margin: '3px 0' }}
            >
              <span slot="icon" className="material-symbols-rounded">
                play_arrow
              </span>
              <span className="text-sm">Quick launch</span>
            </m3e-menu-item>
          </m3e-menu>
        )
      })}
    </div>
  )
}
