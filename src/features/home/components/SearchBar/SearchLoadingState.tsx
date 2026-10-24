import React from 'react'

interface SearchLoadingStateProps {
  query: string
}

/**
 * Displays the wavy circular progress indicator while querying GameBanana.
 */
export const SearchLoadingState: React.FC<SearchLoadingStateProps> = ({
  query,
}) => {
  return (
    <div className="py-8 flex flex-col items-center justify-center gap-3">
      <m3e-circular-progress-indicator
        variant="wavy"
        indeterminate
        style={
          {
            '--m3e-circular-wavy-progress-indicator-diameter': '40px',
            '--m3e-circular-progress-indicator-thickness': '4px',
            '--m3e-progress-indicator-color': 'var(--md-sys-color-primary)',
          } as React.CSSProperties
        }
      />
      <span className="text-xs font-semibold text-[var(--md-sys-color-on-surface-variant)]">
        Searching GameBanana for &quot;{query}&quot;...
      </span>
    </div>
  )
}
