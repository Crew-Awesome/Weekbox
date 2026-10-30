import React from 'react'

export interface LibraryEmptyStateProps {
  isFilterEmpty: boolean
  searchQuery?: string
  onClearFilters: () => void
  onOpenFolder?: () => void
}

export const LibraryEmptyState: React.FC<LibraryEmptyStateProps> = ({
  isFilterEmpty,
  searchQuery,
  onClearFilters,
}) => {

  if (isFilterEmpty) {
    return (
      <div
        className="flex-1 flex flex-col items-center justify-center p-8 sm:p-12 rounded-3xl border border-dashed text-center min-h-[300px]"
        style={{
          borderColor: 'var(--md-sys-color-outline-variant)',
          color: 'var(--md-sys-color-on-surface-variant)',
          backgroundColor:
            'color-mix(in srgb, var(--md-sys-color-surface-container-low) 50%, transparent)',
        }}
      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
          style={{
            backgroundColor:
              'color-mix(in srgb, var(--md-sys-color-surface-container-high) 80%, transparent)',
          }}
        >
          <span className="material-symbols-rounded text-3xl opacity-70">
            search_off
          </span>
        </div>

        <h3
          className="text-lg sm:text-xl font-bold"
          style={{ color: 'var(--md-sys-color-on-surface)' }}
        >
          No matching mods found
        </h3>

        <p className="text-xs sm:text-sm max-w-md mt-1.5 opacity-80 leading-relaxed">
          {searchQuery
            ? `No installed mods matched "${searchQuery}". Check the spelling or try resetting your filters.`
            : 'No installed mods match the currently active category filters.'}
        </p>

        <button
          type="button"
          onClick={onClearFilters}
          className="mt-6 flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer shadow-sm active:scale-95"
          style={{
            backgroundColor: 'var(--md-sys-color-secondary-container)',
            color: 'var(--md-sys-color-on-secondary-container)',
          }}
        >
          <span className="material-symbols-rounded text-lg">filter_alt_off</span>
          <span>Clear Filters</span>
        </button>
      </div>
    )
  }

  return (
    <div
      className="flex-1 flex flex-col items-center justify-center p-8 sm:p-14 rounded-3xl border border-dashed text-center min-h-[340px] relative overflow-hidden"
      style={{
        borderColor: 'color-mix(in srgb, var(--md-sys-color-outline-variant) 70%, transparent)',
        color: 'var(--md-sys-color-on-surface-variant)',
        backgroundColor:
          'color-mix(in srgb, var(--md-sys-color-surface-container-low) 60%, transparent)',
      }}
    >
      <div
        className="pointer-events-none absolute -bottom-10 -left-10 w-72 h-72 rounded-full opacity-15 blur-3xl"
        style={{
          background:
            'radial-gradient(circle, var(--md-sys-color-primary) 0%, transparent 70%)',
        }}
      />

      <div
        className="w-16 h-16 rounded-3xl flex items-center justify-center mb-4 shadow-inner"
        style={{
          backgroundColor:
            'color-mix(in srgb, var(--md-sys-color-primary-container) 80%, transparent)',
          color: 'var(--md-sys-color-on-primary-container)',
        }}
      >
        <span className="material-symbols-rounded text-3xl">
          sports_esports
        </span>
      </div>

      <h3
        className="text-lg sm:text-xl font-bold tracking-tight"
        style={{ color: 'var(--md-sys-color-on-surface)' }}
      >
        Your Library is Empty
      </h3>

      <p className="text-xs sm:text-sm max-w-md mt-1.5 leading-relaxed opacity-80">
        You haven't installed any mods yet. Installed mods will automatically appear here for quick management and launching.
      </p>
    </div>
  )
}
