import React, { useState, useMemo } from 'react'
import type { InstalledModRecord, ModProfile } from '@/core/mods'
import { resolveModThumbnail } from '../utils'

export interface LibraryProfileAddModsViewProps {
  allMods: InstalledModRecord[]
  profile: ModProfile
  onAddMod: (modId: string) => void
  onRemoveMod: (modId: string) => void
}

export const LibraryProfileAddModsView: React.FC<LibraryProfileAddModsViewProps> = ({
  allMods,
  profile,
  onAddMod,
  onRemoveMod,
}) => {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredLibraryMods = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return allMods
    return allMods.filter(
      (m) =>
        (m.title || m.name || '').toLowerCase().includes(q) ||
        (m.author || '').toLowerCase().includes(q) ||
        (m.engineName || m.engineId || '').toLowerCase().includes(q),
    )
  }, [searchQuery, allMods])

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="p-3 border-b border-[var(--md-sys-color-outline-variant)]/20">
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
