import http from '@http';
import { GB_BASE_URL, FNF_GAME_ID, ENGINE_CATEGORIES } from '../constants';
import { isExcluded } from '../utils';

export async function fetchDiscoveryRecords(targetEngineId: string | null = null, pagesPerSource = 2) {
  let categoryIds = Object.keys(ENGINE_CATEGORIES).map(Number);
  if (targetEngineId) {
    const match = Object.entries(ENGINE_CATEGORIES).find(([_, name]) => name === targetEngineId);
    if (match) categoryIds = [Number(match[0])];
    else return []; 
  }

  const sources = ["Generic_Newest", "Generic_MostLiked"]; // 'new' para freshness, MostLiked para quality/likes
  const requests: Promise<any[]>[] = [];

  for (const sort of sources) {
    for (let page = 1; page <= pagesPerSource; page++) {
      for (const catId of categoryIds) {
        requests.push((async () => {
          const url = GB_BASE_URL + "/Mod/Index?_nPage=" + page + "&_nPerpage=15&_aFilters[Generic_Game]=" + FNF_GAME_ID + "&_aFilters[Generic_Category]=" + catId + "&_sSort=" + sort;
          try {
            const res: any = await http.fetchJson(url);
            const records = res?._aRecords || [];
            return records.map((r: any) => ({ ...r, __injectedCategoryId: catId }));
          } catch {
            return [];
          }
        })());
      }
    }
  }

  const responses = await Promise.all(requests);
  const allRecords = responses.flat();

  // Filtrar y deduplicar
  const uniqueRecords = Array.from(new Map(allRecords.map(r => [r._idRow, r])).values());
  return uniqueRecords.filter(r => !isExcluded(r));
}

