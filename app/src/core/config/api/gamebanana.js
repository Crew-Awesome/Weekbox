import { FeaturedService } from "./gamebanana/featuredService.js";
import { CategoryFeedService } from "./gamebanana/categoryFeedService.js";
import { GameBananaTransport } from "./gamebanana/transport.js";
import { DISCOVERY_CONFIG } from "../discovery.js";
import {
  ENGINE_CATEGORY_IDS,
  ENGINE_CATEGORY_ROOTS,
  EXCLUDED_MOD_CATEGORY_IDS,
} from "../engines.js";

const EXCLUDED_ENGINE_SUBMISSIONS = new Map([
  ["mods:309789", "psych"],
  ["mods:44201", "fpsplus"],
  ["wips:95612", "alepsych"],
  ["mods:598553", "codename"],
  ["mods:535203", "pslice"],
  ["mods:479714", "psychonline"],
]);

const NON_DEPENDENCY_REQUIREMENTS = new Set(EXCLUDED_ENGINE_SUBMISSIONS.keys());
const MIN_INSTALLABLE_FILE_SIZE = 1024;

function quoteCommandArgument(value) {
  return `"${String(value).replaceAll('"', '\\"')}"`;
}

function getGoogleDriveFileId(url) {
  const parsed = new URL(url);
  return (
    parsed.searchParams.get("id") ||
    parsed.pathname.match(/\/file\/d\/([^/]+)/)?.[1] ||
    null
  );
}

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
  featuredCacheKey: "weekbox-featured-v3",
  searchCache: new Map(),
  ripeFeedCache: new Map(),
  modProfileCache: new Map(),
  modProfileRequests: new Map(),
  featuredService: null,
  categoryFeedService: null,
  categoryTransport: null,

  getEngineIdForSubmission(type, id) {
    return EXCLUDED_ENGINE_SUBMISSIONS.get(`${type}:${id}`) || null;
  },

  isExcludedEngineSubmission(mod) {
    return Boolean(this.getEngineIdForSubmission("mods", mod?._idRow));
  },
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

  getGameBananaSubmission(url) {
    const match = String(url || "").match(
      /^https?:\/\/(?:www\.)?gamebanana\.com\/(mods|tools)\/(\d+)(?:\/|$|\?)/i,
    );
    if (!match) return null;
    return {
      type: match[1].toLowerCase() === "tools" ? "tool" : "mod",
      id: Number(match[2]),
      url: `https://gamebanana.com/${match[1].toLowerCase()}/${match[2]}`,
    };
  },

  getPrimaryDownloadFile(data) {
    const files = this.getDownloadFiles(data);
    return files.find((file) => this.isInstallableDownloadFile(file)) || null;
  },

  getDownloadFiles(data) {
    const files = data?._aFiles;
    if (Array.isArray(files)) return files;
    if (!files || typeof files !== "object") return [];
    if (files._sDownloadUrl) return [files];
    return Object.values(files).filter(
      (file) => file && typeof file === "object",
    );
  },

  isInstallableDownloadFile(file) {
    const placeholderText = `${file?._sFile || ""} ${file?._sDescription || ""}`
      .replaceAll("_", " ")
      .toLowerCase();
    return (
      !file?._bIsArchived &&
      file?._bHasContents !== false &&
      Boolean(file?._sDownloadUrl) &&
      Number(file?._nFilesize || 0) >= MIN_INSTALLABLE_FILE_SIZE &&
      !/\b(?:placeholder|use\s+(?:mediafire|drive|external)|download\s+(?:from|on)\s+(?:mediafire|drive))\b/.test(
        placeholderText,
      )
    );
  },

  getExternalDownloadLabel(url) {
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      if (hostname.endsWith("mediafire.com")) return "MediaFire download";
      if (hostname === "drive.google.com") return "Drive download";
    } catch (error) {}
    return "External download";
  },

  getPreferredDownloadOption(options) {
    return (
      options.find((option) => option.type === "gamebanana") ||
      options.find(
        (option) =>
          option.type === "external" &&
          new URL(option.downloadUrl).hostname
            .toLowerCase()
            .endsWith("mediafire.com"),
      ) ||
      options.find((option) => option.type === "external") ||
      null
    );
  },

  getExternalDownloadFiles(data) {
    const supportedHosts = new Set([
      "drive.google.com",
      "mediafire.com",
      "www.mediafire.com",
    ]);
    const files = new Map();
    const addExternal = (value, name = "") => {
      try {
        const url = new URL(value);
        if (!supportedHosts.has(url.hostname.toLowerCase())) return;
        if (!files.has(url.href)) {
          files.set(url.href, {
            id: `external:${url.href}`,
            type: "external",
            name: name || url.hostname,
            fileSize: 0,
            fileSizeStr: this.getExternalDownloadLabel(url.href),
            downloadUrl: url.href,
          });
        }
      } catch (error) {
        // Ignore non-URL text found in submission metadata.
      }
    };

    const rawAlternateSources = data?._aAlternateFileSources;
    const alternateSources = Array.isArray(rawAlternateSources)
      ? rawAlternateSources
      : rawAlternateSources?.url || rawAlternateSources?._sUrl
        ? [rawAlternateSources]
        : Object.values(rawAlternateSources || {});
    alternateSources.forEach((source) => {
      if (source && typeof source === "object") {
        addExternal(
          source.url || source._sUrl,
          source.description || source._sDescription,
        );
      }
    });
    return [...files.values()];
  },

  async getExternalFileDetails(url) {
    try {
      const parsed = new URL(url);
      const hostname = parsed.hostname.toLowerCase();
      let downloadUrl = url;
      if (hostname === "drive.google.com") {
        const fileId = getGoogleDriveFileId(url);
        if (!fileId) return null;
        downloadUrl = `https://drive.usercontent.google.com/download?id=${encodeURIComponent(fileId)}&export=download&confirm=t`;
      } else if (["mediafire.com", "www.mediafire.com"].includes(hostname)) {
        const page = await Neutralino.os.execCommand(
          `curl -fsSL --connect-timeout 5 --max-time 12 ${quoteCommandArgument(url)}`,
          { background: false },
        );
        if (page.exitCode !== 0) return null;
        downloadUrl = (page.stdOut || "")
          .replaceAll("&amp;", "&")
          .match(
            /https?:\/\/download[^"'\s<>]+\.mediafire\.com[^"'\s<>]*/i,
          )?.[0];
        if (!downloadUrl) return null;
      } else {
        return null;
      }
      const result = await Neutralino.os.execCommand(
        `curl -sSIL --connect-timeout 5 --max-time 12 ${quoteCommandArgument(downloadUrl)}`,
        { background: false },
      );
      const header = `${result.stdOut || ""}\n${result.stdErr || ""}`;
      const filename = header.match(
        /content-disposition:[^\r\n]*filename\*?=(?:UTF-8''|"?)([^";\r\n]+)/i,
      )?.[1];
      const sizes = [...header.matchAll(/content-length:\s*(\d+)/gi)];
      const size = Number(sizes.at(-1)?.[1] || 0);
      return {
        filename: filename ? decodeURIComponent(filename.trim()) : null,
        size: Number.isFinite(size) ? size : 0,
      };
    } catch (error) {
      return null;
    }
  },

  async getDownloadOptions(data) {
    const options = [
      ...this.getDownloadFiles(data)
        .filter((file) => this.isInstallableDownloadFile(file))
        .map((file, index) => ({
          id: `file:${file._idRow || index}`,
          type: "gamebanana",
          name:
            file._sFile ||
            file._sDescription ||
            file._sVersion ||
            `File ${index + 1}`,
          fileSize: Number(file._nFilesize || 0),
          fileSizeStr: this.formatBytes(file._nFilesize || 0),
          downloadUrl: file._sDownloadUrl,
        })),
      ...this.getExternalDownloadFiles(data),
    ];
    await Promise.all(
      options
        .filter((option) => option.type === "external")
        .map(async (option) => {
          const details = await this.getExternalFileDetails(option.downloadUrl);
          if (!details) return;
          if (details.filename) option.name = details.filename;
          if (details.size > 0) {
            option.fileSize = details.size;
            option.fileSizeStr = `${this.getExternalDownloadLabel(option.downloadUrl)} • ${this.formatBytes(details.size)}`;
          }
        }),
    );
    return options;
  },

  async getToolDetails(toolId) {
    try {
      const response = await fetch(
        `${this.baseUrl}/Tool/${Number(toolId)}/ProfilePage`,
      );
      if (!response.ok) return null;
      const data = await response.json();
      const file = this.getPrimaryDownloadFile(data);
      if (!file) return null;
      const preview = data._aPreviewMedia?._aImages?.[0];
      return {
        id: data._idRow,
        dependencyId: `tool:${data._idRow}`,
        type: "tool",
        title: data._sName || "Unknown Tool",
        downloadUrl: file._sDownloadUrl,
        fileSizeStr: this.formatBytes(file._nFilesize || 0),
        thumbnail: preview ? `${preview._sBaseUrl}/${preview._sFile}` : null,
        gameBananaUrl: `https://gamebanana.com/tools/${data._idRow}`,
      };
    } catch (error) {
      return null;
    }
  },

  async getRequirementDetails(requirement) {
    const submission = this.getGameBananaSubmission(requirement?.url);
    if (!submission) return null;
    if (submission.type === "tool") return this.getToolDetails(submission.id);
    const mod = await this.getModDetails(submission.id, {
      includeRequirements: false,
    });
    if (!mod?.downloadUrl) return null;
    return {
      id: mod.id,
      dependencyId: `mod:${mod.id}`,
      type: "mod",
      title: mod.title,
      downloadUrl: mod.downloadUrl,
      fileSizeStr: mod.fileSizeStr,
      thumbnail: mod.images?.[0] || null,
      gameBananaUrl: mod.gameBananaUrl,
      downloadType: mod.downloadType,
    };
  },

  async getRequirements(data) {
    const requirements = Array.isArray(data?._aRequirements)
      ? data._aRequirements
      : [];
    const resolved = await Promise.all(
      requirements
        .filter(([, url]) => {
          const match = String(url || "").match(
            /^https?:\/\/(?:www\.)?gamebanana\.com\/(mods|tools|wips)\/(\d+)(?:\/|$|\?)/i,
          );
          return (
            !match ||
            !NON_DEPENDENCY_REQUIREMENTS.has(
              `${match[1].toLowerCase()}:${match[2]}`,
            )
          );
        })
        .map(([name, url]) => this.getRequirementDetails({ name, url })),
    );
    return resolved.filter(Boolean);
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

  async getModDetails(modId, { includeRequirements = true } = {}) {
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
      const downloadOptions = await this.getDownloadOptions(data);
      const preferredDownload =
        this.getPreferredDownloadOption(downloadOptions);
      const downloadButtonLabel =
        preferredDownload?.type === "external"
          ? this.getExternalDownloadLabel(preferredDownload.downloadUrl)
          : null;
      const requirements = includeRequirements
        ? await this.getRequirements(data)
        : [];
      return {
        id: data._idRow,
        title: data._sName,
        author: data._aSubmitter?._sName || "Unknown Creator",
        description: data._sText || "<p>No description available.</p>",
        likes: data._nLikeCount || 0,
        views: data._nViewCount || 0,
        timeAgo: this.getTimeAgo(data._tsDateAdded),
        images: images,
        fileSizeStr: preferredDownload
          ? preferredDownload.fileSize > 0
            ? this.formatBytes(preferredDownload.fileSize)
            : "Unknown size"
          : "No download available",
        downloadUrl: preferredDownload?.downloadUrl || "",
        downloadType: preferredDownload?.type || null,
        downloadButtonLabel,
        downloadOptions,
        requirements,
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
      engineId:
        mod.__resolvedEngineId ||
        this.getEngineIdForCategories(
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
            this.isExcludedEngineSubmission(mod) ||
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
      return feed.mods
        .slice(start, start + pageSize)
        .map((mod) => this.toGridMod(mod));
    } catch (error) {
      if (error?.name === "AbortError") return [];
      console.warn("Could not load GameBanana Ripe feed", error);
      return [];
    }
  },

  async getGridMods(
    filter = "popular",
    page = 1,
    categoryId = null,
    options = {},
  ) {
    if (filter === "ripe") return this.getRipeMods(page, categoryId, options);
    return this.getCategoryFeed().getGridMods(
      filter,
      page,
      categoryId,
      options,
    );
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
        isExcluded: this.isExcludedEngineSubmission.bind(this),
        getEngineId: (mod, categoryId) =>
          this.getEngineIdForCategories(
            categoryId,
            mod._aCategory,
            mod._aSuperCategory,
            mod._aRootCategory,
            mod._aSubCategory,
            mod._idCategory,
          ),
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
      ].sort(
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
