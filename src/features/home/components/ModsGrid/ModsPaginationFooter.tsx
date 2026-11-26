import React from 'react'
import { useUiStyle } from '@/utils/ui-style'

interface ModsPaginationFooterProps {
  sentinelRef: React.Ref<HTMLDivElement>
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
  const isHomeStyle = useUiStyle() === 'home'

  return (
    <div
      ref={sentinelRef}
      style={{ overflowAnchor: 'none' }}
      className="w-full py-6 flex flex-col items-center justify-center gap-2 select-none"
    >
      {isLoadingMore ? (
        <div className="flex items-center gap-2 text-xs font-semibold text-[var(--md-sys-color-primary)]">
          <m3e-circular-progress-indicator
            variant={isHomeStyle ? 'flat' : 'wavy'}
            indeterminate
            style={
              {
                '--m3e-circular-wavy-progress-indicator-diameter': '32px',
                '--m3e-circular-flat-progress-indicator-diameter': '32px',
                '--m3e-circular-progress-indicator-thickness': '3.5px',
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
