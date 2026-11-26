import React from 'react'
import { useSmoothProgress } from '@/utils/hooks/use-smooth-progress'
import { useUiStyle } from '@/utils/ui-style'
import type { CalloutDownloadInfo } from '../types'

interface CalloutToastDownloadProps {
  download: CalloutDownloadInfo
  downloadProgress: number
}

export const CalloutToastDownload: React.FC<CalloutToastDownloadProps> = ({
  download,
  downloadProgress,
}) => {
  const isHomeStyle = useUiStyle() === 'home'
  const isExtracting = download.status === 'extracting'
  const smoothProgress = useSmoothProgress(downloadProgress, {
    isActive:
      download.status !== 'completed' &&
      download.status !== 'error' &&
      !isExtracting,
    maxRatePerSec: 68,
    easing: 5.5,
    smoothBackward: true,
  })
  const waveAmplitude = isExtracting
    ? '1.8'
    : smoothProgress >= 92
      ? Math.max(0.2, 1.8 * (1 - (smoothProgress - 92) / 8)).toFixed(2)
      : '1.8'

  return (
    <div className="flex flex-col gap-1 w-full">
      <m3e-linear-progress-indicator
        variant={isHomeStyle ? 'flat' : 'wavy'}
        mode={isExtracting ? 'indeterminate' : 'determinate'}
        value={isExtracting ? undefined : Math.round(smoothProgress * 10) / 10}
        max="100"
        style={
          {
            width: '100%',
            display: 'block',
            '--m3e-linear-progress-indicator-thickness': '4px',
            '--m3e-linear-wavy-progress-indicator-amplitude': `${waveAmplitude}px`,
            '--m3e-linear-wavy-progress-indicator-wavelength': '15px',
            '--m3e-progress-indicator-color':
              download.status === 'completed'
                ? 'var(--md-sys-color-tertiary, #388e3c)'
                : 'var(--md-sys-color-primary)',
            '--m3e-progress-indicator-track-color': 'rgba(0, 0, 0, 0.12)',
          } as React.CSSProperties
        }
      />
      <div className="flex items-center justify-between text-[11px] opacity-80 font-mono select-none">
        <span className="truncate max-w-[180px]">
          {download.downloaded && download.total
            ? `${download.downloaded} / ${download.total}`
            : isExtracting
              ? download.filename || 'Extracting archive...'
              : `${Math.round(smoothProgress)}%`}
        </span>
        {download.speed && (
          <span className="font-medium shrink-0">{download.speed}</span>
        )}
      </div>
    </div>
  )
}

