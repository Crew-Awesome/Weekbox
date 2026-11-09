import React from 'react'

export interface ModsEmptyStateProps {
  searchQuery?: string
  isError?: boolean
  onRetry?: () => void
}

export const ModsEmptyState: React.FC<ModsEmptyStateProps> = ({
  searchQuery,
  isError = false,
  onRetry,
}) => {
  const hasSearch = Boolean(searchQuery && searchQuery.trim().length > 0)

  if (hasSearch) {
    return (
      <div className="py-16 text-center flex flex-col items-center justify-center gap-2 select-none">
        <span className="material-symbols-rounded text-4xl text-[var(--md-sys-color-on-surface-variant)] opacity-60">
          search_off
        </span>
        <span className="text-sm font-semibold text-[var(--md-sys-color-on-surface-variant)]">
          No mods found matching &quot;{searchQuery}&quot;
        </span>
        <span className="text-xs text-[var(--md-sys-color-on-surface-variant)] opacity-70">
          Try searching for another term or mod ID.
        </span>
      </div>
    )
  }

  return (
    <div className="py-16 text-center flex flex-col items-center justify-center gap-2.5 select-none">
      <span className="material-symbols-rounded text-4xl text-[var(--md-sys-color-on-surface-variant)] opacity-60">
        {isError ? 'wifi_off' : 'inbox'}
      </span>
      <span className="text-sm font-semibold text-[var(--md-sys-color-on-surface-variant)]">
        {isError ? 'Could not load mods' : 'No mods available'}
      </span>
      <span className="text-xs text-[var(--md-sys-color-on-surface-variant)] opacity-70 max-w-sm">
        {isError
          ? 'Unable to connect to GameBanana. Please check your internet connection and try again.'
          : 'No mods match the selected category or engine filters.'}
      </span>
      {onRetry && (
        <m3e-button
          variant="tonal"
          onClick={onRetry}
          style={{ marginTop: '6px', cursor: 'pointer' } as React.CSSProperties}
        >
          <span slot="icon" className="material-symbols-rounded text-base">
            refresh
          </span>
          Try Again
        </m3e-button>
      )}
    </div>
  )
}
