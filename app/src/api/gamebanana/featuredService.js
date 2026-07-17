export class FeaturedService {
  constructor({ url, manifestUrl, getTimeAgo }) {
    this.url = url;
    this.manifestUrl = manifestUrl;
    this.getTimeAgo = getTimeAgo;
  }

  async getCarousel() {
    try {
      const manifest = await this.fetchManifest();
      const featuredUrl = new URL(manifest.featuredUrl, this.url).href;
      const response = await fetch(featuredUrl, { cache: "no-store" });
      if (!response.ok) throw new Error("Featured request failed");
      const featured = await response.json();
      if (!this.isSupported(featured))
        throw new Error("Unsupported featured schema");
      if (featured.revision !== manifest.revision)
        throw new Error("Featured revision did not match manifest");
      const mods = this.flatten(featured);
      if (mods.length === 0) throw new Error("No featured mods");
      return mods;
    } catch (error) {
      return [];
    }
  }

  async fetchManifest() {
    const response = await fetch(this.manifestUrl, { cache: "no-store" });
    if (!response.ok) throw new Error("Featured manifest request failed");
    const manifest = await response.json();
    if (
      manifest?.schemaVersion !== 1 ||
      typeof manifest?.revision !== "string" ||
      !manifest.revision
    ) {
      throw new Error("Unsupported featured manifest");
    }
    return manifest;
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
