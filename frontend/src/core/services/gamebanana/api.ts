import http from '@http';
import { GB_BASE_URL, FNF_GAME_ID, ENGINE_CATEGORIES } from './constants';
import type { GameBananaMod, GameBananaTool } from './types';
import { getTimeAgo, getEngineId, isExcluded, extractAuthors, extractThumbnail } from './utils';

export const gameBananaApi = {
  
  async getMods(page = 1, perPage = 15, engineId: string | null = null): Promise<GameBananaMod[]> {
    let categoryIds = Object.keys(ENGINE_CATEGORIES).map(Number);
    
    if (engineId) {
      const match = Object.entries(ENGINE_CATEGORIES).find(([_, name]) => name === engineId);
      if (match) categoryIds = [Number(match[0])];
      else return []; // No coincide con nada
    }

    // 1. Peticion principal a Mod/Index para las categorias
    const requests = categoryIds.map(async (catId) => {
      const url = GB_BASE_URL + "/Mod/Index?_nPage=" + page + "&_nPerpage=" + perPage + "&_aFilters[Generic_Game]=" + FNF_GAME_ID + "&_aFilters[Generic_Category]=" + catId + "&_sSort=new";
      try {
        const res: any = await http.fetchJson(url);
        const records = res?._aRecords || [];
        return records.map((r: any) => ({ ...r, __injectedCategoryId: catId }));
      } catch (error) {
        return [];
      }
    });

    const responses = await Promise.all(requests);
    const allRecords = responses.flat();
    if (allRecords.length === 0) return [];

    // 2. Filtramos exclusions y ordenamos
    const uniqueRecords = Array.from(new Map(allRecords.map(r => [r._idRow, r])).values());
    const validRecords = uniqueRecords
      .filter(r => !isExcluded(r))
      .sort((a, b) => Number(b._tsDateAdded || 0) - Number(a._tsDateAdded || 0))
      .slice(0, perPage);

    if (validRecords.length === 0) return [];

    // 3. Obtener Metadata faltante (views, likes, etc) con Mod/Multi
    const modIds = validRecords.map(r => r._idRow).join(',');
    const multiUrl = GB_BASE_URL + "/Mod/Multi?_csvRowIds=" + modIds + "&_csvProperties=_idRow,_nLikeCount,_nViewCount,_nDownloadCount,_sDescription,_sText,_aCredits";
    
    let multiData: any[] = [];
    try {
       multiData = await http.fetchJson(multiUrl) as any[];
    } catch (e) {
       console.error("GameBanana Mod/Multi failed:", e);
    }

    const multiMap = new Map(multiData.map(d => [d._idRow, d]));

    // 4. Mapear
    return validRecords.map(mod => {
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
        engineId: getEngineId(mod),
        thumbnail: extractThumbnail(mod)
      };
    });
  },

  async getTools(page = 1, perPage = 15): Promise<GameBananaTool[]> {
    // Para tools el proceso es casi identico, pero con el endpoint Tool/Index
    const url = GB_BASE_URL + "/Tool/Index?_nPage=" + page + "&_nPerpage=" + perPage + "&_aFilters[Generic_Game]=" + FNF_GAME_ID + "&_sSort=new";
    let records: any[] = [];
    try {
      const res: any = await http.fetchJson(url);
      records = res?._aRecords || [];
    } catch (error) {
      console.error("GameBanana Tool/Index failed:", error);
      return [];
    }

    if (records.length === 0) return [];

    // En el caso de tools, Tool/Index YA incluye _nLikeCount y _nViewCount,
    // pero NO incluye _sDescription, _sText ni _aCredits. Asi que usamos Tool/Multi!
    const toolIds = records.map((r: any) => r._idRow).join(',');
    const multiUrl = GB_BASE_URL + "/Tool/Multi?_csvRowIds=" + toolIds + "&_csvProperties=_idRow,_nDownloadCount,_sDescription,_sText,_aCredits";
    
    let multiData: any[] = [];
    try {
       multiData = await http.fetchJson(multiUrl) as any[];
    } catch (e) {
       console.error("GameBanana Tool/Multi failed:", e);
    }

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
