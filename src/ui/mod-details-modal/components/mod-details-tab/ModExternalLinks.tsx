import React from 'react'
import type { ModItem } from '../../types'

interface ModExternalLinksProps {
  displayCard: ModItem
  engineName?: string
}

export const ModExternalLinks: React.FC<ModExternalLinksProps> = ({
  displayCard,
}) => {
  const rawId = String(displayCard.id)
  const source =
    displayCard.source === 'gamejolt' || rawId.startsWith('gamejolt:')
      ? 'gamejolt'
      : displayCard.source === 'backstage' || rawId.startsWith('backstage:')
        ? 'backstage'
        : 'gamebanana'

  const linkMeta =
    source === 'gamejolt'
      ? {
          href:
            displayCard.sourceUrl ||
            `https://gamejolt.com/games/${displayCard.sourceId || rawId.replace(/^gamejolt:/, '')}`,
          icon: '/imgs/icons/app/gamejolt.png',
          label: 'GameJolt Page',
          alt: 'GameJolt',
        }
      : source === 'backstage'
        ? {
            href:
              displayCard.sourceUrl ||
              `https://funkinbackstage.net/mods/${displayCard.sourceId || rawId.replace(/^backstage:/, '')}`,
            icon: '/imgs/icons/app/backstage.png',
            label: "Funkin' Backstage Page",
            alt: "Funkin' Backstage",
          }
        : {
            href:
              displayCard.sourceUrl ||
              `https://gamebanana.com/mods/${displayCard.id}`,
            icon: '/imgs/icons/app/gamebanana.webp',
            label: 'GameBanana Mod Page',
            alt: 'GameBanana',
          }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <a
          href={linkMeta.href}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between p-3 rounded-xl bg-[var(--md-sys-color-surface-bright)]/60 hover:bg-[var(--md-sys-color-surface-bright)] border border-[var(--md-sys-color-outline-variant)]/20 transition-all text-xs text-[var(--md-sys-color-on-surface)] font-semibold group"
        >
          <div className="flex items-center gap-2.5">
            <img
              src={linkMeta.icon}
              alt={linkMeta.alt}
              className="w-4 h-4 object-contain opacity-80"
            />
            <span>{linkMeta.label}</span>
          </div>
          <span className="material-symbols-rounded text-sm text-[var(--md-sys-color-on-surface-variant)] group-hover:text-[var(--md-sys-color-primary)] transition-colors">
            open_in_new
          </span>
        </a>

        <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--md-sys-color-surface-bright)]/60 border border-[var(--md-sys-color-outline-variant)]/20 text-xs text-[var(--md-sys-color-on-surface-variant)]">
          <span>ID</span>
          <span className="font-mono font-bold text-[var(--md-sys-color-on-surface)] truncate max-w-[180px]">
            #{displayCard.sourceId || displayCard.id}
          </span>
        </div>
      </div>
    </div>
  )
}

