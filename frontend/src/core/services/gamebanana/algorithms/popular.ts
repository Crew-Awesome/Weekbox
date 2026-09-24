import http from "@http";
import { FNF_GAME_ID, ENGINE_CATEGORIES } from "../constants";
import { isExcluded } from "../utils";
import { setNetworkOnline } from "../../../../utils/hooks/use-network";
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
    const val = popularCache.get(cacheKey)!;
    popularCache.delete(cacheKey);
    popularCache.set(cacheKey, val);
  }

  const state = popularCache.get(cacheKey)!;

  if (state.records.length >= maxRecords || state.isComplete) {
    return state.records.slice(0, maxRecords);
  }

  const indexUrl = "https://gamebanana.com/apiv11/Mod/Index";
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
      let allFetched: any[] = [];

      let hasNetworkError = false;

      if (isAll) {
        const perPageToFetch = Math.max(15, Math.min(30, maxRecords));
        const url = `${indexUrl}?_aFilters[Generic_Game]=${FNF_GAME_ID}&_sSort=Generic_MostDownloaded&_nPerpage=${perPageToFetch}&_nPage=${state.sourcePage}`;
        try {
          const res: any = await http.fetchJson(url);
          allFetched = res?._aRecords || [];
        } catch (err) {
          console.warn("fetchPopularRecords failed for all engines:", err);
          hasNetworkError = true;
          allFetched = [];
        }
      } else {
        const perCatPerPage = Math.max(10, Math.ceil(maxRecords / categoryIds.length));
        const requests = categoryIds.map(async (catId) => {
          const url = `${indexUrl}?_aFilters[Generic_Game]=${FNF_GAME_ID}&_aFilters[Generic_Category]=${catId}&_sSort=Generic_MostDownloaded&_nPerpage=${perCatPerPage}&_nPage=${state.sourcePage}`;
          try {
            const res: any = await http.fetchJson(url);
            const records = res?._aRecords || [];
            return records.map((r: any) => ({
              ...r,
              __resolvedEngineId: ENGINE_CATEGORIES[catId]?.id,
            }));
          } catch (err) {
            hasNetworkError = true;
            return [];
          }
        });

        const results = await Promise.all(requests);
        allFetched = results.flat();
      }

      if (hasNetworkError && allFetched.length === 0) {
        if (typeof navigator !== "undefined" && !navigator.onLine) {
          try {
            setNetworkOnline(false);
          } catch {}
        }
        if (state.records.length === 0) {
          popularCache.delete(cacheKey);
          throw new Error("Failed to fetch popular mods from GameBanana (network error or timeout)");
        }
        break;
      }

      if (allFetched.length === 0) {
        state.isComplete = true;
        break;
      }

      try {
        const chunkPromises = [];
        for (let i = 0; i < allFetched.length; i += 40) {
          const chunkIds = allFetched.slice(i, i + 40).map((m: any) => m._idRow).join(",");
          if (chunkIds) {
            chunkPromises.push(http.fetchJson(`${multiUrlBase}&_csvRowIds=${chunkIds}`));
          }
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

export function clearPopularCache() {
  popularCache.clear();
}

