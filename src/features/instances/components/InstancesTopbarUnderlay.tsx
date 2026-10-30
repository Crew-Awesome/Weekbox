import React from 'react'

export interface InstancesTopbarUnderlayProps {
  banner?: string
  progress: number
}

export const InstancesTopbarUnderlay: React.FC<InstancesTopbarUnderlayProps> = ({
  banner,
  progress,
}) => {
  if (!banner) return null

  const clampedProgress = Math.max(0, Math.min(1, progress))

  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden"
      style={{
        opacity: clampedProgress,
        transform: `translateY(${-(1 - clampedProgress) * 20}%) scale(${1 + (1 - clampedProgress) * 0.05})`,
        zIndex: 0,
      }}
    >
      <img
        src={banner}
        alt=""
        className="w-full h-full object-cover object-center"
        style={{
          filter: 'blur(10px) saturate(135%)',
          transform: 'scale(1.1)',
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundColor:
            'color-mix(in srgb, var(--md-sys-color-surface) 60%, transparent)',
        }}
      />
    </div>
  )
}
