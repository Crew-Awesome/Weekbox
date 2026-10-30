import React from 'react'
import type { InstalledModRecord } from '@/core/mods'
import { LibraryModCard } from './LibraryModCard'
import { LibraryEmptyState } from './LibraryEmptyState'

export interface LibraryGridProps {
  mods: InstalledModRecord[]
  isLoading: boolean
  totalModsCount: number
  searchQuery: string
  isFavorite: (id: string | number) => boolean
  isBookmarked?: (id: string | number) => boolean
  onToggleFavorite: (id: string | number) => void
  onSelectMod: (mod: InstalledModRecord) => void
  onOpenFolder: (mod: InstalledModRecord) => void
  onUninstall: (mod: InstalledModRecord) => void
  onClearFilters: () => void
  onOpenAllModsFolder: () => void
  onPlay?: (mod: InstalledModRecord) => void
}

export const LibraryGrid: React.FC<LibraryGridProps> = ({
  mods,
  isLoading,
  totalModsCount,
  searchQuery,
  isFavorite,
  isBookmarked,
  onToggleFavorite,
  onSelectMod,
  onOpenFolder,
  onUninstall,
  onClearFilters,
  onOpenAllModsFolder,
  onPlay,
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5 sm:gap-6">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div
            key={idx}
            className="rounded-3xl overflow-hidden border border-[var(--md-sys-color-outline-variant)]/30 bg-[var(--md-sys-color-surface-container)] flex flex-col p-4 gap-3 animate-pulse"
          >
            <div className="aspect-[16/9] w-full rounded-2xl bg-[var(--md-sys-color-surface-container-highest)]" />
            <div className="h-5 w-3/4 rounded-md bg-[var(--md-sys-color-surface-container-highest)]" />
            <div className="h-3.5 w-1/2 rounded-md bg-[var(--md-sys-color-surface-container-highest)]" />
            <div className="flex justify-between items-center pt-2 mt-auto border-t border-[var(--md-sys-color-outline-variant)]/20">
              <div className="h-4 w-16 rounded bg-[var(--md-sys-color-surface-container-highest)]" />
              <div className="h-8 w-20 rounded-xl bg-[var(--md-sys-color-surface-container-highest)]" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (mods.length === 0) {
    return (
      <LibraryEmptyState
        isFilterEmpty={totalModsCount > 0}
        searchQuery={searchQuery}
        onClearFilters={onClearFilters}
        onOpenFolder={onOpenAllModsFolder}
      />
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5 sm:gap-6">
      {mods.map((mod) => (
        <LibraryModCard
          key={mod.id}
          mod={mod}
          isFavorite={isFavorite(mod.id) || (mod.modId !== undefined && isFavorite(mod.modId))}
          isBookmarked={isBookmarked ? (isBookmarked(mod.id) || (mod.modId !== undefined && isBookmarked(mod.modId))) : false}
          onSelect={onSelectMod}
          onToggleFavorite={onToggleFavorite}
          onOpenFolder={onOpenFolder}
          onUninstall={onUninstall}
          onPlay={onPlay}
        />
      ))}
    </div>
  )
}
