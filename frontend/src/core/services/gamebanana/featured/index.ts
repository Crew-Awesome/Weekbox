export * from "./types";
export * from "./service";

import { FeaturedService } from "./service";

const featuredServiceInstance = new FeaturedService();

export const getFeaturedMods = async () => {
  return await featuredServiceInstance.getCarousel();
};
