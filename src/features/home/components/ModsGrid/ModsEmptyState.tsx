import React from 'react'

interface ModsEmptyStateProps {
  searchQuery?: string
}

/**
 * Empty state displayed when no mods match the active search query.
 */
export const ModsEmptyState: React.FC<ModsEmptyStateProps> = ({
  searchQuery,
}) => {
  return (
    <div className="py-16 text-center flex flex-col items-center justify-center gap-2">
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
