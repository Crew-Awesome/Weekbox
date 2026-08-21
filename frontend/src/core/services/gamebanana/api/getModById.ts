import http from "@http";
import { GB_BASE_URL, FNF_GAME_ID } from "../constants";
import type { GameBananaMod } from "../types";
import {
  getTimeAgo,
  getEngineId,
  getEngineIcon,
  extractAuthors,
  extractThumbnail,
  extractUserId,
  extractUserPfp,
  checkIsNsfw,
} from "../utils";
import Utils from "@utils";

/**
 * Obtiene los detalles completos de un Mod por su ID y mapea la respuesta
 * al formato estandar de `GameBananaMod`.
 */
export async function getModById(modId: number): Promise<GameBananaMod | null> {
  const url = `${GB_BASE_URL}/Mod/${modId}/ProfilePage`;
  
  try {
    const raw: any = await http.fetchJson(url);
    if (!raw || !raw._idRow) return null;

    /** Validar si el Mod est asociado al Game ID oficial de Friday Night Funkin */
    if (raw._aGame && raw._aGame._idRow !== FNF_GAME_ID) {
      console.warn(`El mod ${modId} no pertenece a FNF (Game ID: ${raw._aGame._idRow})`);
      return null;
    }

    const engineId = getEngineId(raw);
    const { ENGINE_CATEGORIES } = await import("../constants");
    
    /** 
     * Verificar estrictamente si el mod pertenece a los Engines autorizados.
     * Si no est listado, bloqueamos la consulta para proteger la experiencia UX.
     */
    const allowedIds = Object.keys(ENGINE_CATEGORIES).map(id => ENGINE_CATEGORIES[Number(id)].id);
    if (!allowedIds.includes(engineId)) {
      console.warn(`El mod ${modId} pertenece a una categora/engine no soportado por Weekbox: ${engineId}`);
      throw new Error("UNSUPPORTED_CATEGORY");
    }

    return {
      id: raw._idRow,
      gameId: raw._aGame?._idRow || FNF_GAME_ID,
      title: raw._sName || "Unknown Mod",
      description: Utils.sanitize.htmlToPlainText(raw._sDescription || raw._sText || ""),
      htmlBody: Utils.sanitize.sanitizeHtml(raw._sText || raw._sDescription || ""),
      author: raw._aSubmitter?._sName || "Unknown Creator",
      userId: extractUserId(raw),
      userPfp: extractUserPfp(raw),
      authors: extractAuthors(raw._aCredits),
      likes: raw._nLikeCount || 0,
      views: raw._nViewCount || 0,
      downloads: raw._nDownloadCount || 0,
      submittedAt: raw._tsDateAdded,
      timeAgo: getTimeAgo(raw._tsDateAdded),
      engineId,
      engineIcon: getEngineIcon(engineId),
      thumbnail: extractThumbnail(raw),
      isNsfw: checkIsNsfw(raw),
    };
  } catch (error) {
    console.error(`Error fetching mod ${modId} from GameBanana:`, error);
    return null;
  }
}
