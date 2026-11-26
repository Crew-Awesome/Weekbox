import React from 'react'
import { useUiStyle } from '@/utils/ui-style'

/**
 * Loading skeleton displayed while featured mods are being fetched from GameBanana.
 */
export const FeaturedModsSkeleton: React.FC = () => {
  const isHomeStyle = useUiStyle() === 'home'

  return (
    <div
      className={`w-full h-[360px] sm:h-[400px] md:h-[460px] lg:h-[560px] xl:h-[620px] ${
        isHomeStyle ? 'rounded-xl' : 'rounded-[24px] sm:rounded-[32px] animate-pulse'
      } border flex flex-col items-center justify-center gap-3`}
      style={{
        backgroundColor: 'var(--md-sys-color-surface-container)',
        borderColor: 'var(--md-sys-color-outline-variant)',
      }}
    >
      <m3e-circular-progress-indicator
        variant={isHomeStyle ? 'flat' : 'wavy'}
        indeterminate
        style={
          {
            '--m3e-circular-wavy-progress-indicator-diameter': isHomeStyle ? '48px' : '68px',
            '--m3e-circular-flat-progress-indicator-diameter': isHomeStyle ? '48px' : '68px',
            '--m3e-circular-progress-indicator-thickness': isHomeStyle ? '4px' : '5px',
            '--m3e-circular-wavy-progress-indicator-amplitude': '2.5px',
            '--m3e-circular-wavy-progress-indicator-wavelength': '18px',
          } as React.CSSProperties
        }
      />
      <span className="text-sm font-semibold opacity-75 text-[var(--md-sys-color-on-surface)]">
        Loading Featured Mods from GameBanana...
      </span>
    </div>
  )
}
