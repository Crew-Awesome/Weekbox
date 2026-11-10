import React, { useState, useMemo } from 'react'
import type { InstalledModRecord, ModProfile } from '@/core/mods'
import { resolveModThumbnail } from '../utils'

export interface LibraryProfileAddModsViewProps {
  allMods: InstalledModRecord[]
  profile: ModProfile
  onAddMod: (modId: string) => void
  onRemoveMod: (modId: string) => void
  isFavorite?: (id: string | number) => boolean
  isBookmarked?: (id: string | number) => boolean
}

export const LibraryProfileAddModsView: React.FC<LibraryProfileAddModsViewProps> = ({
  allMods,
  profile,
  onAddMod,
  onRemoveMod,
  isFavorite,
  isBookmarked,
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterFavorites, setFilterFavorites] = useState(false)
  const [filterBookmarks, setFilterBookmarks] = useState(false)
  const [selectedEngine, setSelectedEngine] = useState('all')

  const availableEngines = useMemo(() => {
    const map = new Map<string, string>()
    allMods.forEach((m) => {
      const id = m.engineId || m.engineName
      if (id) {
        map.set(id.toLowerCase(), m.engineName || id)
      }
    })
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [allMods])

  const filteredLibraryMods = useMemo(() => {
    let list = allMods
    const q = searchQuery.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (m) =>
          (m.title || m.name || '').toLowerCase().includes(q) ||
          (m.author || '').toLowerCase().includes(q) ||
          (m.engineName || m.engineId || '').toLowerCase().includes(q),
      )
    }
    if (filterFavorites && isFavorite) {
      list = list.filter((m) => isFavorite(m.id))
    }
    if (filterBookmarks && isBookmarked) {
      list = list.filter((m) => isBookmarked(m.id))
    }
    if (selectedEngine !== 'all') {
      list = list.filter((m) => {
        const engId = (m.engineId || m.engineName || '').toLowerCase()
        return engId === selectedEngine.toLowerCase()
      })
    }
    return list
  }, [
    searchQuery,
    filterFavorites,
    filterBookmarks,
    selectedEngine,
    allMods,
    isFavorite,
    isBookmarked,
  ])

  const hasFilters =
    filterFavorites || filterBookmarks || selectedEngine !== 'all' || searchQuery

  const clearAllFilters = () => {
    setSearchQuery('')
    setFilterFavorites(false)
    setFilterBookmarks(false)
    setSelectedEngine('all')
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="p-3 border-b border-[var(--md-sys-color-outline-variant)]/20 flex flex-col gap-2">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--md-sys-color-surface-container-high)] border border-[var(--md-sys-color-outline-variant)]/30">
          <span className="material-symbols-rounded text-sm text-[var(--md-sys-color-on-surface-variant)]">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search library mods..."
            className="flex-1 bg-transparent border-none outline-none text-xs text-[var(--md-sys-color-on-surface)] placeholder:text-[var(--md-sys-color-on-surface-variant)]/60"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)]"
            >
              <span className="material-symbols-rounded text-xs">close</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-thin text-xs">
          <button
            type="button"
            onClick={() => setFilterFavorites((prev) => !prev)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border transition-all cursor-pointer font-semibold ${
              filterFavorites
                ? 'bg-red-500/15 border-red-500/40 text-red-500'
                : 'bg-[var(--md-sys-color-surface-container)] border-[var(--md-sys-color-outline-variant)]/30 text-[var(--md-sys-color-on-surface-variant)] hover:text-red-500'
            }`}
          >
            <span
              className="material-symbols-rounded text-xs"
              style={filterFavorites ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              favorite
            </span>
            <span>Favs</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterBookmarks((prev) => !prev)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border transition-all cursor-pointer font-semibold ${
              filterBookmarks
                ? 'bg-amber-400/15 border-amber-400/40 text-amber-400'
                : 'bg-[var(--md-sys-color-surface-container)] border-[var(--md-sys-color-outline-variant)]/30 text-[var(--md-sys-color-on-surface-variant)] hover:text-amber-400'
            }`}
          >
            <span
              className="material-symbols-rounded text-xs"
              style={filterBookmarks ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              bookmark
            </span>
            <span>Bookmarks</span>
          </button>

          {availableEngines.length > 0 && (
            <select
              value={selectedEngine}
              onChange={(e) => setSelectedEngine(e.target.value)}
              className="px-2 py-1 rounded-lg border border-[var(--md-sys-color-outline-variant)]/30 bg-[var(--md-sys-color-surface-container)] text-[var(--md-sys-color-on-surface)] text-xs outline-none cursor-pointer"
            >
              <option value="all">All Engines</option>
              {availableEngines.map((eng) => (
                <option key={eng.id} value={eng.id}>
                  {eng.name}
                </option>
              ))}
            </select>
          )}

          {hasFilters && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="px-2 py-1 rounded-lg text-xs font-semibold text-red-400 hover:bg-red-500/10 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 scrollbar-thin">
        {filteredLibraryMods.length === 0 ? (
          <div className="text-center py-10 text-xs text-[var(--md-sys-color-on-surface-variant)] font-medium">
            No matching mods found
          </div>
        ) : (
          filteredLibraryMods.map((mod) => {
            const isAdded = profile.modIds.some(
              (id) => String(id) === String(mod.id),
            )
            const thumb = resolveModThumbnail(mod)

            return (
              <div
                key={mod.id}
                className="flex items-center justify-between gap-3 p-2 rounded-xl bg-[var(--md-sys-color-surface-container-high)]/60 border border-[var(--md-sys-color-outline-variant)]/25"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <img
                    src={thumb}
                    alt=""
                    className="w-10 h-10 rounded-lg object-cover bg-black/20 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-[var(--md-sys-color-on-surface)] truncate">
                      {mod.title || mod.name || 'Unnamed Mod'}
                    </div>
                    <div className="text-[10px] text-[var(--md-sys-color-on-surface-variant)] truncate">
                      {mod.engineName || mod.engineId || 'Default Engine'}
                    </div>
                  </div>
                </div>

                {isAdded ? (
                  <button
                    type="button"
                    onClick={() => onRemoveMod(String(mod.id))}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-[var(--md-sys-color-primary)] bg-[var(--md-sys-color-primary-container)]/30 hover:bg-red-500/10 hover:text-red-500 transition-colors cursor-pointer"
                    title="Click to remove from profile"
                  >
                    <span className="material-symbols-rounded text-xs">check</span>
                    <span>Added</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onAddMod(String(mod.id))}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] hover:opacity-90 active:scale-95 transition-all cursor-pointer"
                  >
                    <span className="material-symbols-rounded text-xs">add</span>
                    <span>Add</span>
                  </button>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
