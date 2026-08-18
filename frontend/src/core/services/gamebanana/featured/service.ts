import http from "@http";
import { getTimeAgo, getEngineIcon } from "../utils";
import Utils from "@utils";
import type { GameBananaMod } from "../types";
import type { FeaturedSchema, FeaturedModRaw } from "./types";
import { FNF_GAME_ID } from "../constants";

export const FEATURED_URL =
  "https://raw.githubusercontent.com/Crew-Awesome/weekbox.featured/main/public/featured.json";

export class FeaturedService {
  private url: string;

  constructor(url: string = FEATURED_URL) {
    this.url = url;
  }

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
      console.warn("FeaturedService error:", error);
      return [];
    }
  }

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
