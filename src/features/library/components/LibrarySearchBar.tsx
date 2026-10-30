import React, { useMemo, useCallback } from 'react'
import type { InstalledModRecord } from '@/core/mods'
import { useAnimatedPlaceholder } from '@/utils'
import { formatFileSize } from '@/utils/formatters'
import { useM3eSearchView } from '@/features/home/hooks'
import { resolveModThumbnail } from '../utils'

export interface LibrarySearchBarProps {
  query: string
  onQueryChange: (query: string) => void
  allMods: InstalledModRecord[]
  onSelectMod: (mod: InstalledModRecord) => void
  onPlayMod?: (mod: InstalledModRecord) => void
  placeholder?: string
  className?: string
}

const LIBRARY_SEARCH_PHRASES = [
  'Search installed mods...',
  'Search by title or author...',
  'Search by engine (V-Slice, Psych, Codename)...',
  'Find downloaded creations...',
]

export const LibrarySearchBar: React.FC<LibrarySearchBarProps> = ({
  query,
  onQueryChange,
  allMods,
  onSelectMod,
  onPlayMod,
  className = '',
}) => {
  const handleClear = useCallback(() => {
    onQueryChange('')
  }, [onQueryChange])

  const {
    inputRef,
    searchViewRef,
    openSearch,
    closeSearch,
    handleInputBlur,
  } = useM3eSearchView({
    onClear: handleClear,
  })

  const cleanQuery = query.trim().toLowerCase()

  const animatedPlaceholder = useAnimatedPlaceholder({
    phrases: LIBRARY_SEARCH_PHRASES,
    typingSpeed: 60,
    deletingSpeed: 30,
    pauseTime: 2400,
    emptyPauseTime: 400,
    enabled: query.length === 0,
  })

  const matchingMods = useMemo(() => {
    if (!cleanQuery) {
      return allMods.slice(0, 8)
    }
    return allMods.filter((mod) => {
      const title = (mod.title || mod.name || '').toLowerCase()
      const author = (mod.author || '').toLowerCase()
      const engine = (mod.engineName || mod.engineId || '').toLowerCase()
      const folder = (mod.folderName || '').toLowerCase()
      return (
        title.includes(cleanQuery) ||
        author.includes(cleanQuery) ||
        engine.includes(cleanQuery) ||
        folder.includes(cleanQuery)
      )
    })
  }, [allMods, cleanQuery])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      closeSearch()
    } else if (e.key === 'Escape') {
      closeSearch()
    }
  }

  const handleItemClick = (mod: InstalledModRecord) => {
    closeSearch()
    onSelectMod(mod)
  }

  const handlePlayClick = (e: React.MouseEvent, mod: InstalledModRecord) => {
    e.stopPropagation()
    closeSearch()
    onPlayMod?.(mod)
  }

  return (
    <div className={`w-full relative flex justify-center h-[46px] ${className}`}>
      <m3e-search-view
        ref={searchViewRef}
        mode="docked"
        contained
        className="w-full h-[46px]"
        style={
          {
            width: '100%',
            height: '46px',
            '--m3e-search-bar-container-color':
              'var(--md-sys-color-surface-container-high)',
            '--m3e-search-bar-leading-icon-color':
              'var(--md-sys-color-on-surface-variant)',
            '--m3e-search-bar-trailing-icon-color':
              'var(--md-sys-color-on-surface-variant)',
            '--m3e-search-view-container-color':
              'var(--md-sys-color-surface-container-high)',
            '--m3e-search-view-contained-container-color':
              'var(--md-sys-color-surface-container-high)',
            '--m3e-search-view-divider-color':
              'var(--md-sys-color-outline-variant)',
            '--m3e-search-bar-container-height': '46px',
            '--m3e-search-view-docked-header-container-height': '46px',
            '--m3e-search-view-docked-container-shape': '24px',
            '--m3e-search-view-contained-docked-bar-shape': '24px',
            borderRadius: '24px',
            border: '1px solid var(--md-sys-color-outline-variant)',
            boxShadow:
              '0 1px 3px color-mix(in srgb, var(--md-sys-color-scrim) 12%, transparent)',
          } as React.CSSProperties
        }
      >
        <input
          ref={inputRef}
          slot="input"
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={openSearch}
          onClick={openSearch}
          onBlur={handleInputBlur}
          placeholder={animatedPlaceholder}
          className="w-full bg-transparent border-none outline-none text-sm font-medium tracking-tight"
          style={{
            color: 'var(--md-sys-color-on-surface)',
          }}
        />

        <m3e-overflow
          direction="vertical"
          className="w-full max-h-[380px] select-none"
          style={
            {
              maxHeight: '380px',
              '--m3e-overflow-inset': '4px',
            } as React.CSSProperties
          }
        >
          <div className="flex flex-col p-2 gap-1.5 w-full pr-3">
            <span className="text-[11px] font-semibold tracking-wider uppercase px-2 py-1 text-[var(--md-sys-color-on-surface-variant)] opacity-75">
              {cleanQuery
                ? `Matching Installed Mods (${matchingMods.length})`
                : `Installed Mods (${allMods.length})`}
            </span>

            {matchingMods.length > 0 ? (
              matchingMods.map((mod) => {
                const thumbnail = resolveModThumbnail(mod)
                const title = mod.title || mod.name || 'Unnamed Mod'
                const engineName = mod.engineName || 'Standalone'

                return (
                  <div
                    key={`lib-search-${mod.id}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleItemClick(mod)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        handleItemClick(mod)
                      }
                    }}
                    className="flex items-center gap-3 p-2 rounded-2xl cursor-pointer transition-colors hover:bg-[color-mix(in_srgb,var(--md-sys-color-on-surface)_8%,transparent)] active:scale-[0.99]"
                  >
                    <img
                      src={thumbnail}
                      alt={title}
                      className="w-11 h-11 rounded-xl object-cover shrink-0 border border-[var(--md-sys-color-outline-variant)]"
                      onError={(e) => {
                        e.currentTarget.src = '/imgs/images/placeholder-mini.webp'
                      }}
                    />
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-sm font-semibold truncate text-[var(--md-sys-color-on-surface)]">
                        {title}
                      </span>
                      <span className="text-xs text-[var(--md-sys-color-on-surface-variant)] truncate">
                        {mod.author ? `By ${mod.author} • ` : ''}
                        {engineName}
                        {mod.fileSize ? ` • ${formatFileSize(mod.fileSize)}` : ''}
                      </span>
                    </div>

                    {onPlayMod && (
                      <button
                        type="button"
                        onClick={(e) => handlePlayClick(e, mod)}
                        className="p-2 rounded-xl text-[var(--md-sys-color-primary)] hover:bg-[color-mix(in_srgb,var(--md-sys-color-primary)_12%,transparent)] transition-colors shrink-0"
                        title="Play now"
                      >
                        <span className="material-symbols-rounded text-xl leading-none">
                          play_arrow
                        </span>
                      </button>
                    )}
                  </div>
                )
              })
            ) : (
              <div className="py-8 text-center text-xs text-[var(--md-sys-color-on-surface-variant)]">
                No installed mods found matching &quot;{cleanQuery}&quot;.
              </div>
            )}
          </div>
        </m3e-overflow>
      </m3e-search-view>
    </div>
  )
}

