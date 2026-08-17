import http from '@http';
import { GB_BASE_URL, FNF_GAME_ID, ENGINE_CATEGORIES } from '../constants';
import type { GameBananaMod } from '../types';
import { getTimeAgo, getEngineId, getEngineIcon, isExcluded, extractAuthors, extractThumbnail, extractUserId, extractUserPfp } from '../utils';
import { fetchDiscoveryRecords, fetchRipeRecords, rankCandidates, applyDiversity } from '../algorithms';

export type ModFilter = 'popular' | 'new' | 'ripe' | 'updated';

const popularCache = new Map<string, { timestamp: number, mods: GameBananaMod[] }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

export async function getMods(filter: ModFilter = 'popular', page = 1, perPage = 15, engineId: string | null = null): Promise<GameBananaMod[]> {
  let rawRecords: any[] = [];
  let isPopularFallback = false;
  
  if (filter === 'popular') {
    const cacheKey = engineId || 'all';
    const cached = popularCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
       const slice = cached.mods.slice((page - 1) * perPage, page * perPage);
       if (slice.length > 0) return slice;
    }
    if (page > 4) isPopularFallback = true;
  }

  if (filter === 'ripe' || isPopularFallback) {
    rawRecords = await fetchRipeRecords(engineId, page * 2, page * perPage);
  } else if (filter === 'new' || filter === 'updated') {
    let categoryIds = Object.keys(ENGINE_CATEGORIES).map(Number);
    if (engineId && engineId !== 'all') {
      const match = Object.entries(ENGINE_CATEGORIES).find(([_, cat]) => cat.id === engineId);
      if (match) categoryIds = [Number(match[0])];
    }
    
    const sortStr = filter === 'updated' ? 'Generic_LatestUpdated' : 'Generic_Newest';
    
    const requests = categoryIds.map(async (catId) => {
      const url = GB_BASE_URL + "/Mod/Index?_nPage=" + page + "&_nPerpage=" + perPage + "&_aFilters[Generic_Game]=" + FNF_GAME_ID + "&_aFilters[Generic_Category]=" + catId + "&_sSort=" + sortStr;
      try {
        const res: any = await http.fetchJson(url);
        const records = res?._aRecords || [];
        return records.map((r: any) => ({ ...r, __injectedCategoryId: catId }));
      } catch { return []; }
    });
    
    const allRecords = (await Promise.all(requests)).flat();
    const uniqueRecords = Array.from(new Map(allRecords.map(r => [r._idRow, r])).values());
    
    rawRecords = uniqueRecords
      .filter(r => !isExcluded(r))
      .sort((a, b) => {
         const timeA = filter === 'updated' ? (a._tsDateUpdated || a._tsDateModified || a._tsDateAdded || 0) : (a._tsDateAdded || 0);
         const timeB = filter === 'updated' ? (b._tsDateUpdated || b._tsDateModified || b._tsDateAdded || 0) : (b._tsDateAdded || 0);
         return Number(timeB) - Number(timeA);
      });
  } else if (filter === 'popular' && !isPopularFallback) {
    rawRecords = await fetchDiscoveryRecords(engineId);
  }

  if (filter === 'popular' && !isPopularFallback) {
    // Mapeo temporal para poder rankear todos (500+ mods) sin pedir Multi
    let tempCandidates = rawRecords.map(r => ({
      raw: r,
      id: r._idRow,
      likes: r._nLikeCount || 0,
      views: r._nViewCount || 0,
      submittedAt: r._tsDateAdded,
      author: r._aSubmitter?._sName || "Unknown Creator",
      creatorId: r._aSubmitter?._idRow?.toString() || null,
    }));
    const ranked = rankCandidates(tempCandidates);
    const diverse = applyDiversity(ranked);
    // Tomamos los mejores 60 y extraemos sus raw objects para continuar el flujo
    rawRecords = diverse.slice(0, 60).map(c => c.raw);
  } else {
    rawRecords = rawRecords.slice((page - 1) * perPage, page * perPage);
  }

  if (rawRecords.length === 0) return [];

  const modIds = rawRecords.map(r => r._idRow).join(',');
  const multiUrl = GB_BASE_URL + "/Mod/Multi?_csvRowIds=" + modIds + "&_csvProperties=_idRow,_nLikeCount,_nViewCount,_nDownloadCount,_sDescription,_sText,_aCredits";
  
  let multiData: any[] = [];
  try {
     multiData = (await http.fetchJson(multiUrl)) as any[];
  } catch (e) {
     console.error("GameBanana Mod/Multi failed:", e);
  }
  const multiMap = new Map(multiData.map(d => [d._idRow, d]));

  let finalMods: GameBananaMod[] = rawRecords.map(mod => {
    const meta = multiMap.get(mod._idRow) || {};
    const finalEngineId = mod.__resolvedEngineId || getEngineId(mod);
    return {
      id: mod._idRow,
      gameId: FNF_GAME_ID,
      title: mod._sName || "Unknown Mod",
      description: meta._sDescription || meta._sText || "",
      author: mod._aSubmitter?._sName || "Unknown Creator",
      userId: extractUserId(mod),
      userPfp: extractUserPfp(mod),
      authors: extractAuthors(meta._aCredits),
      // Tomar likes y views de Mod/Index original si estaban, si no del Multi
      likes: mod._nLikeCount || meta._nLikeCount || 0,
      views: mod._nViewCount || meta._nViewCount || 0,
      downloads: meta._nDownloadCount || 0,
      submittedAt: mod._tsDateAdded,
      timeAgo: getTimeAgo(mod._tsDateAdded),
      engineId: finalEngineId,
      engineIcon: getEngineIcon(finalEngineId),
      thumbnail: extractThumbnail(mod)
    };
  });

  if (filter === 'popular' && !isPopularFallback) {
    const cacheKey = engineId || 'all';
    popularCache.set(cacheKey, { timestamp: Date.now(), mods: finalMods });
    return finalMods.slice((page - 1) * perPage, page * perPage);
  }

  return finalMods;
}
