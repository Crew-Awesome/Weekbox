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

/**
 * @description Fetches "Popular" (Most Downloaded historically) records by querying all allowed categories in parallel.
 * @param {string | null} targetEngineId - Optional ID to filter by a specific engine.
 * @param {number} maxPages - Maximum depth of pages to query per execution to avoid hanging.
 * @param {number} maxRecords - Number of valid records needed before returning.
 * @returns {Promise<any[]>} An array of historical popular mods.
 */
export async function fetchPopularRecords(
  targetEngineId: string | null = null,
  maxPages = 4,
  maxRecords = 30,
) {
  const cacheKey = targetEngineId || "all";
  if (!popularCache.has(cacheKey)) {
    popularCache.set(cacheKey, {
      records: [],
      sourcePage: 1,
      modIds: new Set(),
      isComplete: false,
    });
  }

  const state = popularCache.get(cacheKey)!;

  if (state.records.length >= maxRecords || state.isComplete) {
    return state.records.slice(0, maxRecords);
  }

  const indexUrl = "https://gamebanana.com/apiv12/Mod/Index";

  let categoryIds = Object.keys(ENGINE_CATEGORIES).map(Number);
  if (targetEngineId && targetEngineId !== "all") {
    const match = Object.entries(ENGINE_CATEGORIES).find(
      ([_, cat]) => cat.id === targetEngineId,
    );
    if (match) categoryIds = [Number(match[0])];
  }

  while (
    !state.isComplete &&
    state.records.length < maxRecords &&
    state.sourcePage <= maxPages
  ) {
    try {
      // Fetch the current page for all allowed categories simultaneously
      const requests = categoryIds.map(async (catId) => {
        // Usa Generic_MostDownloaded para representar "Popular" histórico
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

      // Ordenar localmente por descargas
      allFetched.sort((a, b) => (b._nDownloadCount || 0) - (a._nDownloadCount || 0));

      for (const mod of allFetched) {
        if (
          mod?._sModelName !== "Mod" ||
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
