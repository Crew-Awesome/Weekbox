import http from "@http";
import { GB_BASE_URL, FNF_GAME_ID } from "../constants";
import type { GameBananaMod } from "../types";
import {
  getTimeAgo,
  getEngineId,
  getEngineIcon,
  extractAuthors,
  extractThumbnail,
  extractPreviewMedia,
  extractUserId,
  extractUserPfp,
  checkIsNsfw,
} from "../utils";
import Utils from "@utils";

/**
 * Fetches full mod details by ID and maps the response to the standard `GameBananaMod` format.
 */
export async function getModById(modId: number): Promise<GameBananaMod | null> {
  const url = `${GB_BASE_URL}/Mod/${modId}/ProfilePage`;

  try {
    const raw: any = await http.fetchJson(url);
    if (!raw || !raw._idRow) return null;

    /* Validate if the Mod is associated with the official Friday Night Funkin Game ID */
    if (raw._aGame && raw._aGame._idRow !== FNF_GAME_ID) {
      console.warn(
        `Mod ${modId} does not belong to FNF (Game ID: ${raw._aGame._idRow})`,
      );
      return null;
    }

    const engineId = getEngineId(raw);
    const { ENGINE_CATEGORIES } = await import("../constants");

    /* 
     * Strictly verify if the mod belongs to authorized engines. 
     * If not listed, block the query to protect the UX experience. 
     */
    const allowedIds = Object.keys(ENGINE_CATEGORIES).map(
      (id) => ENGINE_CATEGORIES[Number(id)].id,
    );
    if (!allowedIds.includes(engineId)) {
      console.warn(
        `Mod ${modId} belongs to an unsupported category/engine for Weekbox: ${engineId}`,
      );
      throw new Error("UNSUPPORTED_CATEGORY");
    }

    return {
      id: raw._idRow,
      gameId: raw._aGame?._idRow || FNF_GAME_ID,
      title: raw._sName || "Unknown Mod",
      description: Utils.sanitize.htmlToPlainText(
        raw._sDescription || raw._sText || "",
      ),
      htmlBody: Utils.sanitize.sanitizeHtml(
        raw._sText || raw._sDescription || "",
      ),
      author: raw._aSubmitter?._sName || "Unknown Creator",
      userId: extractUserId(raw),
      userPfp: extractUserPfp(raw),
      authors: extractAuthors(raw._aCredits),
      likes: raw._nLikeCount || 0,
      views: raw._nViewCount || 0,
      downloads: raw._nDownloadCount || 0,
      submittedAt: raw._tsDateAdded,
      updatedAt: raw._tsDateUpdated || raw._tsDateAdded,
      timeAgo: getTimeAgo(raw._tsDateAdded),
      engineId,
      engineIcon: getEngineIcon(engineId),
      thumbnail: extractThumbnail(raw),
      previewMedia: extractPreviewMedia(raw),
      isNsfw: checkIsNsfw(raw),
    };
  } catch (error) {
    console.error(`Error fetching mod ${modId} from GameBanana:`, error);
    return null;
  }
}
