import React from 'react'
import type { TwitterMediaVideo } from '@/services/twitter'

interface NewsMediaGridProps {
  images: string[]
  videos: TwitterMediaVideo[]
  onSelectMedia?: (media: { type: 'image' | 'video'; url: string; videoSources?: string[] }) => void
}

export const NewsMediaGrid: React.FC<NewsMediaGridProps> = ({
  images,
  videos,
  onSelectMedia,
}) => {
  const allItems: Array<
    | { type: 'video'; url: string; thumbnailUrl: string; sources: string[] }
    | { type: 'image'; url: string }
  > = [
    ...videos.map((v) => ({
      type: 'video' as const,
      url: v.url,
      thumbnailUrl: v.thumbnailUrl || v.url,
      sources: v.sources,
    })),
    ...images.map((img) => ({
      type: 'image' as const,
      url: img,
    })),
  ]

  if (allItems.length === 0) return null

  const displayCount = Math.min(allItems.length, 4)

  const getGridClass = () => {
    switch (displayCount) {
      case 1:
        return 'grid-cols-1'
      case 2:
        return 'grid-cols-2'
      case 3:
        return 'grid-cols-2'
      case 4:
      default:
        return 'grid-cols-2'
    }
  }

  return (
    <div
      className={`grid ${getGridClass()} gap-2 mt-3 rounded-2xl overflow-hidden border border-[var(--md-sys-color-outline-variant)] bg-[color-mix(in_srgb,var(--md-sys-color-surface-container-high)_50%,transparent)]`}
    >
      {allItems.slice(0, 4).map((item, index) => {
        const isThirdOfThree = displayCount === 3 && index === 0
        const isVideo = item.type === 'video'
        const imageUrl = isVideo ? item.thumbnailUrl : item.url

        return (
          <div
            key={`media-${index}-${item.url}`}
            className={`relative group overflow-hidden bg-[color-mix(in_srgb,var(--md-sys-color-scrim)_20%,transparent)] cursor-pointer ${
              isThirdOfThree ? 'col-span-2' : ''
            } ${displayCount === 1 ? 'max-h-[460px] aspect-auto' : 'aspect-video'}`}
            onClick={(e) => {
              e.stopPropagation()
              if (onSelectMedia) {
                if (isVideo) {
                  onSelectMedia({
                    type: 'video',
                    url: item.url,
                    videoSources: item.sources,
                  })
                } else {
                  onSelectMedia({
                    type: 'image',
                    url: item.url,
                  })
                }
              }
            }}
          >
            <img
              src={imageUrl}
              alt=""
              loading="lazy"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />

            {isVideo && (
              <div className="absolute inset-0 flex items-center justify-center bg-[color-mix(in_srgb,var(--md-sys-color-scrim)_30%,transparent)] group-hover:bg-[color-mix(in_srgb,var(--md-sys-color-scrim)_45%,transparent)] transition-colors">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center shadow-xl transition-transform group-hover:scale-110"
                  style={{
                    backgroundColor: 'var(--md-sys-color-primary-container)',
                    color: 'var(--md-sys-color-on-primary-container)',
                  }}
                >
                  <span className="material-symbols-rounded text-2xl leading-none ml-0.5">
                    play_arrow
                  </span>
                </div>
              </div>
            )}

            {index === 3 && allItems.length > 4 && (
              <div
                className="absolute inset-0 flex items-center justify-center font-bold text-lg"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--md-sys-color-scrim) 60%, transparent)',
                  color: 'var(--md-sys-color-on-primary)',
                }}
              >
                +{allItems.length - 4}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

