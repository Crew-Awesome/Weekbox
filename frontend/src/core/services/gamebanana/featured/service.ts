import http from "@http";
import { getTimeAgo, getEngineIcon } from "../utils";
import Utils from "@utils";
import type { GameBananaMod } from "../types";
import type { FeaturedSchema, FeaturedModRaw } from "./types";
import { FNF_GAME_ID } from "../constants";

export const FEATURED_URL =
  "https://raw.githubusercontent.com/Crew-Awesome/weekbox.featured/main/public/featured.json";

/**
 * @description Service responsible for fetching and parsing the external Featured Mods JSON feed.
 * Allows remote management of "Community Picks" or "Best of the Week" carousels
 * without requiring application updates.
 */
export class FeaturedService {
  private url: string;

  constructor(url: string = FEATURED_URL) {
    this.url = url;
  }

  /**
   * @description Fetches the featured schema and flattens it into an array of standard mod records.
   * @returns {Promise<GameBananaMod[]>} Array of featured mods.
   */
  public async getCarousel(): Promise<GameBananaMod[]> {
    try {
      const response = (await http.fetchJson(this.url)) as FeaturedSchema;

      if (!this.isSupported(response)) {
        throw new Error("Unsupported featured schema");
      }

      const mods = this.flatten(response);
      if (mods.length === 0) throw new Error("No featured mods");

      return mods;
    } catch (error) {
      console.warn(
        "FeaturedService error (static JSON failed), triggering dynamic fallback algorithm:",
        error,
      );
      return await this.fetchDynamicFallback();
    }
  }

  /**
   * @description Fallback algorithm that generates dynamic banners when the static JSON fails.
   * Ensures no duplicates and assigns temporal labels (Day, Week, Month, etc.) and Ripe fallbacks.
   */
  private async fetchDynamicFallback(): Promise<GameBananaMod[]> {
    try {
      // Import dynamically to avoid circular dependencies
      const { getMods } = await import("../api/getMods");

      const popular = await getMods("popular", 1, 30);
      const ripe = await getMods("ripe", 1, 15);

      // Deduplicate to ensure we NEVER reuse the same mods
      const seen = new Set<number>();
      const combined: GameBananaMod[] = [];

      for (const mod of [...popular, ...ripe]) {
        if (!seen.has(mod.id)) {
          seen.add(mod.id);
          combined.push(mod);
        }
      }

      const labels = [
        "Mod del Día",
        "Mod de la Semana",
        "Mod del Mes",
        "Hace 6 Meses",
        "Mod del Año",
        "De Todos los Tiempos",
        "Trending Ripe",
      ];

      // Shuffle combined to give variety every time it falls back
      const shuffled = combined.sort(() => 0.5 - Math.random());

      const result: GameBananaMod[] = [];
      for (let i = 0; i < labels.length && i < shuffled.length; i++) {
        result.push({
          ...shuffled[i],
          __featuredLabel: labels[i],
        });
      }

      return result;
    } catch (fallbackError) {
      console.error("Dynamic fallback also failed:", fallbackError);
      return [];
    }
  }

  /**
   * @description Validates the incoming JSON structure against the expected schema version (v3).
   * @param {any} featured - The raw JSON response.
   * @returns {boolean} True if the schema is valid and supported.
   */
  private isSupported(featured: any): featured is FeaturedSchema {
    return (
      featured?.schemaVersion === 3 &&
      typeof featured?.revision === "string" &&
      Array.isArray(featured.rankings) &&
      featured.rankings.every(
        (ranking: any) =>
          Array.isArray(ranking?.mods) &&
          ranking.mods.every(
            (mod: any) =>
              Number.isFinite(Number(mod?.id)) &&
              typeof mod?.title === "string" &&
              typeof mod?.author === "string" &&
              typeof mod?.image === "string" &&
              typeof mod?.engine?.id === "string" &&
              typeof mod?.engine?.name === "string" &&
              typeof mod?.engine?.icon === "string" &&
              Number.isFinite(Number(mod?.category?.id)) &&
              typeof mod?.category?.name === "string",
          ),
      )
    );
  }

  /**
   * @description Flattens the nested rankings structure into a linear array of standard `GameBananaMod` objects.
   * @param {FeaturedSchema} featured - The validated featured schema.
   * @returns {GameBananaMod[]} A flattened array of mods, enriched with `__featuredLabel` for the UI.
   */
  private flatten(featured: FeaturedSchema): GameBananaMod[] {
    if (!Array.isArray(featured?.rankings)) return [];

    return featured.rankings.flatMap((ranking) =>
      ranking.mods.map((mod: FeaturedModRaw) => {
        const resolvedIcon = getEngineIcon(mod.engine.id) || mod.engine.icon;

        return {
          id: mod.id,
          gameId: FNF_GAME_ID,
          title: mod.title,
          description: Utils.sanitize.htmlToPlainText(
            mod.description || "Featured Mod",
          ),
          htmlBody: Utils.sanitize.sanitizeHtml(
            mod.description || "Featured Mod",
          ),
          author: mod.author,
          userId: 0,
          userPfp: "",
          authors: [mod.author],
          likes: mod.likes || 0,
          views: mod.views || 0,
          downloads: mod.downloads || 0,
          submittedAt: mod.publishedAt,
          timeAgo: getTimeAgo(mod.publishedAt),
          engineId: mod.engine.id,
          engineIcon: resolvedIcon,
          thumbnail: mod.image,
          // Custom featured properties we might want to pass
          __featuredLabel: ranking.label,
          __featuredCategoryId: mod.category.id,
        } as GameBananaMod;
      }),
    );
  }
}
