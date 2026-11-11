import React from 'react'
import type { InstalledModRecord, ModProfile } from '@/core/mods'
import { resolveModThumbnail } from '../utils'

export interface LibraryFolderCardProps {
  profile: ModProfile
  allMods: InstalledModRecord[]
  isActive: boolean
  onClick: () => void
  onDelete: () => void
}

const STACK_STYLES = [
  { transform: 'scale(1) translateY(0px) rotate(0deg)', zIndex: 10, opacity: 1 },
  { transform: 'scale(0.93) translateY(-7px) rotate(3deg)', zIndex: 8, opacity: 0.95 },
  { transform: 'scale(0.86) translateY(-14px) rotate(-3deg)', zIndex: 6, opacity: 0.9 },
  { transform: 'scale(0.79) translateY(-21px) rotate(5deg)', zIndex: 4, opacity: 0.85 },
  { transform: 'scale(0.72) translateY(-28px) rotate(-5deg)', zIndex: 2, opacity: 0.8 },
]

export const LibraryFolderCard: React.FC<LibraryFolderCardProps> = ({
  profile,
  allMods,
  isActive,
  onClick,
  onDelete,
}) => {
  const profileMods = React.useMemo(() => {
    const idSet = new Set(profile.modIds.map((id) => String(id)))
    return allMods.filter((m) => idSet.has(String(m.id)))
  }, [profile.modIds, allMods])

  const topMods = React.useMemo(() => {
    return profileMods.slice(0, 5)
  }, [profileMods])

  const modCount = profile.modIds?.length ?? 0

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onClick()
      }}
      className={`shrink-0 flex flex-col w-[170px] sm:w-[190px] rounded-2xl p-2.5 border transition-all duration-300 cursor-pointer shadow-sm relative group select-none ${
        isActive
          ? 'bg-[var(--md-sys-color-primary-container)]/25 border-[var(--md-sys-color-primary)] ring-2 ring-[var(--md-sys-color-primary)]/40'
          : 'bg-[var(--md-sys-color-surface-container)] hover:bg-[var(--md-sys-color-surface-container-high)] border-[var(--md-sys-color-outline-variant)]/30 hover:border-[var(--md-sys-color-primary)]/50'
      }`}
      title={`Open folder: ${profile.name} (${modCount} mods)`}
    >
      <div className="relative w-full h-[120px] sm:h-[130px] rounded-xl overflow-hidden bg-[var(--md-sys-color-scrim)]/25 flex items-center justify-center pt-5">
        {topMods.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-1.5 opacity-60">
            <span className="material-symbols-rounded text-3xl text-[var(--md-sys-color-primary)]">
              folder
            </span>
            <span className="text-[10px] font-semibold text-[var(--md-sys-color-on-surface-variant)]">
              Empty Collection
            </span>
          </div>
        ) : (
          <div className="relative w-[110px] sm:w-[125px] h-[80px] sm:h-[90px] flex items-center justify-center">
            {topMods
              .map((mod, idx) => ({ mod, idx }))
              .reverse()
              .map(({ mod, idx }) => {
                const style = STACK_STYLES[idx] || STACK_STYLES[STACK_STYLES.length - 1]
                const thumb = resolveModThumbnail(mod)

                return (
                  <div
                    key={mod.id}
                    className="absolute inset-0 rounded-xl overflow-hidden shadow-lg border border-[var(--md-sys-color-outline-variant)]/30 transition-transform duration-300 group-hover:scale-102"
                    style={{
                      transform: style.transform,
                      zIndex: style.zIndex,
                      opacity: style.opacity,
                    }}
                  >
                    <img
                      src={thumb}
                      alt=""
                      className="w-full h-full object-cover bg-[var(--md-sys-color-surface-container-highest)]"
                    />
                  </div>
                )
              })}
          </div>
        )}

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-80 hover:opacity-100 text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-error)] p-1.5 rounded-lg bg-[var(--md-sys-color-scrim)]/40 backdrop-blur-xs transition-all z-20"
          title="Delete folder"
          aria-label="Delete folder"
        >
          <span className="material-symbols-rounded text-sm leading-none">
            delete
          </span>
        </button>
      </div>

      <div className="pt-2 px-1 flex flex-col gap-0.5">
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-rounded text-sm text-[var(--md-sys-color-primary)] shrink-0">
            folder
          </span>
          <span className="text-xs sm:text-sm font-bold text-[var(--md-sys-color-on-surface)] truncate">
            {profile.name}
          </span>
        </div>

        <div className="text-[11px] text-[var(--md-sys-color-on-surface-variant)] font-medium pl-5">
          {modCount} {modCount === 1 ? 'mod' : 'mods'}
        </div>
      </div>
    </div>
  )
}
