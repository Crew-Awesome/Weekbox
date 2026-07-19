import { escapeHtml, formatBytes, timeAgo } from "./formatters.js";

const FALLBACK_IMAGE = "assets/icons/psychonline.png";

export function toGridMod(mod) {
  return {
    id: `sniro:${mod.id}`,
    sourceId: mod.id,
    source: "sniro",
    title: mod.title || "Untitled mod",
    author: "",
    keywords: Array.isArray(mod.keywords) ? mod.keywords : [],
    image: mod.images?.[0] || FALLBACK_IMAGE,
    likes: Number(mod.favoritedCount) || 0,
    views: Number(mod.downloadHits) || 0,
    downloads: Number(mod.downloadHits) || 0,
    submittedAt: Date.parse(mod.submitted) || 0,
    timeAgo: timeAgo(mod.submitted),
    engineId: "psychonline",
  };
}

export function toModDetails(data, baseUrl) {
  const downloads = Array.isArray(data.downloads) ? data.downloads : [];
  const downloadOptions = downloads.flatMap((download) => {
    const slug = String(download.id || "")
      .split(":")
      .slice(1)
      .join(":");
    if (!slug) return [];
    const fileSize = Number(download.size) || 0;
    const trackedOption = {
      id: `sniro:${download.id}:tracked`,
      name: `${slug} (Psych Online)`,
      type: "sniro",
      fileSize,
      fileSizeStr: formatBytes(fileSize),
      downloadUrl: `${baseUrl}/mod/${encodeURIComponent(data.id)}/dl/${encodeURIComponent(slug)}`,
    };
    const rawOptions = (Array.isArray(download.urls) ? download.urls : [])
      .filter(Boolean)
      .map((url, index) => ({
        id: `sniro:${download.id}:raw:${index}`,
        name: `${slug} (Raw source ${index + 1})`,
        type: "external",
        fileSize,
        fileSizeStr: formatBytes(fileSize),
        downloadUrl: url,
      }));
    return [trackedOption, ...rawOptions];
  });
  return {
    id: `sniro:${data.id}`,
    sourceId: data.id,
    source: "sniro",
    title: data.title || "Untitled mod",
    author: "",
    hideAuthor: true,
    description: escapeHtml(
      data.description || "No description available.",
    ).replaceAll("\n", "<br>"),
    likes: Number(data.favoritedCount) || 0,
    views: Number(data.downloadHits || data.downloadsHits) || 0,
    downloads: Number(data.downloadHits || data.downloadsHits) || 0,
    timeAgo: timeAgo(data.submitted),
    images: data.images?.length ? data.images : [FALLBACK_IMAGE],
    fileSizeStr: downloadOptions[0]?.fileSizeStr || "No download available",
    downloadUrl: downloadOptions[0]?.downloadUrl || "",
    downloadType: "sniro",
    downloadOptions,
    requirements: [],
    sourceUrl: `${baseUrl}/mods`,
    engineId: "psychonline",
    engineLocked: true,
  };
}
