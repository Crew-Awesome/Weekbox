import React from 'react'
import type { TwitterNewsSource } from '@/services/twitter'

interface NewsFilterChipsProps {
  sources: TwitterNewsSource[]
  selectedAccount: string
  availableSources: Set<string>
  onSelectAccount: (username: string) => void
}

export const NewsFilterChips: React.FC<NewsFilterChipsProps> = ({
  sources,
  selectedAccount,
  onSelectAccount,
}) => {
  return (
    <div className="w-full flex items-center gap-2 overflow-x-auto py-1.5 scrollbar-none select-none">
      <m3e-filter-chip
        selected={!selectedAccount}
        onClick={() => onSelectAccount('')}
        style={{ cursor: 'pointer' }}
      >
        <span slot="leading-icon" className="material-symbols-rounded text-base">
          dynamic_feed
        </span>
        All Feeds
      </m3e-filter-chip>

      {sources.map((source) => {
        const isSelected = selectedAccount.toLowerCase() === source.username.toLowerCase()

        return (
          <m3e-filter-chip
            key={`source-chip-${source.username}`}
            selected={isSelected}
            onClick={() => onSelectAccount(isSelected ? '' : source.username)}
            style={{ cursor: 'pointer' }}
          >
            {source.name}
          </m3e-filter-chip>
        )
      })}
    </div>
  )
}
