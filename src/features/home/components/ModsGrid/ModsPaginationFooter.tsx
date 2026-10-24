import React, { type RefObject } from 'react'

interface ModsPaginationFooterProps {
  sentinelRef: RefObject<HTMLDivElement | null>
  isLoadingMore: boolean
  hasMore: boolean
}

/**
 * Intersection sentinel and pagination status footer for infinite scroll.
 */
export const ModsPaginationFooter: React.FC<ModsPaginationFooterProps> = ({
  sentinelRef,
  isLoadingMore,
  hasMore,
}) => {
  return (
    <div
      ref={sentinelRef}
      className="w-full py-6 flex flex-col items-center justify-center gap-2 select-none"
    >
      {isLoadingMore ? (
        <div className="flex items-center gap-2 text-xs font-semibold text-[var(--md-sys-color-primary)]">
          <m3e-circular-progress-indicator
            variant="wavy"
            indeterminate
            style={
              {
                '--m3e-circular-wavy-progress-indicator-diameter': '32px',
                '--m3e-circular-progress-indicator-thickness': '3.5px',
                '--m3e-progress-indicator-color':
                  'var(--md-sys-color-primary)',
              } as React.CSSProperties
            }
          />
          <span>Loading more mods...</span>
        </div>
      ) : !hasMore ? (
        <span className="text-xs text-[var(--md-sys-color-on-surface-variant)] opacity-60">
          You&apos;ve reached the end of the collection.
        </span>
      ) : null}
    </div>
  )
}
