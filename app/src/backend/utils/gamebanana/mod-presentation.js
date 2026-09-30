import {
  formatBytes as formatByteValue,
  formatTimeAgo,
} from "../formatters.js";

const FALLBACK_IMAGE = "assets/img/placeholder-mini.jpg";

function getPreviewImageUrl(image) {
  if (!image?._sBaseUrl) return null;
  const filename = image._sFile530 || image._sFile220 || image._sFile;
  return filename ? `${image._sBaseUrl}/${filename}` : null;
}

export function getImageUrls(mod) {
  const screenshots = Array.isArray(mod?._aPreviewContent?.screenshots)
    ? mod._aPreviewContent.screenshots
    : mod?._aPreviewContent?.screenshot
      ? [mod._aPreviewContent.screenshot]
      : [];
  const legacyImages = Array.isArray(mod?._aPreviewMedia?._aImages)
    ? mod._aPreviewMedia._aImages
    : [];
  return [...screenshots, ...legacyImages]
    .map(getPreviewImageUrl)
    .filter(Boolean);
}

export function getImageUrl(mod) {
  return getImageUrls(mod)[0] || FALLBACK_IMAGE;
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
