import { FeaturedService } from "./gamebanana/featuredService.js";
import { CategoryFeedService } from "./gamebanana/categoryFeedService.js";
import { GameBananaCategoryResolver } from "./gamebanana/categoryResolver.js";
import {
  formatBytes,
  getImageUrl,
  getTimeAgo,
  toGridMod,
} from "./gamebanana/modPresentation.js";
import { GameBananaTransport } from "./gamebanana/transport.js";
import { GameBananaSearchService } from "./gamebanana/searchService.js";
import {
  getSearchTitleRelevance as rankSearchTitle,
  getSearchTypoRelevance as rankSearchTypo,
  getTypoSearchVariants as buildTypoSearchVariants,
} from "./gamebanana/searchRanking.js";
import { DISCOVERY_CONFIG } from "../config/discovery.js";
import { sniroApi } from "./sniro.js";
import {
  ENGINE_CATEGORY_IDS,
  ENGINE_CATEGORY_ROOTS,
  EXCLUDED_MOD_CATEGORY_IDS,
} from "../config/engines.js";

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
  categoryResolver: null,
  searchService: null,
  psychOnlineFeedCache: new Map(),

  getEngineIdForSubmission(type, id) {
    return EXCLUDED_ENGINE_SUBMISSIONS.get(`${type}:${id}`) || null;
  },

  isExcludedEngineSubmission(mod) {
    return Boolean(this.getEngineIdForSubmission("mods", mod?._idRow));
  },
  discoveryConfig: DISCOVERY_CONFIG,

  getImageUrl(mod) {
    return getImageUrl(mod);
  },

  getEngineIdForCategory(categoryId) {
    return this.getCategoryResolver().getEngineIdForCategory(categoryId);
  },

  getEngineIdForCategoryName(...categories) {
    return this.getCategoryResolver().getEngineIdForCategoryName(...categories);
  },

  getCategoryId(category) {
    return this.getCategoryResolver().getCategoryId(category);
  },

  isExcludedCategory(...categories) {
    return this.getCategoryResolver().isExcludedCategory(...categories);
  },

  isInCategory(categoryId, ...categories) {
    return this.getCategoryResolver().isInCategory(categoryId, ...categories);
  },

  getEngineIdForCategories(...categories) {
    return this.getCategoryResolver().getEngineIdForCategories(...categories);
  },

  getCategoryResolver() {
    if (!this.categoryResolver) {
      this.categoryResolver = new GameBananaCategoryResolver({
        engineCategories: this.engineCategories,
        legacyEngineCategories: this.legacyEngineCategories,
        excludedCategoryIds: this.excludedCategoryIds,
      });
    }
    return this.categoryResolver;
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
        `curl -fsSIL --connect-timeout 5 --max-time 12 ${quoteCommandArgument(downloadUrl)}`,
        { background: false },
      );
      if (result.exitCode !== 0) return null;
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

  async isDownloadAvailable(url) {
    try {
      const result = await Neutralino.os.execCommand(
        `curl -sSIL --connect-timeout 5 --max-time 12 ${quoteCommandArgument(url)}`,
        { background: false },
      );
      if (result.exitCode !== 0) return null;
      const statuses = [
        ...`${result.stdOut || ""}`.matchAll(/HTTP\/\S+\s+(\d{3})/gi),
      ];
      const status = Number(statuses.at(-1)?.[1]);
      if (!Number.isFinite(status)) return null;
      return status < 400;
    } catch {
      // A blocked or unsupported HEAD request does not prove the download is
      // broken, so leave the option available in that case.
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
          if (!details) {
            option.unavailable = true;
            return;
          }
          if (details.filename) option.name = details.filename;
          if (details.size > 0) {
            option.fileSize = details.size;
            option.fileSizeStr = `${this.getExternalDownloadLabel(option.downloadUrl)} • ${this.formatBytes(details.size)}`;
          }
        }),
    );
    const availability = await Promise.all(
      options
        .filter((option) => option.type === "gamebanana")
        .map(async (option) => ({
          option,
          available: await this.isDownloadAvailable(option.downloadUrl),
        })),
    );
    availability.forEach(({ option, available }) => {
      if (available === false) option.unavailable = true;
    });
    return options.filter((option) => !option.unavailable);
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
    return getTimeAgo(timestamp);
  },

  formatBytes(bytes, decimals = 2) {
    return formatBytes(bytes, decimals);
  },

  async getModDetails(modId, { includeRequirements = true } = {}) {
    if (String(modId).startsWith("sniro:")) {
      return sniroApi
        .getModDetails(String(modId).slice("sniro:".length))
        .catch(() => null);
    }
    try {
      const data = await this.getModProfile(modId);
      if (!data) return null;
      let images = [];
      if (data._aPreviewMedia && data._aPreviewMedia._aImages) {
        images = data._aPreviewMedia._aImages.map(
          (img) => `${img._sBaseUrl}/${img._sFile}`,
        );
      }
      if (images.length === 0) images.push("assets/icons/launcher-icon.png");
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
        manifestUrl: this.featuredManifestUrl,
        getTimeAgo: this.getTimeAgo.bind(this),
      });
    }
    return this.featuredService.getCarousel();
  },

  toGridMod(mod) {
    return toGridMod(mod, (record) =>
      this.getEngineIdForCategories(
        record.__injectedCategoryId,
        record._aCategory,
        record._aSuperCategory,
        record._aRootCategory,
        record._aSubCategory,
        record._idCategory,
      ),
    );
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
    if (Number(categoryId) === 43788) {
      return this.getPsychOnlineGridMods(filter, page, categoryId, options);
    }
    if (filter === "ripe") return this.getRipeMods(page, categoryId, options);
    return this.getCategoryFeed().getGridMods(
      filter,
      page,
      categoryId,
      options,
    );
  },

  async getPsychOnlineGridMods(filter, page, categoryId = null, options = {}) {
    const cacheKey = `${categoryId || "all"}:${filter}`;
    const state = this.psychOnlineFeedCache.get(cacheKey) || {
      gameBananaMods: [],
      gameBananaPage: 1,
      exhausted: false,
      snapshotId: null,
      sniroMods: null,
    };
    this.psychOnlineFeedCache.set(cacheKey, state);
    if (!state.sniroMods) {
      const sniroSort =
        {
          popular: "favoritedCount:desc",
          ripe: "downloadHits:desc",
          new: "submitted:desc",
          updated: "submitted:desc",
        }[filter] || "submitted:desc";
      state.sniroMods = await sniroApi.listAll("", sniroSort).catch(() => []);
    }

    const pageSize = 12;
    const required = Math.max(1, Number(page) || 1) * pageSize;
    while (!state.exhausted && state.gameBananaMods.length < required) {
      const result =
        filter === "ripe"
          ? await this.getRipeMods(state.gameBananaPage, categoryId, options)
          : await this.getCategoryFeed().getGridMods(
              filter,
              state.gameBananaPage,
              categoryId,
              { ...options, snapshotId: state.snapshotId },
            );
      const batch = Array.isArray(result) ? result : result.mods || [];
      state.snapshotId = Array.isArray(result)
        ? null
        : result.snapshotId || state.snapshotId;
      state.gameBananaMods.push(...batch);
      state.gameBananaPage += 1;
      state.exhausted = Array.isArray(result)
        ? batch.length < pageSize
        : Boolean(result.exhausted);
      if (!batch.length) state.exhausted = true;
    }

    const sortCombinedMods = (left, right) => {
      if (filter === "ripe") {
        return (
          Number(right.views || 0) - Number(left.views || 0) ||
          Number(right.likes || 0) - Number(left.likes || 0)
        );
      }
      const leftTime = Number(left.submittedAt || 0) || 0;
      const rightTime = Number(right.submittedAt || 0) || 0;
      return (
        rightTime - leftTime || String(left.id).localeCompare(String(right.id))
      );
    };
    const combined =
      filter === "popular"
        ? this.mergePsychOnlineDiscoveryMods(
            state.gameBananaMods,
            state.sniroMods,
          )
        : [...state.gameBananaMods, ...state.sniroMods].sort(sortCombinedMods);
    const start = (Math.max(1, Number(page) || 1) - 1) * pageSize;
    return {
      mods: combined.slice(start, start + pageSize),
      exhausted: state.exhausted && start + pageSize >= combined.length,
      snapshotId: state.snapshotId,
    };
  },

  mergePsychOnlineDiscoveryMods(gameBananaMods, sniroMods) {
    const merged = [];
    let gameBananaIndex = 0;
    let sniroIndex = 0;
    while (
      gameBananaIndex < gameBananaMods.length ||
      sniroIndex < sniroMods.length
    ) {
      merged.push(
        ...gameBananaMods.slice(gameBananaIndex, gameBananaIndex + 4),
      );
      gameBananaIndex += 4;
      if (sniroIndex < sniroMods.length) merged.push(sniroMods[sniroIndex++]);
    }
    return merged;
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

  async getSearchSuggestions(query, limit = 8) {
    return this.getSearchService().getSuggestions(query, limit);
  },

  getSearchTitleRelevance(mod, query) {
    return rankSearchTitle(mod, query);
  },

  getTypoSearchVariants(query) {
    return buildTypoSearchVariants(query);
  },

  getSearchTypoRelevance(mod, query) {
    return rankSearchTypo(mod, query);
  },

  getSearchService() {
    if (!this.searchService) {
      this.searchService = new GameBananaSearchService({
        api: this,
        sniroApi,
      });
    }
    return this.searchService;
  },

  async searchMods(query, page = 1, perPage = 12) {
    return this.getSearchService().search(query, page, perPage);
  },
};
