import http from "@http";
import { FNF_GAME_ID, ENGINE_CATEGORIES } from "../constants";
import { isExcluded } from "../utils";

const ripeCache = new Map<
  string,
  {
    records: any[];
    sourcePage: number;
    modIds: Set<number>;
    isComplete: boolean;
  }
>();

export async function fetchRipeRecords(
  targetEngineId: string | null = null,
  maxPages = 4,
  maxRecords = 30,
) {
  const cacheKey = targetEngineId || "all";
  if (!ripeCache.has(cacheKey)) {
    ripeCache.set(cacheKey, {
      records: [],
      sourcePage: 1,
      modIds: new Set(),
      isComplete: false,
    });
  }

  const state = ripeCache.get(cacheKey)!;

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
        const url = `${indexUrl}?_aFilters[Generic_Game]=${FNF_GAME_ID}&_aFilters[Generic_Category]=${catId}&_sSort=Generic_MostLiked&_nPerpage=30&_nPage=${state.sourcePage}`;
        try {
          const res: any = await http.fetchJson(url);
          const records = res?._aRecords || [];
          // Resolve engine id to avoid "unknown"
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

      // Sort by likes locally since we merged multiple categories
      allFetched.sort((a, b) => (b._nLikeCount || 0) - (a._nLikeCount || 0));

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
