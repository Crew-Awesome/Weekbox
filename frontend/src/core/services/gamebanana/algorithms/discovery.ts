import http from "@http";
import { GB_BASE_URL, FNF_GAME_ID, ENGINE_CATEGORIES } from "../constants";
import { isExcluded } from "../utils";

/**
 * @description Fetches discovery records by polling different sorting strategies
 * (Newest and Most Liked) across allowed engine categories.
 * @param {string | null} targetEngineId - Optional ID to filter by a specific engine.
 * @returns {Promise<any[]>} An array of unique, filtered GameBanana mod records.
 */
export async function fetchDiscoveryRecords(
  targetEngineId: string | null = null,
) {
  let categoryIds = Object.keys(ENGINE_CATEGORIES).map(Number);
  if (targetEngineId && targetEngineId !== "all") {
    const match = Object.entries(ENGINE_CATEGORIES).find(
      ([_, cat]) => cat.id === targetEngineId,
    );
    if (match) categoryIds = [Number(match[0])];
    else return [];
  }

  const sources = [
    { sort: "Generic_Newest", pages: 4 },
    { sort: "Generic_MostLiked", pages: 1 },
  ];

  const requests: Promise<any[]>[] = [];

  for (const source of sources) {
    for (let page = 1; page <= source.pages; page++) {
      for (const catId of categoryIds) {
        requests.push(
          (async () => {
            const url =
              GB_BASE_URL +
              "/Mod/Index?_nPage=" +
              page +
              "&_nPerpage=15&_aFilters[Generic_Game]=" +
              FNF_GAME_ID +
              "&_aFilters[Generic_Category]=" +
              catId +
              "&_sSort=" +
              source.sort;
            try {
              const res: any = await http.fetchJson(url);
              const records = res?._aRecords || [];
              return records.map((r: any) => ({
                ...r,
                __injectedCategoryId: catId,
              }));
            } catch {
              return [];
            }
          })(),
        );
      }
    }
  }

  const responses = await Promise.all(requests);
  const allRecords = responses.flat();

  // Deduplicate records based on their unique Row ID
  const uniqueRecords = Array.from(
    new Map(allRecords.map((r) => [r._idRow, r])).values(),
  );

  // Filter out globally excluded mods (e.g. adult content, trash)
  return uniqueRecords.filter((r) => !isExcluded(r));
}
