import React from 'react'
import type { CalloutDownloadInfo } from '../types'

interface CalloutToastDownloadProps {
  download: CalloutDownloadInfo
  downloadProgress: number
}

export const CalloutToastDownload: React.FC<CalloutToastDownloadProps> = ({
  download,
  downloadProgress,
}) => {
  return (
    <div className="flex flex-col gap-1 w-full">
      <m3e-linear-progress-indicator
        variant="wavy"
        value={downloadProgress}
        max="100"
        style={
          {
            width: '100%',
            display: 'block',
            '--m3e-linear-progress-indicator-thickness': '4px',
            '--m3e-linear-wavy-progress-indicator-amplitude': '1.8px',
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
        <span>
          {download.downloaded && download.total
            ? `${download.downloaded} / ${download.total}`
            : `${Math.round(downloadProgress)}%`}
        </span>
        {download.speed && (
          <span className="font-medium">{download.speed}</span>
        )}
      </div>
    </div>
  )
}

