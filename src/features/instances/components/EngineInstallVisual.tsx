import React, { useEffect, useState } from 'react'
import { MORPH_SHAPES } from '@/ui/callout/constants'

export type EngineInstallVisualPhase =
  | 'idle'
  | 'starting'
  | 'downloading'
  | 'extracting'
  | 'canceling'

interface EngineInstallVisualProps {
  phase: EngineInstallVisualPhase
  progress?: number
  size?: number
  showRing?: boolean
  tone?: 'inherit' | 'primary'
}

const DEFAULT_SIZE = 34
const SHAPE_RATIO = 0.7

export const EngineInstallVisual: React.FC<EngineInstallVisualProps> = ({
  phase,
  progress = 0,
  size = DEFAULT_SIZE,
  showRing = true,
  tone = 'inherit',
}) => {
  const [shapeIndex, setShapeIndex] = useState(0)
  const isCanceling = phase === 'canceling'
  const isProgressing =
    phase === 'downloading' || phase === 'extracting' || phase === 'canceling'
  const isSpinning = phase === 'starting'
  const isPrimaryTone = tone === 'primary'
  const ringColor = isCanceling
    ? 'var(--md-sys-color-error, #ba1a1a)'
    : isPrimaryTone
      ? 'var(--md-sys-color-primary)'
      : 'var(--md-sys-color-on-primary)'
  const ringTrackColor = isCanceling
    ? 'color-mix(in srgb, var(--md-sys-color-error, #ba1a1a) 22%, transparent)'
    : isPrimaryTone
      ? 'color-mix(in srgb, var(--md-sys-color-primary) 22%, transparent)'
      : 'color-mix(in srgb, var(--md-sys-color-on-primary) 24%, transparent)'
  const shapeContainerColor = isCanceling
    ? 'var(--md-sys-color-error, #ba1a1a)'
    : isPrimaryTone
      ? 'var(--md-sys-color-primary)'
      : 'var(--md-sys-color-on-primary)'
  const shapeTextColor = isCanceling
    ? 'var(--md-sys-color-on-error, #ffffff)'
    : isPrimaryTone
      ? 'var(--md-sys-color-on-primary)'
      : 'var(--md-sys-color-primary)'

  useEffect(() => {
    if (!isProgressing) return
    const interval = window.setInterval(() => {
      setShapeIndex((prev) => (prev + 1) % MORPH_SHAPES.length)
    }, 1100)
    return () => window.clearInterval(interval)
  }, [isProgressing])

  const clampedProgress = Math.max(0, Math.min(100, Math.round(progress)))
  const shapeSize = showRing
    ? Math.round(size * SHAPE_RATIO)
    : Math.round(size * 0.88)
  const iconSize = Math.round(size * 0.56)
  const transition =
    'opacity 240ms ease, transform 320ms cubic-bezier(0.2, 0, 0, 1)'

  const layerStyle = (visible: boolean): React.CSSProperties => ({
    opacity: visible ? 1 : 0,
    transform: visible ? 'scale(1)' : 'scale(0.55)',
    transition,
  })

  const progressRingStyle = {
    position: 'absolute',
    inset: 0,
    display: 'block',
    '--m3e-circular-wavy-progress-indicator-diameter': `${size}px`,
    '--m3e-circular-progress-indicator-thickness': '2.5px',
    '--m3e-circular-wavy-progress-indicator-amplitude': '1.5px',
    '--m3e-circular-wavy-progress-indicator-wavelength': '14px',
    '--m3e-progress-indicator-color': ringColor,
    '--m3e-progress-indicator-track-color': ringTrackColor,
  } as React.CSSProperties

  return (
    <span
      aria-hidden="true"
      className="relative inline-flex items-center justify-center shrink-0 pointer-events-none"
      style={{ width: size, height: size }}
    >
      <span
        className="absolute inset-0 flex items-center justify-center"
        style={layerStyle(phase === 'idle')}
      >
        <span
          className="material-symbols-rounded select-none leading-none flex items-center justify-center"
          style={{
            fontSize: `${iconSize}px`,
            width: iconSize,
            height: iconSize,
            color: 'currentColor',
          }}
        >
          cloud_download
        </span>
      </span>

      <span
        className="absolute inset-0 flex items-center justify-center"
        style={layerStyle(isSpinning)}
      >
        <m3e-circular-progress-indicator
          variant="wavy"
          indeterminate
          style={
            {
              display: 'block',
              '--m3e-circular-wavy-progress-indicator-diameter': `${size}px`,
              '--m3e-circular-progress-indicator-thickness': '2.5px',
              '--m3e-circular-wavy-progress-indicator-amplitude': '1.5px',
              '--m3e-circular-wavy-progress-indicator-wavelength': '14px',
              '--m3e-progress-indicator-color': ringColor,
              '--m3e-progress-indicator-track-color': 'transparent',
            } as React.CSSProperties
          }
        />
      </span>

      <span
        className="absolute inset-0 flex items-center justify-center"
        style={layerStyle(isProgressing)}
      >
        {showRing && (
          <m3e-circular-progress-indicator
            variant="wavy"
            value={clampedProgress}
            max="100"
            style={progressRingStyle}
          />
        )}
        <m3e-shape
          name={MORPH_SHAPES[shapeIndex]}
          style={
            {
              '--m3e-shape-size': `${shapeSize}px`,
              '--m3e-shape-container-color': shapeContainerColor,
              '--m3e-shape-transition':
                'clip-path 0.85s cubic-bezier(0.4, 0, 0.2, 1)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            } as React.CSSProperties
          }
        >
          <span
            className="font-mono font-bold leading-none select-none"
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: Math.max(8, Math.round(size * 0.26)),
              color: shapeTextColor,
            }}
          >
            {clampedProgress}%
          </span>
        </m3e-shape>
      </span>
    </span>
  )
}
