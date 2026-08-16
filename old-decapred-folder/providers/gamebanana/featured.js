import { nativeFetch } from "../../services/network/native-http.js";

export class FeaturedService {
  constructor({ url, getTimeAgo }) {
    this.url = url;
    this.getTimeAgo = getTimeAgo;
  }

  async getCarousel() {
    try {
      const response = await nativeFetch(this.url, { cache: "no-store" });
      if (!response.ok) throw new Error("Featured request failed");
      const featured = await response.json();
      if (!this.isSupported(featured))
        throw new Error("Unsupported featured schema");
      const mods = this.flatten(featured);
      if (mods.length === 0) throw new Error("No featured mods");
      return mods;
    } catch (error) {
      return [];
    }
  }

  isSupported(featured) {
    return (
      featured?.schemaVersion === 3 &&
      typeof featured?.revision === "string" &&
      Array.isArray(featured.rankings) &&
      featured.rankings.every(
        (ranking) =>
          Array.isArray(ranking?.mods) &&
          ranking.mods.every(
            (mod) =>
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

  flatten(featured) {
    if (!Array.isArray(featured?.rankings)) return [];
    return featured.rankings.flatMap((ranking) =>
      ranking.mods.map((mod) => {
        return {
          ...mod,
          label: ranking.label,
          timeAgo: this.getTimeAgo(mod.publishedAt),
          categoryId: Number(mod.category.id),
          engineId: mod.engine.id,
        };
      }),
    );
  }
}
