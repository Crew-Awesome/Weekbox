import { FeaturedService } from "./gamebanana/featuredService.js";
import { CategoryFeedService } from "./gamebanana/categoryFeedService.js";
import { GameBananaTransport } from "./gamebanana/transport.js";
import { DISCOVERY_CONFIG } from "../config/discovery.js";
import {
  ENGINE_CATEGORY_IDS,
  ENGINE_CATEGORY_ROOTS,
  EXCLUDED_MOD_CATEGORY_IDS,
} from "../config/engines.js";

export const gameBananaApi = {
  baseUrl: "https://gamebanana.com/apiv11",
  subfeedBaseUrl: "https://gamebanana.com/apiv12",
  gameId: 8694,
  categoryRoots: ENGINE_CATEGORY_ROOTS,
  excludedCategoryIds: new Set(EXCLUDED_MOD_CATEGORY_IDS),
  engineCategories: ENGINE_CATEGORY_IDS,
  legacyEngineCategories: {
    43774: "vslice", // Originals / Full Mods (Base)
  },
  featuredUrl:
    "https://raw.githubusercontent.com/Crew-Awesome/weekbox.featured/main/public/featured.json",
  featuredManifestUrl:
    "https://raw.githubusercontent.com/Crew-Awesome/weekbox.featured/main/public/featured-manifest.json",
  featuredCacheKey: "weekbox-featured-v3",
  searchCache: new Map(),
  ripeFeedCache: new Map(),
  modProfileCache: new Map(),
  modProfileRequests: new Map(),
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

  getEngineIdForCategoryName(...categories) {
    const names = categories
      .filter((category) => category && typeof category === "object")
      .map((category) => String(category._sName || "").toLocaleLowerCase());
    if (names.some((name) => /\bpsych(?:[\s-]+)?online\b/.test(name)))
      return "psychonline";
    if (names.some((name) => /\bpsych\b/.test(name))) return "psych";
    if (names.some((name) => /\bcodename\b/.test(name))) return "codename";
    if (names.some((name) => /\bexecutable\b/.test(name))) return "executable";
    if (names.some((name) => /\bbase\b/.test(name))) return "vslice";
    return null;
  },

  getCategoryId(category) {
    if (!category || typeof category !== "object") return null;
    const id =
      category._idRow ||
      category._idCategory ||
      category._sProfileUrl?.match(/\/mods\/cats\/(\d+)/)?.[1];
    return Number.isFinite(Number(id)) ? Number(id) : null;
  },

  isExcludedCategory(...categories) {
    const pending = categories.filter(Boolean);
    const seen = new Set();
    while (pending.length) {
      const category = pending.shift();
      if (typeof category === "number" || typeof category === "string") {
        if (this.excludedCategoryIds.has(Number(category))) return true;
        continue;
      }
      if (typeof category !== "object" || seen.has(category)) continue;
      seen.add(category);
      if (
        category._bIsObsolete ||
        this.excludedCategoryIds.has(this.getCategoryId(category))
      )
        return true;
      pending.push(
        category._aCategory,
        category._aRootCategory,
        category._aSubCategory,
        category._aParentCategory,
        category._aSuperCategory,
      );
    }
    return false;
  },

  isInCategory(categoryId, ...categories) {
    const requestedId = Number(categoryId);
    if (!Number.isFinite(requestedId)) return false;

    const pending = categories.filter(Boolean);
    const seen = new Set();
    while (pending.length) {
      const category = pending.shift();
      if (Number(category) === requestedId) return true;
      if (typeof category !== "object" || seen.has(category)) continue;
      seen.add(category);
      if (this.getCategoryId(category) === requestedId) return true;
      pending.push(
        category._aCategory,
        category._aRootCategory,
        category._aSubCategory,
        category._aParentCategory,
        category._aSuperCategory,
      );
    }
    return false;
  },

  // 1. Detección Inteligente y recursiva de categorías y motores
  getEngineIdForCategories(...categories) {
    const pending = categories.filter((c) => c !== null && c !== undefined);
    const seen = new Set();
    const detectedEngines = [];

    while (pending.length > 0) {
      const category = pending.shift();

      // Si recibimos directamente un número de categoría (ID directo)
      if (typeof category === "number" || typeof category === "string") {
        const engineId = this.getEngineIdForCategory(Number(category));
        if (engineId) detectedEngines.push(engineId);
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
      if (engineId) detectedEngines.push(engineId);

      pending.push(
        category._aCategory,
        category._aSuperCategory,
        category._aParentCategory,
        category._aRootCategory,
        category._aSubCategory,
      );
    }
    return detectedEngines.includes("psychonline")
      ? "psychonline"
      : detectedEngines[0] || null;
  },

  getValidRecords(data) {
    if (data && Array.isArray(data._aRecords)) return data._aRecords;
    if (Array.isArray(data)) return data;
    return [];
  },

  isDeletedMod(mod) {
    return Boolean(
      mod?._bIsTrashed ||
        mod?._bIsDeleted ||
        mod?._sInitialVisibility === "hide",
    );
  },

  async getModProfile(modId) {
    const id = Number(modId);
    if (!id) return null;
    if (this.modProfileCache.has(id)) return this.modProfileCache.get(id);
    if (this.modProfileRequests.has(id)) return this.modProfileRequests.get(id);
    const request = fetch(`${this.baseUrl}/Mod/${id}/ProfilePage`)
      .then(async (response) => {
        if (!response.ok) return null;
        const profile = await response.json();
        this.modProfileCache.set(id, profile);
        return profile;
      })
      .catch(() => null)
      .finally(() => this.modProfileRequests.delete(id));
    this.modProfileRequests.set(id, request);
    return request;
  },

  async resolveEngineIdForMod(mod) {
    const initialEngine = this.getEngineIdForCategories(
      mod.__injectedCategoryId,
      mod._aCategory,
      mod._aSuperCategory,
      mod._aRootCategory,
      mod._aSubCategory,
      mod._idCategory,
    );
    if (initialEngine) return initialEngine;
    const namedEngine = this.getEngineIdForCategoryName(
      mod._aCategory,
      mod._aSubCategory,
      mod._aSuperCategory,
      mod._aRootCategory,
    );
    if (namedEngine) return namedEngine;

    const profile = await this.getModProfile(mod._idRow);
    if (!profile) return null;
    return (
      this.getEngineIdForCategories(
        profile._aCategory,
        profile._aSuperCategory,
        profile._aRootCategory,
        profile._aSubCategory,
        profile._idCategory,
      ) ||
      this.getEngineIdForCategoryName(
        profile._aCategory,
        profile._aSuperCategory,
        profile._aRootCategory,
        profile._aSubCategory,
      )
    );
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
      const data = await this.getModProfile(modId);
      if (!data) return null;
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
        gameBananaUrl: `https://gamebanana.com/mods/${data._idRow}`,
        gameId: Number(data._aGame?._idRow || data._idGame || 0),
        isDeleted: this.isDeletedMod(data),
        categoryId: this.getCategoryId(data._aCategory),
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
        manifestUrl: this.featuredManifestUrl,
        cacheKey: this.featuredCacheKey,
        getTimeAgo: this.getTimeAgo.bind(this),
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
      engineId: mod.__resolvedEngineId || this.getEngineIdForCategories(
        mod.__injectedCategoryId, // Pasamos el ID inyectado primero para prioridad
        mod._aCategory,
        mod._aSuperCategory,
        mod._aRootCategory,
        mod._aSubCategory,
        mod._idCategory,
      ),
    };
  },

  async getRipeMods(page = 1, categoryId = null, options = {}) {
    try {
      const targetCategoryId = Number.isFinite(Number(categoryId))
        ? Number(categoryId)
        : null;
      const cacheKey = targetCategoryId || "all";
      const feed = this.ripeFeedCache.get(cacheKey) || {
        sourcePage: 1,
        mods: [],
        modIds: new Set(),
        complete: false,
      };
      this.ripeFeedCache.set(cacheKey, feed);

      const pageSize = 12;
      const requiredMods = Math.max(1, Number(page) || 1) * pageSize;
      while (!feed.complete && feed.mods.length < requiredMods) {
        const params = new URLSearchParams({
          _sSort: "default",
          _nPage: String(feed.sourcePage),
        });
        const response = await fetch(
          `${this.subfeedBaseUrl}/Game/${this.gameId}/Subfeed?${params}`,
          { signal: options.signal },
        );
        if (!response.ok) throw new Error("Ripe Subfeed request failed");

        const records = this.getValidRecords(await response.json());
        feed.sourcePage += 1;
        for (const mod of records) {
          if (
            mod?._sModelName !== "Mod" ||
            this.isDeletedMod(mod) ||
            this.isExcludedCategory(
              mod._aCategory,
              mod._aSuperCategory,
              mod._aRootCategory,
              mod._aSubCategory,
            )
          )
            continue;

          const engineId = this.getEngineIdForCategories(
            mod._aCategory,
            mod._aSuperCategory,
            mod._aRootCategory,
            mod._aSubCategory,
            mod._idCategory,
          );
          if (
            !engineId ||
            (targetCategoryId &&
              !this.isInCategory(
                targetCategoryId,
                mod._aCategory,
                mod._aSuperCategory,
                mod._aRootCategory,
                mod._aSubCategory,
              ))
          )
            continue;
          if (feed.modIds.has(mod._idRow)) continue;
          feed.modIds.add(mod._idRow);
          feed.mods.push({ ...mod, __resolvedEngineId: engineId });
        }

        // Subfeed normally returns fifteen records. A short response is its last page.
        if (records.length < 15) feed.complete = true;
      }

      const start = (Math.max(1, Number(page) || 1) - 1) * pageSize;
      return feed.mods.slice(start, start + pageSize).map((mod) => this.toGridMod(mod));
    } catch (error) {
      if (error?.name === "AbortError") return [];
      console.warn("Could not load GameBanana Ripe feed", error);
      return [];
    }
  },

  async getGridMods(filter = "popular", page = 1, categoryId = null, options = {}) {
    if (filter === "ripe") return this.getRipeMods(page, categoryId, options);
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

  getSearchRelevance(mod, query) {
    const title = String(mod._sName || "").toLocaleLowerCase();
    const normalizedQuery = query.toLocaleLowerCase();
    const words = normalizedQuery.split(/\s+/).filter(Boolean);
    const exactTitle = title === normalizedQuery ? 1000000000 : 0;
    const startsWithQuery = title.startsWith(normalizedQuery) ? 100000000 : 0;
    const matchingWords =
      words.filter((word) => title.includes(word)).length * 1000000;
    return exactTitle + startsWithQuery + matchingWords;
  },

  getSearchMatchCount(mod, query) {
    const title = String(mod._sName || "").toLocaleLowerCase();
    return query
      .toLocaleLowerCase()
      .split(/\s+/)
      .filter(Boolean)
      .filter((word) => title.includes(word)).length;
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
        if (
          specificMod?.gameId === this.gameId &&
          !specificMod.isDeleted &&
          !this.isExcludedCategory(specificMod.categoryId)
        ) {
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
      if (directMod) {
        this.searchCache.set(cacheKey, [directMod]);
        return [directMod];
      }

      const searchWindowSize = 50;
      const resultOffset = (page - 1) * perPage;
      const sourcePage = Math.floor(resultOffset / searchWindowSize) + 1;
      const sourceOffset = resultOffset % searchWindowSize;
      const params = new URLSearchParams({
        _sModelName: "Mod",
        _sSearchString: `${normalizedQuery} fnf`,
        _nPage: String(sourcePage),
        _nPerpage: String(searchWindowSize),
      });
      params.set("_aFilters[Generic_Game]", String(this.gameId));
      const res = await fetch(`${this.baseUrl}/Util/Search/Results?${params}`);
      if (!res.ok) throw new Error("Mod search failed");
      const data = await res.json();
      const records = this.getValidRecords(data).filter(
        (mod) =>
          mod._sModelName === "Mod" &&
          Number(mod._aGame?._idRow || mod._idGame) === this.gameId &&
          !this.isDeletedMod(mod) &&
          !this.isExcludedCategory(
            mod._aCategory,
            mod._aRootCategory,
            mod._aSubCategory,
          ),
      );

      const sortedRecords = [
        ...new Map(records.map((mod) => [mod._idRow, mod])).values(),
      ]
        .sort(
          (left, right) =>
            this.getSearchMatchCount(right, normalizedQuery) -
              this.getSearchMatchCount(left, normalizedQuery) ||
            Number(right._nViewCount || 0) - Number(left._nViewCount || 0) ||
            Number(right._nLikeCount || 0) - Number(left._nLikeCount || 0) ||
            this.getSearchRelevance(right, normalizedQuery) -
              this.getSearchRelevance(left, normalizedQuery) ||
            Number(right._idRow || 0) - Number(left._idRow || 0),
        );
      const visibleRecords = sortedRecords.slice(
        sourceOffset,
        sourceOffset + perPage,
      );
      for (let index = 0; index < visibleRecords.length; index += 2) {
        await Promise.all(
          visibleRecords.slice(index, index + 2).map(async (mod) => {
            mod.__resolvedEngineId = await this.resolveEngineIdForMod(mod);
          }),
        );
      }
      let parsedMods = visibleRecords.map((mod) => this.toGridMod(mod));

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
