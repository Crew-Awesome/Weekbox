import React, { useState, useMemo, useEffect } from 'react'
import type { InstalledModRecord, ModProfile } from '@/core/mods'
import { resolveModThumbnail } from '../utils'
import { LibraryProfileAddModsView } from './LibraryProfileAddModsView'

export interface LibraryProfileSidebarProps {
  profile: ModProfile | null
  allMods: InstalledModRecord[]
  isOpen: boolean
  onClose: () => void
  onAddMod: (modId: string) => void
  onRemoveMod: (modId: string) => void
  onPlayMod: (mod: InstalledModRecord) => void
  onPlayAll: (profile: ModProfile) => void
  onSelectMod: (mod: InstalledModRecord) => void
  onDeleteProfile: (id: string) => void
  onRenameProfile: (id: string, newName: string) => void
  isFavorite?: (id: string | number) => boolean
  isBookmarked?: (id: string | number) => boolean
}

export const LibraryProfileSidebar: React.FC<LibraryProfileSidebarProps> = ({
  profile,
  allMods,
  isOpen,
  onClose,
  onAddMod,
  onRemoveMod,
  onPlayMod,
  onPlayAll,
  onSelectMod,
  onDeleteProfile,
  onRenameProfile,
  isFavorite,
  isBookmarked,
}) => {
  const [isAddMode, setIsAddMode] = useState(false)
  const [isEditingName, setIsEditingName] = useState(false)
  const [editedName, setEditedName] = useState('')
  const [animOpen, setAnimOpen] = useState(false)

  useEffect(() => {
    setIsAddMode(false)
    setIsEditingName(false)
    if (profile) setEditedName(profile.name)
  }, [profile?.id, isOpen])

  useEffect(() => {
    if (isOpen) {
      const raf = requestAnimationFrame(() => setAnimOpen(true))
      return () => cancelAnimationFrame(raf)
    }
    setAnimOpen(false)
  }, [isOpen])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const savedMods = useMemo(() => {
    if (!profile) return []
    const idSet = new Set(profile.modIds.map((id) => String(id)))
    return allMods.filter((mod) => idSet.has(String(mod.id)))
  }, [profile, allMods])

  if (!isOpen || !profile) return null

  const handleSaveName = () => {
    const trimmed = editedName.trim()
    if (trimmed && trimmed !== profile.name) {
      onRenameProfile(profile.id, trimmed)
    }
    setIsEditingName(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end overflow-hidden">
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity duration-300 ease-out cursor-pointer ${
          animOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      <aside
        className={`relative w-full sm:w-[440px] max-w-[92vw] h-full bg-[var(--md-sys-color-surface-container)] border-l border-[var(--md-sys-color-outline-variant)]/40 shadow-2xl flex flex-col z-10 transition-transform duration-300 ease-out transform ${
          animOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-4 border-b border-[var(--md-sys-color-outline-variant)]/30 gap-2 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <span className="material-symbols-rounded text-2xl text-[var(--md-sys-color-primary)] shrink-0">
              folder
            </span>

            {isEditingName ? (
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <input
                  type="text"
                  autoFocus
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveName()
                    if (e.key === 'Escape') setIsEditingName(false)
                  }}
                  className="w-full bg-[var(--md-sys-color-surface-container-high)] text-sm font-bold text-[var(--md-sys-color-on-surface)] px-2 py-1 rounded-lg border border-[var(--md-sys-color-primary)] outline-none"
                />
                <button
                  type="button"
                  onClick={handleSaveName}
                  className="p-1 text-[var(--md-sys-color-primary)] hover:bg-[var(--md-sys-color-surface-container-high)] rounded-md cursor-pointer"
                  title="Save name"
                >
                  <span className="material-symbols-rounded text-lg">check</span>
                </button>
              </div>
            ) : (
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm sm:text-base font-bold text-[var(--md-sys-color-on-surface)] truncate">
                    {profile.name}
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setEditedName(profile.name)
                      setIsEditingName(true)
                    }}
                    className="p-1 text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)] rounded-md cursor-pointer"
                    title="Rename folder"
                  >
                    <span className="material-symbols-rounded text-xs">edit</span>
                  </button>
                </div>
                <div className="text-[11px] text-[var(--md-sys-color-on-surface-variant)] font-medium">
                  {savedMods.length} {savedMods.length === 1 ? 'mod' : 'mods'} saved
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => onDeleteProfile(profile.id)}
              className="p-2 rounded-xl text-[var(--md-sys-color-on-surface-variant)] hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
              title="Delete folder"
            >
              <span className="material-symbols-rounded text-lg">delete</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)] hover:bg-[var(--md-sys-color-surface-container-high)] transition-colors cursor-pointer"
              title="Close sidebar"
            >
              <span className="material-symbols-rounded text-lg">close</span>
            </button>
          </div>
        </header>

        <div className="p-3 border-b border-[var(--md-sys-color-outline-variant)]/20 flex items-center justify-between gap-2 shrink-0 bg-[var(--md-sys-color-surface-container-low)]">
          <span className="text-xs font-semibold text-[var(--md-sys-color-on-surface-variant)]">
            {isAddMode ? 'Add Mods from Library' : 'Saved in this Profile'}
          </span>
          <button
            type="button"
            onClick={() => setIsAddMode((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs ${
              isAddMode
                ? 'bg-[var(--md-sys-color-surface-container-highest)] text-[var(--md-sys-color-on-surface)]'
                : 'bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] active:scale-95'
            }`}
          >
            <span className="material-symbols-rounded text-sm">
              {isAddMode ? 'arrow_back' : 'add'}
            </span>
            <span>{isAddMode ? 'Back to Profile' : 'Add Mods'}</span>
          </button>
        </div>

        {isAddMode ? (
          <LibraryProfileAddModsView
            allMods={allMods}
            profile={profile}
            onAddMod={onAddMod}
            onRemoveMod={onRemoveMod}
            isFavorite={isFavorite}
            isBookmarked={isBookmarked}
          />
        ) : (
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2.5 scrollbar-thin">
            {savedMods.length > 0 && (
              <button
                type="button"
                onClick={() => onPlayAll(profile)}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl font-bold text-xs sm:text-sm bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] shadow-md hover:opacity-90 active:scale-98 transition-all cursor-pointer mb-1"
                title="Launch all mods in this collection"
              >
                <span className="material-symbols-rounded text-lg">play_arrow</span>
                <span>Ejecutar Todo ({savedMods.length})</span>
              </button>
            )}

            {savedMods.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-4">
                <span className="material-symbols-rounded text-4xl text-[var(--md-sys-color-outline-variant)]">
                  folder_open
                </span>
                <div className="text-xs sm:text-sm font-bold text-[var(--md-sys-color-on-surface)]">
                  This folder is empty
                </div>
                <p className="text-xs text-[var(--md-sys-color-on-surface-variant)] max-w-xs leading-relaxed">
                  Click &apos;Add Mods&apos; above to organize your installed mods into this profile without removing them from your library.
                </p>
                <button
                  type="button"
                  onClick={() => setIsAddMode(true)}
                  className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] active:scale-95 transition-all cursor-pointer"
                >
                  <span className="material-symbols-rounded text-sm">add</span>
                  <span>Add Mods Now</span>
                </button>
              </div>
            ) : (
              savedMods.map((mod) => {
                const thumb = resolveModThumbnail(mod)

                return (
                  <div
                    key={mod.id}
                    onClick={() => onSelectMod(mod)}
                    className="flex items-center justify-between gap-3 p-2.5 rounded-2xl bg-[var(--md-sys-color-surface-container-high)]/60 hover:bg-[var(--md-sys-color-surface-container-high)] border border-[var(--md-sys-color-outline-variant)]/30 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <img
                        src={thumb}
                        alt=""
                        className="w-11 h-11 rounded-xl object-cover bg-black/20 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs sm:text-sm font-bold text-[var(--md-sys-color-on-surface)] truncate">
                          {mod.title || mod.name || 'Unnamed Mod'}
                        </div>
                        <div className="text-[11px] text-[var(--md-sys-color-on-surface-variant)] truncate">
                          {mod.engineName || mod.engineId || 'Default'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onPlayMod(mod)
                        }}
                        className="p-1.5 rounded-xl bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] hover:opacity-90 active:scale-95 transition-all cursor-pointer"
                        title="Play mod"
                      >
                        <span className="material-symbols-rounded text-base">play_arrow</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onRemoveMod(String(mod.id))
                        }}
                        className="p-1.5 rounded-xl text-[var(--md-sys-color-on-surface-variant)] hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                        title="Remove from this folder"
                      >
                        <span className="material-symbols-rounded text-base">folder_delete</span>
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}
      </aside>
    </div>
  )
}
