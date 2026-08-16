import http from '@http';
import { FNF_GAME_ID } from '../constants';
import { isExcluded, getEngineId } from '../utils';

export async function fetchRipeRecords(targetEngineId: string | null = null, maxPages = 4, maxRecords = 30) {
  let sourcePage = 1;
  const records: any[] = [];
  const modIds = new Set<number>();
  let isComplete = false;

  // Subfeed URL in GameBanana is actually apiv12 for ripe/default sort
  const subfeedUrl = "https://gamebanana.com/apiv12/Game/" + FNF_GAME_ID + "/Subfeed";

  while (!isComplete && records.length < maxRecords && sourcePage <= maxPages) {
    const url = subfeedUrl + "?_sSort=default&_nPage=" + sourcePage;
    try {
      const res: any = await http.fetchJson(url);
      const fetchedRecords = res?._aRecords || [];
      
      if (fetchedRecords.length < 15) isComplete = true; // Ultima pagina
      
      for (const mod of fetchedRecords) {
        if (
          mod?._sModelName !== "Mod" ||
          mod?._bIsTrashed ||
          mod?._bIsDeleted ||
          mod?._sInitialVisibility === "hide" ||
          isExcluded(mod)
        ) {
          continue;
        }

        const engineId = getEngineId(mod);
        if (!engineId || engineId === "unknown") continue;
        if (targetEngineId && engineId !== targetEngineId) continue;
        
        if (modIds.has(mod._idRow)) continue;
        
        modIds.add(mod._idRow);
        records.push({ ...mod, __resolvedEngineId: engineId });
      }
      sourcePage++;
    } catch (error) {
      break;
    }
  }

  return records;
}

