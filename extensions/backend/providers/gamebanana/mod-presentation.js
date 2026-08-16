import {
  formatBytes as formatByteValue,
  formatTimeAgo,
} from "../../utils/formatters.js";

const FALLBACK_IMAGE = "assets/img/placeholder-mini.jpg";

export function getImageUrl(mod) {
  const screenshot = mod?._aPreviewContent?.screenshot;
  if (screenshot?._sBaseUrl) {
    const filename =
      screenshot._sFile530 || screenshot._sFile220 || screenshot._sFile;
    if (filename) return `${screenshot._sBaseUrl}/${filename}`;
  }
  const image = mod?._aPreviewMedia?._aImages?.[0];
  return image ? `${image._sBaseUrl}/${image._sFile}` : FALLBACK_IMAGE;
}

export function getTimeAgo(timestamp) {
  if (!timestamp) return "N/A";
  return formatTimeAgo(Date.now() / 1000 - timestamp, "N/A", false);
}

export function formatBytes(bytes, decimals = 2) {
  return formatByteValue(bytes, decimals, "0 Bytes");
}

export function toGridMod(mod, getEngineId) {
  return {
    id: mod._idRow,
    title: mod._sName,
    author: mod._aSubmitter?._sName || "Unknown",
    gameId: Number(mod._aGame?._idRow || mod._idGame || 0),
    image: getImageUrl(mod),
    likes: mod._nLikeCount || 0,
    views: mod._nViewCount || 0,
    submittedAt: Number(mod._tsDateAdded || 0) * 1000,
    timeAgo: getTimeAgo(mod._tsDateAdded),
    engineId: mod.__resolvedEngineId || getEngineId(mod),
  };
}
