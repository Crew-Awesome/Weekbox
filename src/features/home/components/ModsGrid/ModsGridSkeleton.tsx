import React from 'react'

interface ModsGridSkeletonProps {
  count?: number
  className?: string
}

/**
 * Renders a grid of animated placeholder cards while mods are loading.
 */
export const ModsGridSkeleton: React.FC<ModsGridSkeletonProps> = ({
  count = 8,
  className = '',
}) => {
  return (
    <div
      className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-4 w-full ${className}`}
    >
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={`mod-skeleton-${idx}`}
          className="w-full rounded-2xl bg-[var(--md-sys-color-surface-container)] animate-pulse border border-[var(--md-sys-color-outline-variant)]/20 flex flex-col p-3.5 gap-2.5"
        >
          <div className="w-full aspect-[16/9] rounded-xl bg-[var(--md-sys-color-surface-container-highest)] animate-pulse" />
          <div className="w-3/4 h-4 rounded-md bg-[var(--md-sys-color-surface-container-highest)] animate-pulse" />
          <div className="w-1/2 h-3 rounded-md bg-[var(--md-sys-color-surface-container-highest)] animate-pulse" />
        </div>
      ))}
    </div>
  )
}
