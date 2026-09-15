import http from "@http";
import { GB_BASE_URL, FNF_GAME_ID } from "../constants";
import type { GameBananaMod } from "../types";
import {
  getTimeAgo,
  getEngineId,
  getEngineIcon,
  extractAuthors,
  extractCreditGroups,
  extractThumbnail,
  extractPreviewMedia,
  extractUserId,
  extractUserPfp,
  checkIsNsfw,
} from "../utils";
import { sanitizeHtml, htmlToPlainText } from "../../../../utils/sanitize";

const modProfileCache = new Map<number, { data: GameBananaMod; timestamp: number }>();
const CACHE_TTL_MS = 60 * 1000; /* 1 minute cache TTL */

/*
 * Fetches full mod details by ID and maps the response to the standard `GameBananaMod` format.
 */
export async function getModById(modId: number, forceFresh: boolean = false): Promise<GameBananaMod | null> {
  const cached = modProfileCache.get(modId);
  if (!forceFresh && cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const url = `${GB_BASE_URL}/Mod/${modId}/ProfilePage`;

  try {
    const raw: any = await http.fetchJson(url);
    if (!raw || !raw._idRow) return null;

    if (raw._aGame && raw._aGame._idRow !== FNF_GAME_ID) {
      console.warn(
        `Mod ${modId} does not belong to FNF (Game ID: ${raw._aGame._idRow})`,
      );
      return null;
    }

    const engineId = getEngineId(raw);

    const result = {
      id: raw._idRow,
      gameId: raw._aGame?._idRow || FNF_GAME_ID,
      title: raw._sName || "Unknown Mod",
      description: htmlToPlainText(
        raw._sDescription || raw._sText || "",
      ),
      htmlBody: sanitizeHtml(
        raw._sText || raw._sDescription || "",
      ),
      author: raw._aSubmitter?._sName || "Unknown Creator",
      userId: extractUserId(raw),
      userPfp: extractUserPfp(raw),
      authors: extractAuthors(raw._aCredits),
      credits: extractCreditGroups(raw._aCredits),
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
      files: raw._aFiles || [],
      version: raw._sVersion || undefined,
      updatesCount: raw._nUpdateCount || (Array.isArray(raw._aUpdates) ? raw._aUpdates.length : 0),
      updates: raw._aUpdates || [],
      externalLinks: raw._aExternalLinks || raw._aAlternateFileSources || [],
      studio: raw._aStudio?._sName || undefined,
      categoryName: raw._aCategory?._sName || undefined,
    };
    modProfileCache.set(modId, { data: result, timestamp: Date.now() });
    return result;
  } catch (error) {
    console.error(`Error fetching mod ${modId} from GameBanana:`, error);
    return null;
  }
}
