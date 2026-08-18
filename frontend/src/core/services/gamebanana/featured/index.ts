export * from "./types";
export * from "./service";

import { FeaturedService } from "./service";

const featuredServiceInstance = new FeaturedService();

/**
 * @description Instantiates the FeaturedService and fetches the carousel payload.
 * @returns {Promise<GameBananaMod[]>} The processed featured mods.
 */
export const getFeaturedMods = async () => {
  return await featuredServiceInstance.getCarousel();
};
