import React from 'react'
import type { ModItem } from '@/ui/mod-details-modal'

interface FeaturedModSlideProps {
  item: ModItem
}

/**
 * Individual hero card slide rendered inside the Featured Mods carousel.
 */
export const FeaturedModSlide: React.FC<FeaturedModSlideProps> = ({ item }) => {
  return (
    <div className="w-full h-full p-2 sm:p-4">
      <div
        className="m3-card w-full h-full rounded-[32px] relative shadow-none border overflow-hidden cursor-pointer"
        style={{
          backgroundColor: 'var(--md-sys-color-surface-container)',
          borderColor: 'var(--md-sys-color-outline-variant)',
        }}
      >
        <div className="absolute inset-0 overflow-hidden rounded-[32px] pointer-events-none z-0">
          <img
            src={item.image || item.img}
            alt={item.title}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.src = '/imgs/images/placeholder-mini.webp'
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent" />
        </div>

        {item.badge && (
          <div className="m3-card-badge absolute top-6 left-6 sm:top-8 sm:left-8 z-10 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 pointer-events-auto flex items-center gap-2">
            <span className="text-white text-xs sm:text-sm font-medium tracking-wide drop-shadow-md">
              {item.badge}
            </span>
          </div>
        )}

        <div className="m3-card-content absolute inset-0 p-6 sm:p-10 flex flex-col justify-end pointer-events-none z-10">
          <div className="flex items-center gap-4 sm:gap-6">
            {item.icon && (
              <div className="relative pointer-events-auto shrink-0">
                <img
                  src={item.icon}
                  alt="engine icon"
                  className="w-12 h-12 sm:w-16 sm:h-16 object-contain drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]"
                />
              </div>
            )}
            <div className="flex flex-col overflow-hidden">
              <h3 className="text-xl sm:text-3xl lg:text-4xl font-bold text-white truncate drop-shadow-lg">
                {item.title}
              </h3>
              <span className="text-sm sm:text-base text-gray-200 drop-shadow-md font-medium mt-0.5">
                By {item.author}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
