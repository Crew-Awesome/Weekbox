import React from 'react'
import type { ModItem } from '@/ui/mod-details-modal/types'
import { useUiStyle } from '@/utils/ui-style'

interface FeaturedModSlideProps {
  item: ModItem
}

export const FeaturedModSlide: React.FC<FeaturedModSlideProps> = ({ item }) => {
  const isHomeStyle = useUiStyle() === 'home'

  if (isHomeStyle) {
    return (
      <div className="w-full h-full p-1 sm:p-2">
        <div
          className="m3-card w-full h-full rounded-xl relative border overflow-hidden cursor-pointer"
          style={{
            backgroundColor: 'var(--md-sys-color-surface-container)',
            borderColor: 'var(--md-sys-color-outline-variant)',
          }}
        >
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

          {item.badge && (
            <div className="m3-card-badge absolute top-3 left-3 z-10 bg-black/75 px-3 py-1 rounded-md pointer-events-auto flex items-center">
              <span className="text-white text-xs font-medium">{item.badge}</span>
            </div>
          )}

          <div className="m3-card-content absolute inset-x-0 bottom-0 bg-black/75 px-4 py-3.5 sm:px-6 sm:py-4 flex items-center gap-3 pointer-events-none z-10">
            {item.icon && (
              <img
                src={item.icon}
                alt="engine icon"
                className="w-9 h-9 sm:w-11 sm:h-11 object-contain shrink-0"
              />
            )}
            <div className="flex flex-col overflow-hidden min-w-0">
              <h3 className="text-base sm:text-xl md:text-2xl font-bold text-white truncate leading-tight">
                {item.title}
              </h3>
              <span className="text-xs sm:text-sm text-gray-200 font-medium truncate">
                By {item.author}
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full p-1.5 sm:p-3 md:p-4">
      <div
        className="m3-card w-full h-full rounded-[22px] sm:rounded-[32px] relative shadow-none border overflow-hidden cursor-pointer"
        style={{
          backgroundColor: 'var(--md-sys-color-surface-container)',
          borderColor: 'var(--md-sys-color-outline-variant)',
        }}
      >
        <div className="absolute inset-0 overflow-hidden rounded-[22px] sm:rounded-[32px] pointer-events-none z-0">
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
          <div className="m3-card-badge absolute top-3.5 left-3.5 sm:top-6 sm:left-6 md:top-8 md:left-8 z-10 bg-black/40 backdrop-blur-md px-3 py-1 sm:px-4 sm:py-2 rounded-full border border-white/10 pointer-events-auto flex items-center gap-1.5 sm:gap-2">
            <span className="text-white text-[11px] sm:text-xs md:text-sm font-medium tracking-wide drop-shadow-md">
              {item.badge}
            </span>
          </div>
        )}

        <div className="m3-card-content absolute inset-0 p-4 sm:p-7 md:p-10 flex flex-col justify-end pointer-events-none z-10">
          <div className="flex items-center gap-3 sm:gap-5 md:gap-6">
            {item.icon && (
              <div className="relative pointer-events-auto shrink-0">
                <img
                  src={item.icon}
                  alt="engine icon"
                  className="w-10 h-10 sm:w-14 sm:h-14 md:w-16 md:h-16 object-contain drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]"
                />
              </div>
            )}
            <div className="flex flex-col overflow-hidden min-w-0">
              <h3 className="text-lg xs:text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white truncate drop-shadow-lg leading-tight">
                {item.title}
              </h3>
              <span className="text-xs sm:text-sm md:text-base text-gray-200 drop-shadow-md font-medium mt-0.5 truncate">
                By {item.author}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
