import http from "@http";
import { GB_BASE_URL, FNF_GAME_ID } from "../constants";
import type { GameBananaTool } from "../types";
import {
  getTimeAgo,
  extractAuthors,
  extractThumbnail,
  extractUserId,
  extractUserPfp,
} from "../utils";
import Utils from "@utils";

export async function getTools(
  page = 1,
  perPage = 15,
): Promise<GameBananaTool[]> {
  const url =
    GB_BASE_URL +
    "/Tool/Index?_nPage=" +
    page +
    "&_nPerpage=" +
    perPage +
    "&_aFilters[Generic_Game]=" +
    FNF_GAME_ID +
    "&_sSort=Generic_Newest";
  let records: any[] = [];
  try {
    const res: any = await http.fetchJson(url);
    records = res?._aRecords || [];
  } catch (error) {
    return [];
  }

  if (records.length === 0) return [];

  const toolIds = records.map((r: any) => r._idRow).join(",");
  const multiUrl =
    GB_BASE_URL +
    "/Tool/Multi?_csvRowIds=" +
    toolIds +
    "&_csvProperties=_idRow,_nDownloadCount,_sDescription,_sText,_aCredits";

  let multiData: any[] = [];
  try {
    multiData = (await http.fetchJson(multiUrl)) as any[];
  } catch (e) {}
  const multiMap = new Map(multiData.map((d) => [d._idRow, d]));

  return records.map((tool) => {
    const meta = multiMap.get(tool._idRow) || {};
    return {
      id: tool._idRow,
      gameId: FNF_GAME_ID,
      title: tool._sName || "Unknown Tool",
      description: Utils.sanitize.htmlToPlainText(
        meta._sDescription || meta._sText || "",
      ),
      htmlBody: Utils.sanitize.sanitizeHtml(
        meta._sText || meta._sDescription || "",
      ),
      author: tool._aSubmitter?._sName || "Unknown Creator",
      userId: extractUserId(tool),
      userPfp: extractUserPfp(tool),
      authors: extractAuthors(meta._aCredits),
      likes: tool._nLikeCount || 0,
      views: tool._nViewCount || 0,
      downloads: meta._nDownloadCount || 0,
      submittedAt: tool._tsDateAdded,
      timeAgo: getTimeAgo(tool._tsDateAdded),
      thumbnail: extractThumbnail(tool),
    };
  });
}
