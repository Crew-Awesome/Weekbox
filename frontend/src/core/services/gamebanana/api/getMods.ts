import http from "@http";
import { GB_BASE_URL, FNF_GAME_ID, ENGINE_CATEGORIES } from "../constants";
import type { GameBananaMod } from "../types";
import {
  getTimeAgo,
  getEngineId,
  getEngineIcon,
  isExcluded,
  extractAuthors,
  extractThumbnail,
  extractUserId,
  extractUserPfp,
  checkIsNsfw,
} from "../utils";
import Utils from "@utils";
import {
  fetchRipeRecords,
  fetchPopularRecords,
  fetchSearchRecords,
} from "../algorithms";

export type ModFilter = "popular" | "new" | "ripe" | "updated";

/**
 * Master router for fetching Mods from GameBanana. Acts as a unified entry point
 * that redirects the request to the appropriate sub-algorithm (search, popular, ripe, discovery).
 * Retrieves shallow list of mods and immediately fetches deep metadata (Mod/Multi) to hydrate UI fields.
 * 
 * @param {ModFilter} filter - The active sorting or mode filter (e.g., `"popular"`, `"new"`, `"ripe"`, `"updated"`). Defaults to `"popular"`.
 * @param {number} page - Current page to request. Defaults to `1`.
 * @param {number} perPage - Number of items to return per page. Defaults to `15`.
 * @param {string[] | string | null} engineIds - Target engine categories to filter by. Defaults to `null`.
 * @param {string} searchQuery - Search term to engage the search algorithm. Defaults to `""`.
 * @returns {Promise<GameBananaMod[]>} Array of fully mapped `GameBananaMod` objects ready to be consumed by the UI.
 */
export async function getMods(
  filter: ModFilter = "popular",
  page = 1,
  perPage = 15,
  engineIds: string[] | string | null = null,
  searchQuery: string = "",
): Promise<GameBananaMod[]> {
  let rawRecords: any[] = [];

  const enginesArray = Array.isArray(engineIds)
    ? engineIds
    : engineIds
      ? [engineIds]
      : ["all"];
  const isAll =
    enginesArray.length === 0 ||
    (enginesArray.length === 1 && enginesArray[0] === "all");

  if (searchQuery.trim().length > 0) {
    rawRecords = await fetchSearchRecords(
      searchQuery,
      enginesArray,
      filter,
      page,
      perPage,
    );
  } else if (filter === "popular") {
    rawRecords = await fetchPopularRecords(
      isAll ? null : enginesArray,
      9999,
      page * perPage,
    );
  } else if (filter === "ripe") {
    rawRecords = await fetchRipeRecords(
      isAll ? null : enginesArray,
      9999,
      page * perPage,
    );
  } else if (filter === "new" || filter === "updated") {
    let categoryIds = Object.keys(ENGINE_CATEGORIES).map(Number);
    if (!isAll) {
      categoryIds = enginesArray
        .map((id) => {
          const match = Object.entries(ENGINE_CATEGORIES).find(
            ([_, cat]) => cat.id === id,
          );
          return match ? Number(match[0]) : -1;
        })
        .filter((id) => id !== -1);
    }

    const sortStr =
      filter === "updated" ? "Generic_LatestUpdated" : "Generic_Newest";

    const requests = categoryIds.map(async (catId) => {
      const url =
        GB_BASE_URL +
        "/Mod/Index?_nPage=" +
        page +
        "&_nPerpage=" +
        perPage +
        "&_aFilters[Generic_Game]=" +
        FNF_GAME_ID +
        "&_aFilters[Generic_Category]=" +
        catId +
        "&_sSort=" +
        sortStr;
      try {
        const res: any = await http.fetchJson(url);
        const records = res?._aRecords || [];
        return records.map((r: any) => ({ ...r, __injectedCategoryId: catId }));
      } catch {
        return [];
      }
    });

    const allRecords = (await Promise.all(requests)).flat();

    // De-duplicate in case of overlap between categories
    const uniqueRecords = Array.from(
      new Map(allRecords.map((r) => [r._idRow, r])).values(),
    );

    rawRecords = uniqueRecords
      .filter((r) => !isExcluded(r))
      .sort((a, b) => {
        const timeA =
          filter === "updated"
            ? a._tsDateUpdated || a._tsDateModified || a._tsDateAdded || 0
            : a._tsDateAdded || 0;
        const timeB =
          filter === "updated"
            ? b._tsDateUpdated || b._tsDateModified || b._tsDateAdded || 0
            : b._tsDateAdded || 0;
        return Number(timeB) - Number(timeA);
      });
  }

  if (searchQuery.trim().length > 0) {
    // fetchSearchRecords already slices correctly internally
  } else if (filter === "new" || filter === "updated") {
    rawRecords = rawRecords.slice(0, perPage);
  } else {
    rawRecords = rawRecords.slice((page - 1) * perPage, page * perPage);
  }

  if (rawRecords.length === 0) return [];

  // Batch fetch secondary statistics and full descriptions using the Mod/Multi endpoint
  // GameBanana often fails or truncates when _csvRowIds has too many items, so we chunk them.
  const CHUNK_SIZE = 15;
  let multiData: any[] = [];

  try {
    const chunkPromises = [];
    for (let i = 0; i < rawRecords.length; i += CHUNK_SIZE) {
      const chunk = rawRecords.slice(i, i + CHUNK_SIZE);
      const modIds = chunk.map((r) => r._idRow).join(",");
      const multiUrl =
        GB_BASE_URL +
        "/Mod/Multi?_csvRowIds=" +
        modIds +
        "&_csvProperties=_idRow,_nLikeCount,_nViewCount,_nDownloadCount,_sDescription,_sText,_aCredits,_aCategory,_aSuperCategory,_aRootCategory";

      chunkPromises.push(http.fetchJson(multiUrl));
    }

    const chunkResults = await Promise.all(chunkPromises);
    multiData = chunkResults.flat();
  } catch (e) {
    console.error("GameBanana Mod/Multi failed:", e);
  }

  const multiMap = new Map<number, any>();
  for (const d of multiData) {
    if (d && d._idRow) {
      multiMap.set(d._idRow, d);
    }
  }

  let finalMods: GameBananaMod[] = rawRecords.map((mod) => {
    const meta: any = multiMap.get(mod._idRow) || {};
    let finalEngineId = mod.__resolvedEngineId || getEngineId(mod);
    if (finalEngineId === "unknown") finalEngineId = getEngineId(meta);

    return {
      id: mod._idRow,
      gameId: FNF_GAME_ID,
      title: mod._sName || "Unknown Mod",
      description: Utils.sanitize.htmlToPlainText(
        meta._sDescription || meta._sText || "",
      ),
      htmlBody: Utils.sanitize.sanitizeHtml(
        meta._sText || meta._sDescription || "",
      ),
      author: mod._aSubmitter?._sName || "Unknown Creator",
      userId: extractUserId(mod),
      userPfp: extractUserPfp(mod),
      authors: extractAuthors(meta._aCredits),
      likes: mod._nLikeCount || meta._nLikeCount || 0,
      views: mod._nViewCount || meta._nViewCount || 0,
      downloads: meta._nDownloadCount || 0,
      submittedAt: mod._tsDateAdded,
      timeAgo: getTimeAgo(mod._tsDateAdded),
      engineId: finalEngineId,
      engineIcon: getEngineIcon(finalEngineId),
      thumbnail: extractThumbnail(mod),
      isNsfw: checkIsNsfw(mod),
    };
  });

  return finalMods;
}
