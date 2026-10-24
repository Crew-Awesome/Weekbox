export * from './types'
export * from './featured'

import { FeaturedService } from './featured'

const featuredServiceInstance = new FeaturedService()

export const getFeaturedMods = async () => {
  return await featuredServiceInstance.getCarousel()
}
