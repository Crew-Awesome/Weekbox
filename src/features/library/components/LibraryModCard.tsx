import React from 'react'
import { Card } from '@/ui/card'
import type { InstalledModRecord } from '@/core/mods'
import { formatDate, formatFileSize, formatCompactNumber } from '@/utils/formatters'
import { resolveModThumbnail } from '../utils'

export interface LibraryModCardProps {
  mod: InstalledModRecord
  isFavorite: boolean
  isBookmarked?: boolean
  onSelect: (mod: InstalledModRecord) => void
  onToggleFavorite: (id: string | number) => void
  onOpenFolder: (mod: InstalledModRecord) => void
  onUninstall: (mod: InstalledModRecord) => void
  onPlay?: (mod: InstalledModRecord) => void
}

export const LibraryModCard: React.FC<LibraryModCardProps> = ({
  mod,
  isFavorite,
  isBookmarked = false,
  onSelect,
  onToggleFavorite,
  onOpenFolder,
  onUninstall,
  onPlay,
}) => {
  const displayTitle = mod.title || mod.name || 'Unnamed Mod'
  const displayThumbnail = resolveModThumbnail(mod)
  const displayEngine = mod.engineName || mod.engineId || 'Default'
  const isInstalled = Boolean(mod.installPath)

  return (
    <Card
      title={displayTitle}
      description={mod.description}
      thumbnail={displayThumbnail}
      icon={mod.icon}
      iconTooltip={displayEngine}
      extractColor={true}
      lazyLoad={true}
      isFavorite={isFavorite}
      isBookmarked={isBookmarked}
      author={mod.author}
      authorAvatar={mod.userPfp}
      onClick={() => onSelect(mod)}
    >
      <div className="flex flex-col gap-2 pt-1 border-t border-[var(--md-sys-color-outline-variant)]/25 mt-0.5">
        <div className="flex items-center justify-between text-[11px] text-[var(--md-sys-color-on-surface-variant)]">
          {isInstalled ? (
            <>
              <div className="flex items-center gap-1.5 font-medium">
                <span className="material-symbols-rounded text-xs text-[var(--md-sys-color-primary)]">
                  folder_zip
                </span>
                <span>{formatFileSize(mod.fileSize)}</span>
              </div>

              {mod.installedAt && (
                <div className="flex items-center gap-1 font-medium opacity-80">
                  <span className="material-symbols-rounded text-xs">
                    calendar_today
                  </span>
                  <span>{formatDate(mod.installedAt)}</span>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-between w-full text-[11px] text-[var(--md-sys-color-on-surface-variant)]">
              <div
                className="flex items-center gap-1.5 text-[var(--md-sys-color-on-surface-variant)]"
                title={`${(mod.views || 0).toLocaleString()} views`}
              >
                <span className="material-symbols-rounded text-sm text-[var(--md-sys-color-on-surface-variant)]">
                  visibility
                </span>
                <span className="text-[var(--md-sys-color-on-surface-variant)] font-medium">
                  {formatCompactNumber(mod.views)}
                </span>
              </div>

              <div
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleFavorite(mod.id)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.stopPropagation()
                    onToggleFavorite(mod.id)
                  }
                }}
                className={`flex items-center gap-1.5 cursor-pointer hover:text-red-500 transition-colors select-none ${
                  isFavorite
                    ? 'text-red-500'
                    : 'text-[var(--md-sys-color-on-surface-variant)]'
                }`}
                title="Toggle Favorite"
              >
                <span
                  className={`material-symbols-rounded text-sm ${
                    isFavorite
                      ? 'text-red-500'
                      : 'text-[var(--md-sys-color-on-surface-variant)]'
                  }`}
                  style={
                    isFavorite ? { fontVariationSettings: "'FILL' 1" } : undefined
                  }
                >
                  favorite
                </span>
                <span
                  className={`font-medium ${
                    isFavorite
                      ? 'text-red-500'
                      : 'text-[var(--md-sys-color-on-surface-variant)]'
                  }`}
                >
                  {formatCompactNumber(mod.likes)}
                </span>
              </div>

              <div
                className="flex items-center gap-1.5 text-[var(--md-sys-color-on-surface-variant)]"
                title={`${(mod.downloads || 0).toLocaleString()} downloads`}
              >
                <span className="material-symbols-rounded text-sm text-[var(--md-sys-color-on-surface-variant)]">
                  download
                </span>
                <span className="text-[var(--md-sys-color-on-surface-variant)] font-medium">
                  {formatCompactNumber(mod.downloads)}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-1.5 pt-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              if (isInstalled && onPlay) {
                onPlay(mod)
              } else {
                onSelect(mod)
              }
            }}
            className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer shadow-sm active:scale-95 hover:opacity-90"
            style={{
              backgroundColor: isInstalled
                ? 'var(--md-sys-color-primary)'
                : 'var(--md-sys-color-secondary-container)',
              color: isInstalled
                ? 'var(--md-sys-color-on-primary)'
                : 'var(--md-sys-color-on-secondary-container)',
            }}
            title={
              isInstalled
                ? 'Play this mod directly'
                : 'Open details to download and install this favorite mod'
            }
          >
            <span className="material-symbols-rounded text-sm">
              {isInstalled ? 'play_arrow' : 'download'}
            </span>
            <span>{isInstalled ? 'Play' : 'Install'}</span>
          </button>

          {isInstalled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onOpenFolder(mod)
              }}
              className="p-1.5 rounded-xl text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)] transition-all duration-200 cursor-pointer border hover:border-[var(--md-sys-color-outline-variant)]/60 active:scale-90"
              style={{
                backgroundColor:
                  'color-mix(in srgb, var(--md-sys-color-surface-container-high) 70%, transparent)',
                borderColor:
                  'color-mix(in srgb, var(--md-sys-color-outline-variant) 30%, transparent)',
              }}
              title="Open folder in File Explorer"
            >
              <span className="material-symbols-rounded text-base">
                folder_open
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onToggleFavorite(mod.id)
            }}
            className={`p-1.5 rounded-xl transition-all duration-200 cursor-pointer border active:scale-90 ${
              isFavorite
                ? 'text-red-500 border-red-500/30 bg-red-500/10'
                : 'text-[var(--md-sys-color-on-surface-variant)] hover:text-red-500 hover:border-red-500/30'
            }`}
            style={
              !isFavorite
                ? {
                    backgroundColor:
                      'color-mix(in srgb, var(--md-sys-color-surface-container-high) 70%, transparent)',
                    borderColor:
                      'color-mix(in srgb, var(--md-sys-color-outline-variant) 30%, transparent)',
                  }
                : undefined
            }
            title={isFavorite ? 'Remove from favorites' : 'Mark as favorite'}
          >
            <span
              className="material-symbols-rounded text-base"
              style={
                isFavorite ? { fontVariationSettings: "'FILL' 1" } : undefined
              }
            >
              favorite
            </span>
          </button>

          {isInstalled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onUninstall(mod)
              }}
              className="p-1.5 rounded-xl text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-error)] hover:border-[var(--md-sys-color-error)]/30 hover:bg-[var(--md-sys-color-error)]/10 transition-all duration-200 cursor-pointer border active:scale-90"
              style={{
                backgroundColor:
                  'color-mix(in srgb, var(--md-sys-color-surface-container-high) 70%, transparent)',
                borderColor:
                  'color-mix(in srgb, var(--md-sys-color-outline-variant) 30%, transparent)',
              }}
              title="Uninstall mod"
            >
              <span className="material-symbols-rounded text-base">
                delete
              </span>
            </button>
          )}
        </div>
      </div>
    </Card>
  )
}
