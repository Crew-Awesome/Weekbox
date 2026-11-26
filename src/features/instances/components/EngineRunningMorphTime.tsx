import React, { useEffect, useState } from 'react'
import { MORPH_SHAPES } from '@/ui/callout/constants'

interface EngineRunningMorphTimeProps {
  /** Formatted elapsed session time (e.g. `00:42` or `1:05:12`). */
  duration?: string | null
}

/**
 * Displays only the elapsed engine session time inside a continuously morphing
 * Material 3 Expressive `<m3e-shape>` badge.
 */
export const EngineRunningMorphTime: React.FC<EngineRunningMorphTimeProps> = ({
  duration,
}) => {
  const [shapeIndex, setShapeIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setShapeIndex((prev) => (prev + 1) % MORPH_SHAPES.length)
    }, 1100)
    return () => clearInterval(interval)
  }, [])

  const displayTime = duration || '00:00'
  const size = displayTime.length > 5 ? 52 : 44

  return (
    <div
      className="hidden min-[400px]:inline-flex items-center justify-center shrink-0 animate-in fade-in duration-300"
      title={`Engine running (${displayTime})`}
    >
      <m3e-shape
        name={MORPH_SHAPES[shapeIndex]}
        style={
          {
            '--m3e-shape-size': `${size}px`,
            '--m3e-shape-transition': 'clip-path 0.85s cubic-bezier(0.4, 0, 0.2, 1)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          } as React.CSSProperties
        }
      >
        <span
          className="font-mono font-bold tabular-nums leading-none tracking-tight select-none pointer-events-none"
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: displayTime.length > 5 ? '10px' : '11px',
            color: 'var(--md-sys-color-on-primary)',
          }}
        >
          {displayTime}
        </span>
      </m3e-shape>
    </div>
  )
}
