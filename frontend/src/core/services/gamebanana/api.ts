import http from '@http';
import { GB_BASE_URL, FNF_GAME_ID, ENGINE_CATEGORIES } from './constants';
import type { GameBananaMod, GameBananaTool } from './types';
import { getTimeAgo, getEngineId, isExcluded, extractAuthors, extractThumbnail } from './utils';
import { fetchDiscoveryRecords, fetchRipeRecords, rankCandidates, applyDiversity } from './algorithms';

export type ModFilter = 'popular' | 'new' | 'ripe';

const popularCache = new Map<string, { timestamp: number, mods: GameBananaMod[] }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

export const gameBananaApi = {
  
  async getMods(filter: ModFilter = 'popular', page = 1, perPage = 15, engineId: string | null = null): Promise<GameBananaMod[]> {
    let rawRecords: any[] = [];
    
    // 1. Manejo de Cache Exclusivo para 'popular' para evitar spamear a GameBanana y hacer infinite scroll rapidisimo
    if (filter === 'popular') {
      const cacheKey = engineId || 'all';
      const cached = popularCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
         return cached.mods.slice((page - 1) * perPage, page * perPage);
      }
    }

    // 2. Fetcher
    if (filter === 'ripe') {
      rawRecords = await fetchRipeRecords(engineId, page * 2, page * perPage);
    } else if (filter === 'new') {
      let categoryIds = Object.keys(ENGINE_CATEGORIES).map(Number);
      if (engineId) {
        const match = Object.entries(ENGINE_CATEGORIES).find(([_, name]) => name === engineId);
        if (match) categoryIds = [Number(match[0])];
      }
      const requests = categoryIds.map(async (catId) => {
        const url = GB_BASE_URL + "/Mod/Index?_nPage=" + page + "&_nPerpage=" + perPage + "&_aFilters[Generic_Game]=" + FNF_GAME_ID + "&_aFilters[Generic_Category]=" + catId + "&_sSort=Generic_Newest";
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
        .sort((a, b) => Number(b._tsDateAdded || 0) - Number(a._tsDateAdded || 0));
        
    } else if (filter === 'popular') {
      rawRecords = await fetchDiscoveryRecords(engineId, 2);
    }

    if (rawRecords.length === 0) return [];

    if (filter === 'popular') {
      rawRecords = rawRecords.slice(0, 60);
    } else {
      rawRecords = rawRecords.slice((page - 1) * perPage, page * perPage);
    }

    if (rawRecords.length === 0) return [];

    // 3. Mod/Multi para metadatos
    const modIds = rawRecords.map(r => r._idRow).join(',');
    const multiUrl = GB_BASE_URL + "/Mod/Multi?_csvRowIds=" + modIds + "&_csvProperties=_idRow,_nLikeCount,_nViewCount,_nDownloadCount,_sDescription,_sText,_aCredits";
    
    let multiData: any[] = [];
    try {
       multiData = (await http.fetchJson(multiUrl)) as any[];
    } catch (e) {
       console.error("GameBanana Mod/Multi failed:", e);
    }
    const multiMap = new Map(multiData.map(d => [d._idRow, d]));

    // 4. Mapeo
    let finalMods: GameBananaMod[] = rawRecords.map(mod => {
      const meta = multiMap.get(mod._idRow) || {};
      return {
        id: mod._idRow,
        gameId: FNF_GAME_ID,
        title: mod._sName || "Unknown Mod",
        description: meta._sDescription || meta._sText || "",
        author: mod._aSubmitter?._sName || "Unknown Creator",
        authors: extractAuthors(meta._aCredits),
        likes: meta._nLikeCount || 0,
        views: meta._nViewCount || 0,
        downloads: meta._nDownloadCount || 0,
        submittedAt: mod._tsDateAdded,
        timeAgo: getTimeAgo(mod._tsDateAdded),
        engineId: mod.__resolvedEngineId || getEngineId(mod),
        thumbnail: extractThumbnail(mod)
      };
    });

    if (filter === 'popular') {
      const ranked = rankCandidates(finalMods);
      finalMods = applyDiversity(ranked);
      // Guardar en cache el lote completo (hasta 60 mods rankeados) para consumo de paginacion rapido
      const cacheKey = engineId || 'all';
      popularCache.set(cacheKey, { timestamp: Date.now(), mods: finalMods });
      
      // Devolver solo la pagina pedida
      return finalMods.slice((page - 1) * perPage, page * perPage);
    }

    return finalMods;
  },

  async getTools(page = 1, perPage = 15): Promise<GameBananaTool[]> {
    // ... [Misma logica de tools para que no se pierda]
    const url = GB_BASE_URL + "/Tool/Index?_nPage=" + page + "&_nPerpage=" + perPage + "&_aFilters[Generic_Game]=" + FNF_GAME_ID + "&_sSort=Generic_Newest";
    let records: any[] = [];
    try {
      const res: any = await http.fetchJson(url);
      records = res?._aRecords || [];
    } catch (error) { return []; }

    if (records.length === 0) return [];

    const toolIds = records.map((r: any) => r._idRow).join(',');
    const multiUrl = GB_BASE_URL + "/Tool/Multi?_csvRowIds=" + toolIds + "&_csvProperties=_idRow,_nDownloadCount,_sDescription,_sText,_aCredits";
    
    let multiData: any[] = [];
    try { multiData = (await http.fetchJson(multiUrl)) as any[]; } catch (e) {}
    const multiMap = new Map(multiData.map(d => [d._idRow, d]));

    return records.map(tool => {
      const meta = multiMap.get(tool._idRow) || {};
      return {
        id: tool._idRow,
        gameId: FNF_GAME_ID,
        title: tool._sName || "Unknown Tool",
        description: meta._sDescription || meta._sText || "",
        author: tool._aSubmitter?._sName || "Unknown Creator",
        authors: extractAuthors(meta._aCredits),
        likes: tool._nLikeCount || 0,
        views: tool._nViewCount || 0,
        downloads: meta._nDownloadCount || 0,
        submittedAt: tool._tsDateAdded,
        timeAgo: getTimeAgo(tool._tsDateAdded),
        thumbnail: extractThumbnail(tool)
      };
    });
  }
};
