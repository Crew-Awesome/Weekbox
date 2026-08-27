import http from "@http";
import { FNF_GAME_ID, ENGINE_CATEGORIES } from "../constants";
import { isExcluded } from "../utils";
/**
 * In-memory cache to store the pagination state and records for the "Popular" algorithm.
 */
const popularCache = new Map<
  string,
  {
    records: any[];
    sourcePage: number;
    modIds: Set<number>;
    isComplete: boolean;
  }
>();
const MAX_CACHE_SIZE = 20;

/**
 * Fetches "Popular" (Most Downloaded historically) records by querying all allowed categories in parallel.
 * @param {string[] | null} targetEngineIds - Optional array of engine IDs to filter by. Defaults to `null` (all engines).
 * @param {number} maxPages - Maximum depth of pages to query per execution to avoid hanging.
 * @param {number} maxRecords - Number of valid records needed before returning.
 * @returns {Promise<any[]>} An array of historical popular mods.
 */
export async function fetchPopularRecords(
  targetEngineIds: string[] | null = null,
  maxPages = 4,
  maxRecords = 30,
) {
  const isAll =
    !targetEngineIds ||
    targetEngineIds.length === 0 ||
    (targetEngineIds.length === 1 && targetEngineIds[0] === "all");
  const cacheKey = isAll ? "all" : targetEngineIds!.slice().sort().join(",");

  if (!popularCache.has(cacheKey)) {
    // If we reach the limit, remove the oldest (first inserted) entry
    if (popularCache.size >= MAX_CACHE_SIZE) {
      const oldestKey = popularCache.keys().next().value;
      if (oldestKey) popularCache.delete(oldestKey);
    }

    popularCache.set(cacheKey, {
      records: [],
      sourcePage: 1,
      modIds: new Set(),
      isComplete: false,
    });
  } else {
    // Refresh LRU recency by moving it to the end of the Map
    const val = popularCache.get(cacheKey)!;
    popularCache.delete(cacheKey);
    popularCache.set(cacheKey, val);
  }

  const state = popularCache.get(cacheKey)!;

  if (state.records.length >= maxRecords || state.isComplete) {
    return state.records.slice(0, maxRecords);
  }

  const indexUrl = "https://gamebanana.com/apiv12/Mod/Index";
  const multiUrlBase = "https://gamebanana.com/apiv11/Mod/Multi?_csvProperties=_idRow,_nDownloadCount";

  let categoryIds = Object.keys(ENGINE_CATEGORIES).map(Number);
  if (!isAll) {
    categoryIds = targetEngineIds!
      .map((id) => {
        const match = Object.entries(ENGINE_CATEGORIES).find(
          ([_, cat]) => cat.id === id,
        );
        return match ? Number(match[0]) : -1;
      })
      .filter((id) => id !== -1);
  }

  while (
    !state.isComplete &&
    state.records.length < maxRecords &&
    state.sourcePage <= maxPages
  ) {
    try {
      // Fetch the current page for all allowed categories simultaneously
      const requests = categoryIds.map(async (catId) => {
        // Use Generic_MostDownloaded to represent historical "Popular"
        const url = `${indexUrl}?_aFilters[Generic_Game]=${FNF_GAME_ID}&_aFilters[Generic_Category]=${catId}&_sSort=Generic_MostDownloaded&_nPerpage=30&_nPage=${state.sourcePage}`;
        try {
          const res: any = await http.fetchJson(url);
          const records = res?._aRecords || [];
          return records.map((r: any) => ({
            ...r,
            __resolvedEngineId: ENGINE_CATEGORIES[catId].id,
          }));
        } catch {
          return [];
        }
      });

      const results = await Promise.all(requests);
      const allFetched = results.flat();

      if (allFetched.length === 0) {
        state.isComplete = true;
        break;
      }

      // GameBanana Mod/Index doesn't return _nDownloadCount or something, so i explicitly fetch it here to sort correctly
      try {
        const chunkPromises = [];
        // GameBanana accepts up to 50 IDs per Multi request
        for (let i = 0; i < allFetched.length; i += 40) {
          const chunkIds = allFetched.slice(i, i + 40).map((m: any) => m._idRow).join(",");
          chunkPromises.push(http.fetchJson(`${multiUrlBase}&_csvRowIds=${chunkIds}`));
        }
        
        const multiResults = await Promise.all(chunkPromises);
        const multiData = multiResults.flat();
        
        const downloadsMap = new Map<number, number>();
        multiData.forEach((d: any) => {
          if (d && d._idRow) downloadsMap.set(d._idRow, d._nDownloadCount || 0);
        });

        allFetched.forEach((mod) => {
          mod._nDownloadCount = downloadsMap.get(mod._idRow) || 0;
        });
      } catch (e) {
        console.warn("Failed to fetch download counts in popular algorithm", e);
      }

      // Sort globally by a strong weighted combination of downloads and views to ensure absolute fairness across categories
      allFetched.sort((a, b) => {
        const scoreA = (a._nDownloadCount || 0) * 3 + (a._nViewCount || 0);
        const scoreB = (b._nDownloadCount || 0) * 3 + (b._nViewCount || 0);
        return scoreB - scoreA;
      });

      for (const mod of allFetched) {
        if (
          mod?._bIsTrashed ||
          mod?._bIsDeleted ||
          mod?._sInitialVisibility === "hide" ||
          isExcluded(mod)
        ) {
          continue;
        }

        if (state.modIds.has(mod._idRow)) continue;

        state.modIds.add(mod._idRow);
        state.records.push(mod);
      }
      state.sourcePage++;
    } catch (error) {
      break;
    }
  }

  return state.records.slice(0, maxRecords);
}
