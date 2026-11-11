import React, { useRef } from 'react'
import { Carousel, type CarouselAPI } from '@/ui/carousel/Carousel'
import { Title } from '@/ui/title/Title'
import type { ModItem } from '@/ui/mod-details-modal/types'
import { FeaturedModsSkeleton } from './FeaturedModsSkeleton'
import { FeaturedCarouselIndicators } from './FeaturedCarouselIndicators'
import { FeaturedModSlide } from './FeaturedModSlide'

export interface FeaturedModsSectionProps {
  items: ModItem[]
  isLoading: boolean
  onSelectMod: (mod: ModItem) => void
}

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
            className="h-[360px] sm:h-[400px] md:h-[460px] lg:h-[560px] xl:h-[620px]"
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
