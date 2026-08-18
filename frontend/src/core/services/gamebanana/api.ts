import { getMods } from "./api/getMods";
import { getTools } from "./api/getTools";
import { getFeaturedMods } from "./featured";
export type { ModFilter } from "./api/getMods";

/**
 * @description Centralized export for all GameBanana API interaction endpoints.
 */
export const gameBananaApi = {
  getMods,
  getTools,
  getFeaturedMods,
};
