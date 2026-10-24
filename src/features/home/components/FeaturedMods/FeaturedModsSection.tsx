import React, { useRef } from 'react'
import { Carousel, type CarouselAPI } from '@/ui/carousel'
import { Title } from '@/ui/title'
import type { ModItem } from '@/ui/mod-details-modal'
import { FeaturedModsSkeleton } from './FeaturedModsSkeleton'
import { FeaturedCarouselIndicators } from './FeaturedCarouselIndicators'
import { FeaturedModSlide } from './FeaturedModSlide'

export interface FeaturedModsSectionProps {
  items: ModItem[]
  isLoading: boolean
  onSelectMod: (mod: ModItem) => void
}

/**
 * Displays the "Featured Mods" title and either the loading skeleton or the interactive Carousel.
 */
export const FeaturedModsSection: React.FC<FeaturedModsSectionProps> = ({
  items,
  isLoading,
  onSelectMod,
}) => {
  const carouselApiRef = useRef<CarouselAPI | null>(null)

  return (
    <>
      <Title title="Featured Mods" align="center" />

      <div className="w-full">
        {isLoading && items.length === 0 ? (
          <FeaturedModsSkeleton />
        ) : (
          <Carousel
            isInfinite={items.length > 2}
            isAuto
            autoInterval={4500}
            className="h-[360px] sm:h-[440px] md:h-[480px] lg:h-[520px]"
            apiRef={carouselApiRef}
            onItemClick={(idx) => {
              const item = items[idx]
              if (item) onSelectMod(item)
            }}
            renderIndicators={(api: CarouselAPI) => (
              <FeaturedCarouselIndicators api={api} items={items} />
            )}
          >
            {items.map((item) => (
              <FeaturedModSlide key={`featured-${item.id}`} item={item} />
            ))}
          </Carousel>
        )}
      </div>
    </>
  )
}
