import React from 'react'

/**
 * Loading skeleton displayed while featured mods are being fetched from GameBanana.
 */
export const FeaturedModsSkeleton: React.FC = () => {
  return (
    <div
      className="w-full h-[360px] sm:h-[440px] md:h-[480px] lg:h-[520px] rounded-[32px] border flex flex-col items-center justify-center animate-pulse gap-3"
      style={{
        backgroundColor: 'var(--md-sys-color-surface-container)',
        borderColor: 'var(--md-sys-color-outline-variant)',
      }}
    >
      <m3e-circular-progress-indicator
        variant="wavy"
        indeterminate
        style={
          {
            '--m3e-circular-wavy-progress-indicator-diameter': '68px',
            '--m3e-circular-progress-indicator-thickness': '5px',
            '--m3e-circular-wavy-progress-indicator-amplitude': '2.5px',
            '--m3e-circular-wavy-progress-indicator-wavelength': '18px',
            '--m3e-progress-indicator-color': 'var(--md-sys-color-primary)',
            '--m3e-progress-indicator-track-color':
              'color-mix(in srgb, var(--md-sys-color-on-surface) 8%, transparent)',
          } as React.CSSProperties
        }
      />
      <span className="text-sm font-semibold opacity-75 text-[var(--md-sys-color-on-surface)]">
        Loading Featured Mods from GameBanana...
      </span>
    </div>
  )
}
