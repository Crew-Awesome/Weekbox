import React from 'react'
import type { InstalledModRecord, ModProfile } from '@/core/mods'
import { LibraryFolderCard } from './LibraryFolderCard'

export interface LibraryProfilesBarProps {
  profiles: ModProfile[]
  allMods: InstalledModRecord[]
  activeProfileId: string | null
  onSelectProfile: (id: string) => void
  onDeleteProfile: (id: string) => void
}

export const LibraryProfilesBar: React.FC<LibraryProfilesBarProps> = ({
  profiles,
  allMods,
  activeProfileId,
  onSelectProfile,
  onDeleteProfile,
}) => {
  if (profiles.length === 0) return null

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2">
        <span className="material-symbols-rounded text-lg text-[var(--md-sys-color-primary)]">
          folder
        </span>
        <h2 className="text-xs sm:text-sm font-bold text-[var(--md-sys-color-on-surface)] tracking-wide">
          Folders
        </h2>
        <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface-variant)]">
          {profiles.length}
        </span>
      </div>

      <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-thin">
        {profiles.map((profile) => (
          <LibraryFolderCard
            key={profile.id}
            profile={profile}
            allMods={allMods}
            isActive={profile.id === activeProfileId}
            onClick={() => onSelectProfile(profile.id)}
            onDelete={() => onDeleteProfile(profile.id)}
          />
        ))}
      </div>
    </div>
  )
}
