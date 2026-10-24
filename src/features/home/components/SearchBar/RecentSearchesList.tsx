import React from 'react'

interface RecentSearchesListProps {
  recentSearches: string[]
  onSelectRecent: (term: string) => void
  onRemoveRecent: (term: string) => void
  onClearAll: () => void
}

/**
 * Renders the user's recent search history and empty state inside the docked search view.
 */
export const RecentSearchesList: React.FC<RecentSearchesListProps> = ({
  recentSearches,
  onSelectRecent,
  onRemoveRecent,
  onClearAll,
}) => {
  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex items-center justify-between px-2 pt-1 pb-0.5">
        <span className="text-[11px] font-semibold tracking-wider uppercase text-[var(--md-sys-color-on-surface-variant)] opacity-75">
          Recent Searches
        </span>
        {recentSearches.length > 0 && (
          <button
            type="button"
            onClick={onClearAll}
            className="text-[11px] font-semibold text-[var(--md-sys-color-primary)] hover:underline cursor-pointer bg-transparent border-none p-0 outline-none transition-opacity hover:opacity-80"
          >
            Clear all
          </button>
        )}
      </div>

      {recentSearches.length > 0 ? (
        <div className="flex flex-col gap-0.5">
          {recentSearches.map((term) => (
            <div
              key={`recent-search-${term}`}
              role="button"
              tabIndex={0}
              onClick={() => onSelectRecent(term)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onSelectRecent(term)
                }
              }}
              className="group flex items-center justify-between gap-3 px-3 py-2 rounded-xl cursor-pointer transition-colors hover:bg-[color-mix(in_srgb,var(--md-sys-color-on-surface)_8%,transparent)] active:scale-[0.99]"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <span className="material-symbols-rounded text-lg text-[var(--md-sys-color-on-surface-variant)] shrink-0 opacity-70 group-hover:opacity-100 transition-opacity">
                  history
                </span>
                <span className="text-sm text-[var(--md-sys-color-on-surface)] truncate font-medium">
                  {term}
                </span>
              </div>
              <button
                type="button"
                title={`Remove "${term}" from history`}
                aria-label={`Remove "${term}" from history`}
                onClick={(e) => {
                  e.stopPropagation()
                  onRemoveRecent(term)
                }}
                className="w-7 h-7 rounded-full flex items-center justify-center text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)] hover:bg-[color-mix(in_srgb,var(--md-sys-color-on-surface)_12%,transparent)] transition-colors opacity-60 hover:opacity-100 shrink-0"
              >
                <span className="material-symbols-rounded text-base">
                  close
                </span>
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-8 px-4 flex flex-col items-center justify-center text-center gap-2 select-none">
          <span className="material-symbols-rounded text-3xl text-[var(--md-sys-color-on-surface-variant)] opacity-40">
            manage_search
          </span>
          <span className="text-xs font-semibold text-[var(--md-sys-color-on-surface-variant)]">
            No recent searches yet
          </span>
          <span className="text-[11px] text-[var(--md-sys-color-on-surface-variant)] opacity-70 max-w-xs">
            Search for Friday Night Funkin&apos; mods, creators, or mod IDs to
            get started.
          </span>
        </div>
      )}
    </div>
  )
}
