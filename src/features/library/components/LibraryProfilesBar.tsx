import React, { useState } from 'react'
import type { ModProfile } from '@/core/mods'

export interface LibraryProfilesBarProps {
  profiles: ModProfile[]
  activeProfileId: string | null
  onSelectProfile: (id: string) => void
  onCreateProfile: (name: string) => void
  onDeleteProfile: (id: string) => void
  onRenameProfile: (id: string, name: string) => void
}

export const LibraryProfilesBar: React.FC<LibraryProfilesBarProps> = ({
  profiles,
  activeProfileId,
  onSelectProfile,
  onCreateProfile,
  onDeleteProfile,
}) => {
  const [isCreating, setIsCreating] = useState(false)
  const [newProfileName, setNewProfileName] = useState('')

  const handleStartCreate = () => {
    setNewProfileName('')
    setIsCreating(true)
  }

  const handleConfirmCreate = () => {
    const trimmed = newProfileName.trim()
    if (trimmed) {
      onCreateProfile(trimmed)
      setNewProfileName('')
      setIsCreating(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleConfirmCreate()
    } else if (e.key === 'Escape') {
      setIsCreating(false)
    }
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-rounded text-lg text-[var(--md-sys-color-primary)]">
            folder_copy
          </span>
          <h2 className="text-xs sm:text-sm font-bold text-[var(--md-sys-color-on-surface)] tracking-wide">
            Profiles & Folders
          </h2>
          <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface-variant)]">
            {profiles.length}
          </span>
        </div>

        {!isCreating && (
          <button
            type="button"
            onClick={handleStartCreate}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-xs"
          >
            <span className="material-symbols-rounded text-sm">
              create_new_folder
            </span>
            <span>New Profile</span>
          </button>
        )}
      </div>

      {isCreating && (
        <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-primary)]/40 animate-in fade-in duration-200">
          <span className="material-symbols-rounded text-base text-[var(--md-sys-color-primary)] pl-1">
            folder
          </span>
          <input
            type="text"
            autoFocus
            value={newProfileName}
            onChange={(e) => setNewProfileName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Folder / profile name..."
            className="flex-1 bg-transparent border-none outline-none text-xs sm:text-sm text-[var(--md-sys-color-on-surface)] placeholder:text-[var(--md-sys-color-on-surface-variant)]/60"
          />
          <button
            type="button"
            onClick={handleConfirmCreate}
            disabled={!newProfileName.trim()}
            className="px-3 py-1 rounded-xl text-xs font-bold bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] disabled:opacity-40 cursor-pointer active:scale-95 transition-all"
          >
            Create
          </button>
          <button
            type="button"
            onClick={() => setIsCreating(false)}
            className="px-2.5 py-1 rounded-xl text-xs font-semibold text-[var(--md-sys-color-on-surface-variant)] hover:bg-[var(--md-sys-color-surface-container-high)] cursor-pointer active:scale-95 transition-all"
          >
            Cancel
          </button>
        </div>
      )}

      <div className="flex items-center gap-3 overflow-x-auto pb-1.5 scrollbar-thin">
        <button
          type="button"
          onClick={handleStartCreate}
          className="shrink-0 flex items-center justify-center gap-2 min-w-[140px] h-[78px] px-4 rounded-2xl border-2 border-dashed border-[var(--md-sys-color-outline-variant)]/60 hover:border-[var(--md-sys-color-primary)]/70 hover:bg-[var(--md-sys-color-primary)]/5 text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-primary)] transition-all cursor-pointer group active:scale-98"
          title="Create a new mod profile folder"
        >
          <span className="material-symbols-rounded text-xl group-hover:scale-110 transition-transform">
            add
          </span>
          <span className="text-xs font-bold">New Folder</span>
        </button>

        {profiles.map((profile) => {
          const isActive = profile.id === activeProfileId
          const modCount = profile.modIds?.length ?? 0

          return (
            <div
              key={profile.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelectProfile(profile.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  onSelectProfile(profile.id)
                }
              }}
              className={`shrink-0 flex flex-col justify-between min-w-[155px] max-w-[200px] h-[78px] p-2.5 rounded-2xl border transition-all duration-200 cursor-pointer shadow-xs relative group select-none ${
                isActive
                  ? 'bg-[var(--md-sys-color-primary-container)]/30 border-[var(--md-sys-color-primary)] ring-2 ring-[var(--md-sys-color-primary)]/30'
                  : 'bg-[var(--md-sys-color-surface-container)] hover:bg-[var(--md-sys-color-surface-container-high)] border-[var(--md-sys-color-outline-variant)]/35 hover:border-[var(--md-sys-color-primary)]/50'
              }`}
              title={`Open ${profile.name} (${modCount} ${modCount === 1 ? 'mod' : 'mods'})`}
            >
              <div className="flex items-center justify-between">
                <span className="material-symbols-rounded text-xl text-[var(--md-sys-color-primary)] group-hover:scale-110 transition-transform">
                  folder
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeleteProfile(profile.id)
                  }}
                  className="opacity-0 group-hover:opacity-80 hover:opacity-100 text-[var(--md-sys-color-on-surface-variant)] hover:text-red-500 p-1 rounded-lg transition-all"
                  title="Delete folder"
                  aria-label="Delete folder"
                >
                  <span className="material-symbols-rounded text-sm leading-none">
                    delete
                  </span>
                </button>
              </div>

              <div>
                <div className="text-xs sm:text-sm font-bold text-[var(--md-sys-color-on-surface)] truncate">
                  {profile.name}
                </div>
                <div className="text-[11px] text-[var(--md-sys-color-on-surface-variant)] opacity-75 font-medium">
                  {modCount} {modCount === 1 ? 'mod' : 'mods'}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
