import React from 'react'
import type { ModItem } from '../../types'

interface ModExternalLinksProps {
  displayCard: ModItem
  engineName?: string
}

export const ModExternalLinks: React.FC<ModExternalLinksProps> = ({
  displayCard,
  engineName,
}) => {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <a
          href={`https://gamebanana.com/mods/${displayCard.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between p-3 rounded-xl bg-[var(--wb-surface-bright)]/60 hover:bg-[var(--wb-surface-bright)] border border-[var(--wb-outline-variant)]/20 transition-all text-xs text-[var(--wb-on-surface)] font-semibold group"
        >
          <div className="flex items-center gap-2.5">
            <img
              src="/imgs/icons/app/gamebanana.webp"
              alt="GameBanana"
              className="w-4 h-4 object-contain opacity-80"
            />
            <span>GameBanana Mod Page</span>
          </div>
          <span className="material-symbols-rounded text-sm text-[var(--wb-on-surface-variant)] group-hover:text-[var(--wb-primary)] transition-colors">
            open_in_new
          </span>
        </a>

        {engineName && (
          <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--wb-surface-bright)]/60 border border-[var(--wb-outline-variant)]/20 text-xs text-[var(--wb-on-surface-variant)]">
            <span>Engine</span>
            <span className="font-semibold text-[var(--wb-on-surface)]">
              {engineName}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--wb-surface-bright)]/60 border border-[var(--wb-outline-variant)]/20 text-xs text-[var(--wb-on-surface-variant)]">
          <span>ID</span>
          <span className="font-mono font-bold text-[var(--wb-on-surface)]">
            #{displayCard.id}
          </span>
        </div>
      </div>
    </div>
  )
}

