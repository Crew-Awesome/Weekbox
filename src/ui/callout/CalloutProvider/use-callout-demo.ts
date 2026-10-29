import { useCallback } from 'react'
import { VARIANT_DEFAULTS } from '../constants'
import type {
  CalloutDownloadInfo,
  CalloutDownloadOptions,
  CalloutToastOptions,
  CalloutVariant,
} from '../types'

interface CalloutDemoParams {
  show: (options: CalloutToastOptions | string) => string
  dismissAll: () => void
  download: (options: CalloutDownloadOptions | string) => string
  updateDownload: (
    id: string,
    update: Partial<CalloutDownloadInfo> & {
      message?: string
      title?: string
    },
  ) => void
}

export function useCalloutDemo({
  show,
  dismissAll,
  download,
  updateDownload,
}: CalloutDemoParams) {
  const downloadDemo = useCallback(
    (title = 'Psych Engine v0.7.3') => {
      const id = download({
        title: `Downloading ${title}`,
        message: 'Connecting to GameBanana server...',
        filename: `${title.replace(/\s+/g, '-')}.zip`,
        progress: 0,
        speed: '12.4 MB/s',
        downloaded: '0 MB',
        total: '148.5 MB',
      })

      let currentProg = 0
      const speeds = [
        '14.2 MB/s',
        '18.7 MB/s',
        '22.1 MB/s',
        '16.5 MB/s',
        '24.0 MB/s',
      ]
      const interval = setInterval(() => {
        currentProg += Math.floor(Math.random() * 8) + 6
        if (currentProg >= 100) {
          currentProg = 100
          clearInterval(interval)
          updateDownload(id, {
            progress: 100,
            status: 'completed',
            speed: 'Done',
            downloaded: '148.5 MB',
            total: '148.5 MB',
            title: 'Download Complete!',
            message: `${title} is ready in your library.`,
          })
        } else {
          const mb = ((currentProg / 100) * 148.5).toFixed(1)
          const spd = speeds[Math.floor(Math.random() * speeds.length)]
          updateDownload(id, {
            progress: currentProg,
            downloaded: `${mb} MB`,
            speed: spd,
            message: '',
          })
        }
      }, 350)

      return id
    },
    [download, updateDownload],
  )

  const demo = useCallback(() => {
    dismissAll()
    const variants: CalloutVariant[] = [
      'secondary',
      'primary',
      'tertiary',
      'error',
      'surface',
    ]

    variants.forEach((v, index) => {
      setTimeout(() => {
        show({
          variant: v,
          title: VARIANT_DEFAULTS[v].title,
          message: VARIANT_DEFAULTS[v].description,
          icon: VARIANT_DEFAULTS[v].icon,
          duration: 7500,
          canMinimize: true,
        })
      }, index * 280)
    })
  }, [dismissAll, show])

  return {
    downloadDemo,
    demo,
  }
}

