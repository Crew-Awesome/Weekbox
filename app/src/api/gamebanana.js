import { FeaturedService } from "./gamebanana/featuredService.js";
import { CategoryFeedService } from "./gamebanana/categoryFeedService.js";
import { GameBananaTransport } from "./gamebanana/transport.js";
import { DISCOVERY_CONFIG } from "../config/discovery.js";
import {
  ENGINE_CATEGORY_IDS,
  ENGINE_CATEGORY_ROOTS,
} from "../config/engines.js";

export const gameBananaApi = {
  baseUrl: "https://gamebanana.com/apiv11",
  gameId: 8694,
  categoryRoots: ENGINE_CATEGORY_ROOTS,
  engineCategories: ENGINE_CATEGORY_IDS,
  legacyEngineCategories: {
    43774: "vslice", // Originals / Full Mods (Base)
  },
  featuredUrl:
    "https://raw.githubusercontent.com/Crew-Awesome/weekbox.featured/main/public/featured.json",
  featuredCacheKey: "weekbox-featured-v2",
  searchCache: new Map(),
  featuredService: null,
  categoryFeedService: null,
  categoryTransport: null,
  discoveryConfig: DISCOVERY_CONFIG,

  getImageUrl(mod) {
    if (
      mod._aPreviewMedia &&
      mod._aPreviewMedia._aImages &&
      mod._aPreviewMedia._aImages.length > 0
    ) {
      const img = mod._aPreviewMedia._aImages[0];
      return `${img._sBaseUrl}/${img._sFile}`;
    }
    return "https://images.gamebanana.com/img/ss/mods/default.jpg";
  },

  getEngineIdForCategory(categoryId) {
    const id = Number(categoryId);
    return this.engineCategories[id] || this.legacyEngineCategories[id] || null;
  },

  getCategoryId(category) {
    if (!category || typeof category !== "object") return null;
    const id =
      category._idRow ||
      category._idCategory ||
      category._sProfileUrl?.match(/\/mods\/cats\/(\d+)/)?.[1];
    return Number.isFinite(Number(id)) ? Number(id) : null;
  },

  // 1. Detección Inteligente y recursiva de categorías y motores
  getEngineIdForCategories(...categories) {
    const pending = categories.filter((c) => c !== null && c !== undefined);
    const seen = new Set();

    while (pending.length > 0) {
      const category = pending.shift();

      // Si recibimos directamente un número de categoría (ID directo)
      if (typeof category === "number" || typeof category === "string") {
        const engineId = this.getEngineIdForCategory(Number(category));
        if (engineId) return engineId;
        continue;
      }

      // Si ya analizamos este objeto o no es un objeto, pasamos
      if (typeof category !== "object" || seen.has(category)) {
        continue;
      }
      seen.add(category);

      const engineId = this.getEngineIdForCategory(
        this.getCategoryId(category),
      );
      if (engineId) return engineId;

      pending.push(
        category._aCategory,
        category._aSuperCategory,
        category._aParentCategory,
      );
    }
    return null;
  },

  getValidRecords(data) {
    if (data && Array.isArray(data._aRecords)) return data._aRecords;
    if (Array.isArray(data)) return data;
    return [];
  },

  getTimeAgo(timestamp) {
    if (!timestamp) return "N/A";
    const seconds = Math.floor(Date.now() / 1000) - timestamp;
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "mo";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m";
    return Math.floor(seconds) + "s";
  },

  formatBytes(bytes, decimals = 2) {
    if (!+bytes) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  },

  async getModDetails(modId) {
    try {
      const res = await fetch(`${this.baseUrl}/Mod/${modId}/ProfilePage`);
      const data = await res.json();
      let images = [];
      if (data._aPreviewMedia && data._aPreviewMedia._aImages) {
        images = data._aPreviewMedia._aImages.map(
          (img) => `${img._sBaseUrl}/${img._sFile}`,
        );
      }
      if (images.length === 0)
        images.push("https://images.gamebanana.com/img/ss/mods/default.jpg");
      let fileSize = 0;
      let downloadUrl = "";
      if (data._aFiles) {
        const filesArray = Object.values(data._aFiles);
        if (filesArray.length > 0) {
          fileSize = filesArray[0]._nFilesize || 0;
          downloadUrl = filesArray[0]._sDownloadUrl || "";
        }
      }
      return {
        id: data._idRow,
        title: data._sName,
        author: data._aSubmitter?._sName || "Unknown Creator",
        description: data._sText || "<p>No description available.</p>",
        likes: data._nLikeCount || 0,
        views: data._nViewCount || 0,
        timeAgo: this.getTimeAgo(data._tsDateAdded),
        images: images,
        fileSizeStr: this.formatBytes(fileSize),
        downloadUrl: downloadUrl,
        gameId: Number(data._aGame?._idRow || data._idGame || 0),
        engineId: this.getEngineIdForCategories(
          data._aCategory,
          data._aSuperCategory,
          data._aRootCategory,
          data._aSubCategory,
          data._idCategory,
        ),
      };
    } catch (error) {
      return null;
    }
  },

  async getFeaturedCarousel() {
    if (!this.featuredService) {
      this.featuredService = new FeaturedService({
        url: this.featuredUrl,
        cacheKey: this.featuredCacheKey,
        getTimeAgo: this.getTimeAgo.bind(this),
        getEngineIdForCategory: this.getEngineIdForCategory.bind(this),
      });
    }
    return this.featuredService.getCarousel();
  },

  toGridMod(mod) {
    return {
      id: mod._idRow,
      title: mod._sName,
      author: mod._aSubmitter?._sName || "Unknown",
      gameId: Number(mod._aGame?._idRow || mod._idGame || 0),
      image: this.getImageUrl(mod),
      likes: mod._nLikeCount || 0,
      views: mod._nViewCount || 0,
      timeAgo: this.getTimeAgo(mod._tsDateAdded),
      engineId: this.getEngineIdForCategories(
        mod.__injectedCategoryId, // Pasamos el ID inyectado primero para prioridad
        mod._aCategory,
        mod._aSuperCategory,
        mod._aRootCategory,
        mod._aSubCategory,
        mod._idCategory,
      ),
    };
  },

  async getGridMods(filter = "popular", page = 1, categoryId = null, options = {}) {
    return this.getCategoryFeed().getGridMods(filter, page, categoryId, options);
  },

  getCategoryFeed() {
    if (!this.categoryFeedService) {
      this.categoryTransport = new GameBananaTransport({
        baseUrl: this.baseUrl,
        config: this.discoveryConfig,
      });
      this.categoryFeedService = new CategoryFeedService({
        transport: this.categoryTransport,
        gameId: this.gameId,
        categoryRoots: this.categoryRoots,
        getRecords: this.getValidRecords.bind(this),
        toGridMod: this.toGridMod.bind(this),
        getEngineId: (mod, categoryId) => this.getEngineIdForCategories(categoryId, mod._aCategory, mod._aSuperCategory, mod._aRootCategory, mod._aSubCategory, mod._idCategory),
      });
    }
    return this.categoryFeedService;
  },

  getSearchScore(mod, query) {
    const title = String(mod._sName || "").toLocaleLowerCase();
    const normalizedQuery = query.toLocaleLowerCase();
    const words = normalizedQuery.split(/\s+/).filter(Boolean);
    const exactTitle = title === normalizedQuery ? 1000000000 : 0;
    const startsWithQuery = title.startsWith(normalizedQuery) ? 100000000 : 0;
    const matchingWords =
      words.filter((word) => title.includes(word)).length * 1000000;
    const likes = Number(mod._nLikeCount || 0) * 10;
    const views = Number(mod._nViewCount || 0);
    return exactTitle + startsWithQuery + matchingWords + likes + views;
  },

  async searchMods(query, page = 1, perPage = 12) {
    try {
      const normalizedQuery = query.trim().replace(/\s+/g, " ");
      if (!normalizedQuery) return [];

      const cacheKey = `${normalizedQuery.toLocaleLowerCase()}:${page}:${perPage}`;
      if (this.searchCache.has(cacheKey)) return this.searchCache.get(cacheKey);

      let directMod = null;
      const idMatch = normalizedQuery.match(
        /^(?:https?:\/\/)?(?:gamebanana\.com\/mods\/)?(\d+)(?:\/.*)?$/i,
      );

      if (page === 1 && idMatch && idMatch[1]) {
        const specificMod = await this.getModDetails(idMatch[1]);
        if (specificMod?.gameId === this.gameId) {
          directMod = {
            id: specificMod.id,
            title: specificMod.title,
            author: specificMod.author,
            gameId: specificMod.gameId,
            image: specificMod.images[0],
            likes: specificMod.likes,
            views: specificMod.views,
            timeAgo: specificMod.timeAgo,
            engineId: specificMod.engineId,
          };
        }
      }

      const params = new URLSearchParams({
        _sModelName: "Mod",
        _sSearchString: `${normalizedQuery} fnf`,
        _nPage: String(page),
        _nPerpage: String(perPage),
      });
      params.set("_aFilters[Generic_Game]", String(this.gameId));
      const res = await fetch(`${this.baseUrl}/Util/Search/Results?${params}`);
      if (!res.ok) throw new Error("Mod search failed");
      const data = await res.json();
      const records = this.getValidRecords(data).filter(
        (mod) =>
          mod._sModelName === "Mod" &&
          Number(mod._aGame?._idRow || mod._idGame) === this.gameId,
      );

      let parsedMods = [
        ...new Map(records.map((mod) => [mod._idRow, mod])).values(),
      ]
        .sort(
          (left, right) =>
            this.getSearchScore(right, normalizedQuery) -
            this.getSearchScore(left, normalizedQuery),
        )
        .map((mod) => this.toGridMod(mod));

      if (directMod) {
        parsedMods = parsedMods.filter((m) => m.id !== directMod.id);
        parsedMods.unshift(directMod);
      }
      this.searchCache.set(cacheKey, parsedMods);
      if (this.searchCache.size > 40)
        this.searchCache.delete(this.searchCache.keys().next().value);
      return parsedMods;
    } catch (error) {
      return [];
    }
  },
};
