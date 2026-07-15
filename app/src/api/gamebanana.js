export const gameBananaApi = {
  baseUrl: "https://gamebanana.com/apiv11",
  gameId: 8694,
  categoryRoots: [34764, 28367, 29202],
  engineCategories: {
    29202: "vslice",
    28367: "psych",
    34764: "codename",
  },
  featuredUrl:
    "https://raw.githubusercontent.com/Crew-Awesome/weekbox.featured/main/public/featured.json",
  featuredCacheKey: "weekbox-featured-v1",
  currentFreshCategoryId: undefined,
  freshPopularRecords: [],
  freshPopularNextPage: 1,
  freshPopularFallbackPage: 1,
  freshPopularUsingFallback: false,
  freshPopularExhausted: false,
  freshPopularPages: new Map(),
  freshPopularSeenIds: new Set(),
  searchCache: new Map(),

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
    return this.engineCategories[Number(categoryId)] || null;
  },

  getEngineIdForCategories(...categories) {
    const pending = categories.filter(Boolean);
    const seen = new Set();
    while (pending.length > 0) {
      const category = pending.shift();
      if (!category || typeof category !== "object" || seen.has(category))
        continue;
      seen.add(category);
      const engineId = this.getEngineIdForCategory(
        category._idRow || category._idCategory,
      );
      if (engineId) return engineId;
      pending.push(
        category._aCategory,
        category._aSuperCategory,
        category._aParentCategory,
      );
    }
    return this.getEngineIdForCategory(
      categories.find((category) => typeof category === "number"),
    );
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
        engineId: this.getEngineIdForCategories(
          data._aCategory,
          data._aSuperCategory,
          data._idCategory,
        ),
      };
    } catch (error) {
      return null;
    }
  },

  async getFeaturedCarousel() {
    const cachedData = this.getCachedFeatured();
    if (cachedData && Date.parse(cachedData.expiresAt) > Date.now()) {
      return this.flattenFeatured(cachedData);
    }
    try {
      const response = await fetch(this.featuredUrl, { cache: "no-store" });
      if (!response.ok) throw new Error();
      const featuredData = await response.json();
      const mods = this.flattenFeatured(featuredData);
      if (mods.length === 0) throw new Error();
      localStorage.setItem(this.featuredCacheKey, JSON.stringify(featuredData));
      return mods;
    } catch (error) {
      return cachedData ? this.flattenFeatured(cachedData) : [];
    }
  },

  getCachedFeatured() {
    try {
      const cached = localStorage.getItem(this.featuredCacheKey);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      return null;
    }
  },

  flattenFeatured(featuredData) {
    if (!Array.isArray(featuredData?.rankings)) return [];
    return featuredData.rankings.flatMap((ranking) =>
      (ranking.mods || []).map((mod) => ({
        ...mod,
        label: ranking.label,
        timeAgo: this.getTimeAgo(mod.publishedAt),
      })),
    );
  },

  getCategories(categoryId = null) {
    return this.categoryRoots.includes(categoryId)
      ? [categoryId]
      : this.categoryRoots;
  },

  getRecordSortValue(mod, sort) {
    if (sort === "Generic_LatestUpdated") {
      return Number(
        mod._tsDateUpdated || mod._tsDateModified || mod._tsDateAdded || 0,
      );
    }
    if (sort === "Generic_MostLiked") return Number(mod._nLikeCount || 0);
    return Number(mod._tsDateAdded || 0);
  },

  async getCategoryRecords({
    page = 1,
    perPage = 20,
    sort,
    categoryId = null,
  } = {}) {
    const categoriesToFetch = this.getCategories(categoryId);
    const responses = await Promise.allSettled(
      categoriesToFetch.map(async (id) => {
        const params = new URLSearchParams({
          _nPage: String(page),
          _nPerpage: String(perPage),
        });
        params.set("_aFilters[Generic_Game]", String(this.gameId));
        params.set("_aFilters[Generic_Category]", String(id));
        if (sort) params.set("_sSort", sort);
        const response = await fetch(`${this.baseUrl}/Mod/Index?${params}`);
        if (!response.ok) throw new Error();
        return this.getValidRecords(await response.json());
      }),
    );
    const records = responses
      .filter((result) => result.status === "fulfilled")
      .flatMap((result) => result.value);
    if (
      records.length === 0 &&
      responses.every((result) => result.status === "rejected")
    ) {
      throw new Error("GameBanana category requests failed");
    }
    return [...new Map(records.map((mod) => [mod._idRow, mod])).values()].sort(
      (left, right) =>
        this.getRecordSortValue(right, sort) -
        this.getRecordSortValue(left, sort),
    );
  },

  toGridMod(mod) {
    return {
      id: mod._idRow,
      title: mod._sName,
      author: mod._aSubmitter?._sName || "Unknown",
      image: this.getImageUrl(mod),
      likes: mod._nLikeCount || 0,
      views: mod._nViewCount || 0,
      timeAgo: this.getTimeAgo(mod._tsDateAdded),
    };
  },

  getPopularScore(mod) {
    const likes = mod._nLikeCount || 0;
    const views = mod._nViewCount || 0;
    const ageDays = Math.max(
      0,
      (Date.now() / 1000 - (mod._tsDateAdded || 0)) / 86400,
    );
    const likeRate = likes / Math.max(views, 1);
    const momentum =
      Math.log1p(likes / Math.sqrt(Math.max(ageDays, 1))) +
      0.4 * Math.log1p(likes);
    const qualityMultiplier = 0.7 + Math.min(0.5, likeRate * 30);
    const freshnessMultiplier = Math.exp(-ageDays / 45);
    return momentum * qualityMultiplier * freshnessMultiplier;
  },

  isFreshPopularMod(mod) {
    const ageDays = (Date.now() / 1000 - (mod._tsDateAdded || 0)) / 86400;
    const likes = mod._nLikeCount || 0;
    const views = mod._nViewCount || 0;
    const likeRate = likes / Math.max(views, 1);
    return ageDays <= 90 && likes >= 4 && views >= 250 && likeRate >= 0.0125;
  },

  isEstablishedPopularMod(mod) {
    const likes = mod._nLikeCount || 0;
    const views = mod._nViewCount || 0;
    const likeRate = likes / Math.max(views, 1);
    return likes >= 8 && views >= 500 && likeRate >= 0.01;
  },

  async getFreshPopularMods(page, categoryId) {
    if (page === 1 || this.currentFreshCategoryId !== categoryId) {
      this.currentFreshCategoryId = categoryId;
      this.freshPopularRecords = [];
      this.freshPopularNextPage = 1;
      this.freshPopularFallbackPage = 1;
      this.freshPopularUsingFallback = false;
      this.freshPopularExhausted = false;
      this.freshPopularPages = new Map();
      this.freshPopularSeenIds = new Set();
    }
    if (this.freshPopularPages.has(page))
      return this.freshPopularPages.get(page);
    let available = [];
    while (!this.freshPopularExhausted) {
      available = [...this.freshPopularRecords]
        .filter((mod) => !this.freshPopularSeenIds.has(mod._idRow))
        .sort(
          (left, right) =>
            this.getPopularScore(right) - this.getPopularScore(left),
        );
      if (available.length >= 12) break;
      try {
        const isFallback = this.freshPopularUsingFallback;
        const records = await this.getCategoryRecords({
          page: isFallback
            ? this.freshPopularFallbackPage++
            : this.freshPopularNextPage++,
          perPage: 50,
          sort: isFallback ? "Generic_MostLiked" : "Generic_Newest",
          categoryId: categoryId,
        });
        const eligibleRecords = records.filter((mod) =>
          isFallback
            ? this.isEstablishedPopularMod(mod)
            : this.isFreshPopularMod(mod),
        );
        const knownIds = new Set(
          this.freshPopularRecords.map((mod) => mod._idRow),
        );
        this.freshPopularRecords.push(
          ...eligibleRecords.filter((mod) => !knownIds.has(mod._idRow)),
        );
        if (records.length === 0 || eligibleRecords.length === 0) {
          if (isFallback) this.freshPopularExhausted = true;
          else this.freshPopularUsingFallback = true;
        }
      } catch (err) {
        this.freshPopularExhausted = true;
      }
    }
    const mods = available.slice(0, 12).map((mod) => this.toGridMod(mod));
    mods.forEach((mod) => this.freshPopularSeenIds.add(mod.id));
    this.freshPopularPages.set(page, mods);
    return mods;
  },

  async getGridMods(filter = "ripe", page = 1, categoryId = null) {
    try {
      if (filter === "popular")
        return await this.getFreshPopularMods(page, categoryId);
      const sort =
        {
          new: "Generic_Newest",
          updated: "Generic_LatestUpdated",
        }[filter] || "Generic_Newest";
      const records = await this.getCategoryRecords({ page, sort, categoryId });
      return records.slice(0, 12).map((mod) => this.toGridMod(mod));
    } catch (error) {
      return [];
    }
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
      // Comprueba si la búsqueda es un enlace directo o un ID puro
      const idMatch = normalizedQuery.match(/^(?:https?:\/\/)?(?:gamebanana\.com\/mods\/)?(\d+)(?:\/.*)?$/i);
      
      if (page === 1 && idMatch && idMatch[1]) {
        const specificMod = await this.getModDetails(idMatch[1]);
        if (specificMod) {
          directMod = {
            id: specificMod.id,
            title: specificMod.title,
            author: specificMod.author,
            image: specificMod.images[0],
            likes: specificMod.likes,
            views: specificMod.views,
            timeAgo: specificMod.timeAgo,
          };
        }
      }

      const params = new URLSearchParams({
        _sModelName: "Mod",
        _sSearchString: `${normalizedQuery} fnf`,
        _nPage: String(page),
        _nPerpage: String(perPage),
      });
      const res = await fetch(`${this.baseUrl}/Util/Search/Results?${params}`);
      if (!res.ok) throw new Error("Mod search failed");
      const data = await res.json();
      const records = this.getValidRecords(data);
      
      let parsedMods = [
        ...new Map(records.map((mod) => [mod._idRow, mod])).values(),
      ]
        .sort(
          (left, right) =>
            this.getSearchScore(right, normalizedQuery) -
            this.getSearchScore(left, normalizedQuery),
        )
        .map((mod) => this.toGridMod(mod));

      // Si detectamos un mod exacto, lo colocamos primero en los resultados
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