import React from 'react'
import type { CarouselAPI } from '@/ui/carousel'
import type { ModItem } from '@/ui/mod-details-modal'

interface FeaturedCarouselIndicatorsProps {
  api: CarouselAPI
  items: ModItem[]
}

/**
 * Renders navigation chevrons and animated progress pill indicators for the Featured Mods carousel.
 */
export const FeaturedCarouselIndicators: React.FC<
  FeaturedCarouselIndicatorsProps
> = ({ api, items }) => {
  const currentActiveMod = items[api.activeIndex]
  const activeLabel = currentActiveMod?.badge || 'Featured'

  const categoryItems = items
    .map((m, idx) => ({ ...m, absoluteIndex: idx }))
    .filter((m) => !activeLabel || m.badge === activeLabel)

  return (
    <div className="flex items-center justify-center gap-3 mt-4 px-4 w-full select-none z-10 pointer-events-none">
      <m3e-icon-button
        onClick={() => api.prev()}
        className="w-9 h-9 pointer-events-auto"
        aria-label="Previous item"
      >
        <span className="material-symbols-rounded text-xl leading-none">
          chevron_left
        </span>
      </m3e-icon-button>

      <div className="flex gap-1.5 justify-center items-center pointer-events-auto flex-wrap">
        {categoryItems.map((item) => {
          const isActive = api.activeIndex === item.absoluteIndex
          return (
            <div
              key={`indicator-${item.id}-${item.absoluteIndex}`}
              onClick={() => api.goToLogicalIndex(item.absoluteIndex)}
              className={`h-2.5 rounded-full overflow-hidden transition-all duration-300 cursor-pointer relative ${
                isActive
                  ? 'w-10 sm:w-14 shadow-sm'
                  : 'w-2.5 opacity-60 hover:opacity-100'
              }`}
              style={{
                backgroundColor:
                  'var(--md-sys-color-surface-container-highest)',
                border: '1px solid var(--md-sys-color-outline-variant)',
              }}
            >
              {isActive && (
                <div
                  ref={api.bindProgressRef(item.absoluteIndex)}
                  className="absolute inset-0 h-full w-full rounded-full origin-left"
                  style={{
                    backgroundColor: 'var(--md-sys-color-primary)',
                    transform: 'scaleX(0)',
                  }}
                />
              )}
            </div>
          )
        })}
      </div>

      <m3e-icon-button
        onClick={() => api.next()}
        className="w-9 h-9 pointer-events-auto"
        aria-label="Next item"
      >
        <span className="material-symbols-rounded text-xl leading-none">
          chevron_right
        </span>
      </m3e-icon-button>
    </div>
  )
}
