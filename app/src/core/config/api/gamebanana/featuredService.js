export class FeaturedService {
  constructor({ url, cacheKey, getTimeAgo }) {
    this.url = url;
    this.cacheKey = cacheKey;
    this.getTimeAgo = getTimeAgo;
  }

  async getCarousel() {
    const cached = this.getCached();
    try {
      const response = await fetch(this.url, { cache: "no-store" });
      if (!response.ok) throw new Error("Featured request failed");
      const featured = await response.json();
      if (!this.isSupported(featured))
        throw new Error("Unsupported featured schema");
      if (cached?.revision === featured.revision) return this.flatten(cached.featured);
      const mods = this.flatten(featured);
      if (mods.length === 0) throw new Error("No featured mods");
      localStorage.setItem(
        this.cacheKey,
        JSON.stringify({ revision: featured.revision, featured }),
      );
      return mods;
    } catch (error) {
      return cached ? this.flatten(cached.featured) : [];
    }
  }

  getCached() {
    try {
      const value = localStorage.getItem(this.cacheKey);
      const featured = value ? JSON.parse(value) : null;
      return this.isCachedFeatureSet(featured) ? featured : null;
    } catch (error) {
      return null;
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

  isCachedFeatureSet(value) {
    return (
      typeof value?.revision === "string" &&
      value.revision === value.featured?.revision &&
      this.isSupported(value.featured)
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
