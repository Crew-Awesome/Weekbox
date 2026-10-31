import React, { useEffect } from 'react'
import { M3eVideoPlayer } from './M3eVideoPlayer'

interface NewsMediaModalProps {
  media: {
    type: 'image' | 'video'
    url: string
    videoSources?: string[]
  } | null
  onClose: () => void
}

export const NewsMediaModal: React.FC<NewsMediaModalProps> = ({
  media,
  onClose,
}) => {
  useEffect(() => {
    if (!media) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [media, onClose])

  if (!media) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 backdrop-blur-md animate-fade-in"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--md-sys-color-scrim) 80%, transparent)',
      }}
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl max-h-[92vh] w-full flex items-center justify-center overflow-hidden rounded-[28px] shadow-2xl"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--md-sys-color-scrim) 40%, transparent)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {media.type === 'video' ? (
          <M3eVideoPlayer
            sources={media.videoSources && media.videoSources.length > 0 ? media.videoSources : [media.url]}
            autoPlay
            onClose={onClose}
          />
        ) : (
          <div className="relative w-full flex items-center justify-center">
            <div className="absolute top-4 right-4 z-20">
              <m3e-icon-button
                onClick={onClose}
                title="Close"
                style={
                  {
                    cursor: 'pointer',
                    '--m3e-icon-button-container-color':
                      'color-mix(in srgb, var(--md-sys-color-scrim) 65%, transparent)',
                    '--m3e-icon-button-icon-color': 'var(--md-sys-color-on-primary)',
                  } as React.CSSProperties
                }
              >
                <span className="material-symbols-rounded text-xl leading-none">
                  close
                </span>
              </m3e-icon-button>
            </div>

            <img
              src={media.url}
              alt=""
              referrerPolicy="no-referrer"
              className="w-full max-h-[85vh] object-contain rounded-[28px]"
            />
          </div>
        )}
      </div>
    </div>
  )
}
