import { FeaturedService } from "../../services/gamebanana/featured.service.js";
import { CategoryFeedService } from "../../services/gamebanana/category-feed.service.js";
import { GameBananaCategoryResolver } from "../../utils/gamebanana/category-resolver.js";
import {
  getDownloadFiles,
  getExternalDownloadLabel,
  getPreferredDownloadOption,
  isInstallableDownloadFile,
} from "../../utils/gamebanana/download-options.js";
import {
  formatBytes,
  getImageUrl,
  getImageUrls,
  getTimeAgo,
  toGridMod,
} from "../../utils/gamebanana/mod-presentation.js";
import { GameBananaTransport } from "./transport.js";
import { GameBananaSearchService } from "../../services/gamebanana/search.service.js";
import {
  getSearchTitleRelevance as rankSearchTitle,
  getSearchTypoRelevance as rankSearchTypo,
  getTypoSearchVariants as buildTypoSearchVariants,
} from "../../utils/gamebanana/search-ranking.js";
import { parseGameBananaSubmission } from "../../utils/gamebanana/submission-links.js";
import { DISCOVERY_CONFIG } from "../../config/discovery.config.js";
import { peoApi } from "../peo/peo.provider.js";
import { backstageApi } from "../backstage/backstage.provider.js";
import { gameJoltApi } from "../gamejolt/gamejolt.provider.js";
import { nativeFetch } from "../../services/network/native-http.js";
import { setBoundedCache } from "../../utils/bounded-cache.util.js";
import {
  buildModDetails,
  buildToolDetails,
  EXCLUDED_ENGINE_SUBMISSIONS,
  getRawRequirements,
  isDependencyRequirement,
} from "./mod-details.mapper.js";
import { gameBananaExternalDownloads } from "../../services/gamebanana/external-download.service.js";
import { gameBananaDownloadOptions } from "../../services/gamebanana/download-options.service.js";
import {
  ENGINE_CATEGORY_IDS,
  ENGINE_CATEGORY_ROOTS,
  CATEGORY_ROOTS,
  CATEGORY_GROUPS,
  EXCLUDED_MOD_CATEGORY_IDS,
  MOD_KIND_CATEGORY_IDS,
} from "../../config/engines.config.js";

const OTHER_MISC_CATEGORY_ID = 43773;
const OTHER_MISC_CATEGORY_IDS = [43773, 3046, 3828, 43772];
const OTHER_MISC_ENGINE_CATEGORY_IDS = [43850, 43798];

function isOtherMiscCategory(api, mod) {
  return OTHER_MISC_CATEGORY_IDS.some((categoryId) =>
    api.isInCategory(
      categoryId,
      mod._aCategory,
      mod._aSuperCategory,
      mod._aRootCategory,
      mod._aSubCategory,
    ),
  );
}

function isOtherMiscEngineMod(api, mod) {
  return OTHER_MISC_ENGINE_CATEGORY_IDS.some((categoryId) =>
    api.isInCategory(
      categoryId,
      mod._aCategory,
      mod._aSuperCategory,
      mod._aRootCategory,
      mod._aSubCategory,
    ),
  );
}

function appendRipeMods(api, feed, records, targetCategoryId) {
  for (const mod of records) {
    const inTargetCategory =
      targetCategoryId === OTHER_MISC_CATEGORY_ID
        ? isOtherMiscCategory(api, mod)
        : targetCategoryId &&
          api.isInCategory(
            targetCategoryId,
            mod._aCategory,
            mod._aSuperCategory,
            mod._aRootCategory,
            mod._aSubCategory,
          );
    if (
      mod?._sModelName !== "Mod" ||
      api.isDeletedMod(mod) ||
      api.isExcludedEngineSubmission(mod) ||
      (api.isExcludedCategory(
        mod._aCategory,
        mod._aSuperCategory,
        mod._aRootCategory,
        mod._aSubCategory,
      ) &&
        !inTargetCategory)
    )
      continue;

    const engineId = api.getEngineIdForCategories(
      mod._aCategory,
      mod._aSuperCategory,
      mod._aRootCategory,
      mod._aSubCategory,
      mod._idCategory,
    );
    if (
      (Number(targetCategoryId) === OTHER_MISC_CATEGORY_ID &&
        isOtherMiscEngineMod(api, mod)) ||
      (!engineId && !inTargetCategory) ||
      (targetCategoryId && !inTargetCategory)
    )
      continue;
    if (feed.modIds.has(mod._idRow)) continue;
    feed.modIds.add(mod._idRow);
    feed.mods.push({ ...mod, __resolvedEngineId: engineId });
  }
}

async function fetchRipePage(api, sourcePage, signal) {
  try {
    const params = new URLSearchParams({
      _sSort: "default",
      _nPage: String(sourcePage),
    });
    const response = await nativeFetch(
      `${api.subfeedBaseUrl}/Game/${api.gameId}/Subfeed?${params}`,
      { signal },
    );
    if (!response.ok) throw new Error("Ripe Subfeed request failed");
    return { records: api.getValidRecords(await response.json()) };
  } catch (error) {
    return { error };
  }
}

async function loadRipeBatch(
  api,
  feed,
  sourcePages,
  targetCategoryId,
  options,
  requiredMods,
  streamedMods,
) {
  const pageRequests = sourcePages.map((sourcePage) =>
    fetchRipePage(api, sourcePage, options.signal),
  );
  let successfulPages = 0;
  let firstPageError = null;
  const failedPages = [];
  let sawShortPage = false;
  for (let index = 0; index < pageRequests.length; index += 1) {
    const pageResult = await pageRequests[index];
    if (pageResult.error) {
      if (pageResult.error.name === "AbortError") throw pageResult.error;
      firstPageError ||= pageResult.error;
      failedPages.push(sourcePages[index]);
      continue;
    }
    successfulPages += 1;
    const records = pageResult.records;
    if (!feed.complete) appendRipeMods(api, feed, records, targetCategoryId);
    if (
      Number(options.page || 1) === 1 &&
      typeof options.onProgress === "function" &&
      feed.mods.length > streamedMods
    ) {
      const chunk = feed.mods.slice(
        streamedMods,
        Math.min(requiredMods, feed.mods.length),
      );
      streamedMods += chunk.length;
      if (chunk.length)
        await options.onProgress(chunk.map((mod) => api.toGridMod(mod)));
    }
    if (records.length < 15) sawShortPage = true;
  }
  return {
    successfulPages,
    firstPageError,
    failedPages,
    sawShortPage,
    streamedMods,
  };
}

function getRipeFeedState(api, categoryId) {
  const targetCategoryId = Number.isFinite(Number(categoryId))
    ? Number(categoryId)
    : null;
  const cacheKey = targetCategoryId || "all";
  const feed = api.ripeFeedCache.get(cacheKey) || {
    sourcePage: 1,
    mods: [],
    modIds: new Set(),
    complete: false,
  };
  setBoundedCache(api.ripeFeedCache, cacheKey, feed, 20);
  return { feed, targetCategoryId };
}

async function fillRipeFeed(
  api,
  feed,
  targetCategoryId,
  page,
  pageSize,
  options,
  streamedMods,
) {
  const requiredMods = Math.max(1, Number(page) || 1) * pageSize;
  const streamFirstPage =
    Number(page) === 1 && typeof options.onProgress === "function";
  while (!feed.complete && feed.mods.length < requiredMods) {
    const sourcePages = Array.from(
      { length: 3 },
      (_, index) => feed.sourcePage + index,
    );
    const batch = await loadRipeBatch(
      api,
      feed,
      sourcePages,
      targetCategoryId,
      { ...options, page: streamFirstPage ? 1 : page },
      requiredMods,
      streamedMods,
    );
    streamedMods = batch.streamedMods;
    if (!batch.successfulPages)
      throw batch.firstPageError || new Error("Ripe Subfeed request failed");
    if (batch.failedPages.length) {
      feed.sourcePage = Math.min(...batch.failedPages);
    } else {
      feed.sourcePage += sourcePages.length;
      if (batch.sawShortPage) feed.complete = true;
    }
  }
  return streamedMods;
}

function formatRipeResult(api, feed, page, pageSize, streamedMods) {
  const start = (Math.max(1, Number(page) || 1) - 1) * pageSize;
  const result = feed.mods.slice(start, start + pageSize);
  if (streamedMods) {
    return {
      mods: result.slice(Math.max(0, streamedMods - start)),
      exhausted: feed.complete && start + pageSize >= feed.mods.length,
      streamed: true,
    };
  }
  return result.map((mod) => api.toGridMod(mod));
}

async function loadPsychOnlineBatch(
  api,
  state,
  filter,
  categoryId,
  options,
  pageSize,
) {
  const result =
    filter === "ripe"
      ? await api.getRipeMods(state.gameBananaPage, categoryId, options)
      : await api
          .getCategoryFeed()
          .getGridMods(filter, state.gameBananaPage, categoryId, {
            ...options,
            snapshotId: state.snapshotId,
          });
  const batch = Array.isArray(result) ? result : result.mods || [];
  const sourceErrors = Array.isArray(result)
    ? []
    : Array.isArray(result.sourceErrors)
      ? result.sourceErrors
      : [];
  state.snapshotId = Array.isArray(result)
    ? null
    : result.snapshotId || state.snapshotId;
  if (sourceErrors.length && !batch.length) {
    state.exhausted = false;
    return { sourceErrors };
  }
  state.gameBananaMods.push(...batch);
  state.gameBananaPage += 1;
  state.exhausted = Array.isArray(result)
    ? batch.length < pageSize
    : Boolean(result.exhausted);
  if (!batch.length && !sourceErrors.length) state.exhausted = true;
  return { sourceErrors };
}

export const gameBananaApi = {
  baseUrl: "https://gamebanana.com/apiv11",
  subfeedBaseUrl: "https://gamebanana.com/apiv12",
  gameId: 8694,
  categoryRoots: CATEGORY_ROOTS,
  excludedCategoryIds: new Set(EXCLUDED_MOD_CATEGORY_IDS),
  engineCategories: ENGINE_CATEGORY_IDS,
  modKindCategories: MOD_KIND_CATEGORY_IDS,
  legacyEngineCategories: {
    43774: "vslice",
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

  getModKindForCategories(...categories) {
    return this.getCategoryResolver().getModKindForCategories(...categories);
  },

  getCategoryResolver() {
    if (!this.categoryResolver) {
      this.categoryResolver = new GameBananaCategoryResolver({
        engineCategories: this.engineCategories,
        modKindCategories: this.modKindCategories,
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
      mod?._bIsWithheld ||
      mod?._bIsHidden ||
      mod?._sInitialVisibility === "hide",
    );
  },

  async getModProfile(modId) {
    const id = Number(modId);
    if (!id) return null;
    if (this.modProfileCache.has(id)) return this.modProfileCache.get(id);
    if (this.modProfileRequests.has(id)) return this.modProfileRequests.get(id);
    const request = nativeFetch(`${this.baseUrl}/Mod/${id}/ProfilePage`)
      .then(async (response) => {
        if (!response.ok) return null;
        const profile = await response.json();
        setBoundedCache(this.modProfileCache, id, profile, 100);
        return profile;
      })
      .catch(() => null)
      .finally(() => this.modProfileRequests.delete(id));
    this.modProfileRequests.set(id, request);
    return request;
  },

  getGameBananaSubmission(url) {
    return parseGameBananaSubmission(url);
  },

  getPrimaryDownloadFile(data) {
    const files = this.getDownloadFiles(data);
    return files.find((file) => this.isInstallableDownloadFile(file)) || null;
  },

  getDownloadFiles(data) {
    return getDownloadFiles(data);
  },

  isInstallableDownloadFile(file) {
    return isInstallableDownloadFile(file);
  },

  getExternalDownloadLabel(url) {
    return getExternalDownloadLabel(url);
  },

  getPreferredDownloadOption(options) {
    return getPreferredDownloadOption(options);
  },

  getExternalDownloadFiles(data) {
    return gameBananaDownloadOptions.getExternalFiles(data, this);
  },

  async getExternalFileDetails(url) {
    return gameBananaExternalDownloads.getFileDetails(url);
  },

  async isDownloadAvailable(url) {
    return gameBananaExternalDownloads.isAvailable(url);
  },

  formatDownloadDate(timestamp) {
    return gameBananaDownloadOptions.formatDate(timestamp);
  },

  async getDownloadOptions(data) {
    return gameBananaDownloadOptions.getOptions(data, this);
  },

  async getToolDetails(toolId, { requireDownload = true } = {}) {
    try {
      const response = await nativeFetch(
        `${this.baseUrl}/Tool/${Number(toolId)}/ProfilePage`,
      );
      if (!response.ok) return null;
      const data = await response.json();
      const file = this.getPrimaryDownloadFile(data);
      if (!file && requireDownload) return null;
      const images = getImageUrls(data);
      if (!images.length) images.push("assets/img/placeholder-mini.jpg");
      return buildToolDetails(this, data, file, images);
    } catch {
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
      fileSize: mod.fileSize,
      fileSizeStr: mod.fileSizeStr,
      thumbnail: mod.images?.[0] || null,
      gameBananaUrl: mod.gameBananaUrl,
      downloadType: mod.downloadType,
    };
  },

  async getRequirements(data) {
    const rawRequirements = getRawRequirements(data);
    const requirements = Array.isArray(rawRequirements[0])
      ? rawRequirements
      : rawRequirements.length >= 2
        ? [rawRequirements]
        : [];
    const resolved = await Promise.all(
      requirements
        .filter(([, url]) => isDependencyRequirement(url))
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

  async getModDetails(modId, { includeRequirements = true, onProgress } = {}) {
    const notifyProgress = async (details) => {
      if (typeof onProgress === "function") await onProgress(details);
    };
    if (String(modId).startsWith("gamejolt:")) {
      try {
        return await gameJoltApi.getGameDetails(
          String(modId).slice("gamejolt:".length),
        );
      } catch {
        return null;
      }
    }
    if (String(modId).startsWith("peo:")) {
      try {
        return await peoApi.getModDetails(String(modId).slice("peo:".length));
      } catch {
        return null;
      }
    }
    if (String(modId).startsWith("backstage:")) {
      try {
        return await backstageApi.getModDetails(
          String(modId).slice("backstage:".length),
        );
      } catch {
        return null;
      }
    }
    try {
      const data = await this.getModProfile(modId);
      if (!data) return null;
      let images = getImageUrls(data);
      if (images.length === 0) images.push("assets/img/placeholder-mini.jpg");
      await notifyProgress(
        buildModDetails(this, data, images, [], [], {
          loadingDownloads: true,
          loadingRequirements: includeRequirements,
        }),
      );
      let downloadOptions = [];
      try {
        downloadOptions = await this.getDownloadOptions(data);
      } catch (error) {
        console.warn("Could not inspect GameBanana download options", error);
      }
      await notifyProgress(
        buildModDetails(this, data, images, downloadOptions, [], {
          loadingRequirements: includeRequirements,
        }),
      );
      let requirements = [];
      if (includeRequirements) {
        try {
          requirements = await this.getRequirements(data);
        } catch (error) {
          console.warn("Could not inspect GameBanana requirements", error);
        }
      }
      return buildModDetails(this, data, images, downloadOptions, requirements);
    } catch {
      return null;
    }
  },

  async getMemberProfile(memberId) {
    const id = Number(memberId);
    if (!id) return null;
    try {
      const response = await nativeFetch(
        `${this.baseUrl}/Member/${id}/ProfilePage`,
      );
      if (!response.ok) return null;
      const data = await response.json();
      return {
        id: data._idRow,
        username: data._sName || "Unknown Creator",
        avatar: data._sAvatarUrl || "",
        profileUrl: data._sProfileUrl || `https://gamebanana.com/members/${id}`,
      };
    } catch {
      return null;
    }
  },

  async getMemberMods(memberId, page = 1, perPage = 12) {
    const id = Number(memberId);
    if (!id) return [];
    try {
      const requestedPage = Math.max(1, Number(page) || 1);
      const requestedPerPage = Math.max(1, Number(perPage) || 12);
      const records = [];
      let currentPage = requestedPage;
      let totalPages = requestedPage;

      while (currentPage <= totalPages) {
        const params = new URLSearchParams({
          _nPage: String(currentPage),
          _nPerpage: String(requestedPerPage),
          _sSort: "date",
          _sDirection: "DESC",
          _sNameOperator: "contains",
        });
        const response = await nativeFetch(
          `${this.baseUrl}/Member/${id}/Submissions/Sublog?${params}`,
        );
        if (!response.ok) return [];
        const data = await response.json();
        records.push(...this.getValidRecords(data));

        const metadata = data?._aMetadata || {};
        const recordCount = Number(metadata._nRecordCount || 0);
        const pageSize = Number(metadata._nPerpage || requestedPerPage);
        totalPages = recordCount
          ? Math.ceil(recordCount / pageSize)
          : currentPage;
        if (metadata._bIsComplete || currentPage >= totalPages) break;
        currentPage += 1;
      }

      return records
        .filter(
          (mod) =>
            mod?._sModelName === "Mod" &&
            Number(mod._aGame?._idRow || mod._idGame) === this.gameId &&
            !this.isDeletedMod(mod),
        )
        .map((mod) => this.toGridMod(mod));
    } catch {
      return [];
    }
  },

  async getFeaturedCarousel() {
    if (!this.featuredService) {
      this.featuredService = new FeaturedService({
        url: this.featuredUrl,
        getTimeAgo: this.getTimeAgo.bind(this),
      });
    }
    return this.featuredService.getCarousel();
  },

  toGridMod(mod) {
    return toGridMod(
      mod,
      (record) =>
        this.getEngineIdForCategories(
          record.__injectedCategoryId,
          record._aCategory,
          record._aSuperCategory,
          record._aRootCategory,
          record._aSubCategory,
          record._idCategory,
        ) ||
        this.getEngineIdForCategoryName(
          record._aCategory,
          record._aSuperCategory,
          record._aRootCategory,
          record._aSubCategory,
        ),
    );
  },

  async getRipeMods(page = 1, categoryId = null, options = {}) {
    let streamedMods = 0;
    try {
      const pageSize = Math.max(1, Number(options.pageSize) || 12);
      const { feed, targetCategoryId } = getRipeFeedState(this, categoryId);
      streamedMods = await fillRipeFeed(
        this,
        feed,
        targetCategoryId,
        page,
        pageSize,
        options,
        streamedMods,
      );
      return formatRipeResult(this, feed, page, pageSize, streamedMods);
    } catch (error) {
      if (error?.name === "AbortError") return [];
      console.warn("Could not load GameBanana Ripe feed", error);
      if (streamedMods)
        return {
          mods: [],
          exhausted: false,
          streamed: true,
          sourceErrors: [error],
        };
      return { mods: [], exhausted: false, sourceErrors: [error] };
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
      peoMods: null,
    };
    setBoundedCache(this.psychOnlineFeedCache, cacheKey, state, 20);
    if (!state.peoMods) {
      const peoSort =
        {
          popular: "favoritedCount:desc",
          ripe: "downloadHits:desc",
          new: "submitted:desc",
          updated: "submitted:desc",
        }[filter] || "submitted:desc";
      state.peoMods = await peoApi.listAll("", peoSort).catch(() => []);
    }

    const pageSize = Math.max(1, Number(options.pageSize) || 12);
    const required = Math.max(1, Number(page) || 1) * pageSize;
    let sourceErrors = [];
    while (!state.exhausted && state.gameBananaMods.length < required) {
      const modsBefore = state.gameBananaMods.length;
      const batchResult = await loadPsychOnlineBatch(
        this,
        state,
        filter,
        categoryId,
        options,
        pageSize,
      );
      sourceErrors = batchResult.sourceErrors;
      if (!state.exhausted && state.gameBananaMods.length === modsBefore) {
        if (!sourceErrors.length) state.exhausted = true;
        else break;
      }
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
            state.peoMods,
          )
        : [...state.gameBananaMods, ...state.peoMods].sort(sortCombinedMods);
    const start = (Math.max(1, Number(page) || 1) - 1) * pageSize;
    return {
      mods: combined.slice(start, start + pageSize),
      exhausted: state.exhausted && start + pageSize >= combined.length,
      snapshotId: state.snapshotId,
      sourceErrors,
    };
  },

  mergePsychOnlineDiscoveryMods(gameBananaMods, peoMods) {
    const merged = [];
    let gameBananaIndex = 0;
    let peoIndex = 0;
    while (
      gameBananaIndex < gameBananaMods.length ||
      peoIndex < peoMods.length
    ) {
      merged.push(
        ...gameBananaMods.slice(gameBananaIndex, gameBananaIndex + 4),
      );
      gameBananaIndex += 4;
      if (peoIndex < peoMods.length) merged.push(peoMods[peoIndex++]);
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
        categoryGroups: CATEGORY_GROUPS,
        defaultCategoryRoots: ENGINE_CATEGORY_ROOTS,
        getRecords: this.getValidRecords.bind(this),
        toGridMod: this.toGridMod.bind(this),
        isExcluded: (mod, categoryId) =>
          this.isExcludedEngineSubmission(mod) ||
          (OTHER_MISC_CATEGORY_IDS.includes(Number(categoryId)) &&
            isOtherMiscEngineMod(this, mod)),
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

  async getSearchSuggestions(query, model = "Mod", limit = 8) {
    return this.getSearchService().getSuggestionsForModel(query, model, limit);
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
        peoApi,
      });
    }
    return this.searchService;
  },

  async searchMods(query, page = 1, perPage = 12) {
    return this.getSearchService().search(query, page, perPage);
  },

  async searchMembers(query, page = 1, perPage = 12) {
    return this.getSearchService().searchMembers(query, page, perPage);
  },
};
