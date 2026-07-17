const BASE_URL = "https://funkin.sniro.boo";
const PAGE_SIZE = 15;

function formatBytes(bytes) {
  const value = Number(bytes);
  if (!value) return "Unknown size";
  const units = ["Bytes", "KB", "MB", "GB", "TB"];
  const index = Math.floor(Math.log(value) / Math.log(1024));
  return `${Number((value / 1024 ** index).toFixed(2))} ${units[index]}`;
}

function timeAgo(value) {
  const seconds = Math.max(
    0,
    Math.floor((Date.now() - Date.parse(value)) / 1000),
  );
  const units = [
    [31536000, "y"],
    [2592000, "mo"],
    [86400, "d"],
    [3600, "h"],
    [60, "m"],
  ];
  const match = units.find(([amount]) => seconds >= amount);
  return match ? `${Math.floor(seconds / match[0])}${match[1]}` : `${seconds}s`;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export const sniroApi = {
  listCache: new Map(),
  detailCache: new Map(),

  async request(path) {
    const response = await fetch(`${BASE_URL}${path}`);
    if (!response.ok)
      throw new Error(`Psych Online mod service returned ${response.status}`);
    return response.json();
  },

  toGridMod(mod) {
    return {
      id: `sniro:${mod.id}`,
      sourceId: mod.id,
      source: "sniro",
      title: mod.title || "Untitled mod",
      author: "",
      image: mod.images?.[0] || "assets/icons/psychonline.png",
      likes: Number(mod.favoritedCount) || 0,
      views: Number(mod.downloadHits) || 0,
      downloads: Number(mod.downloadHits) || 0,
      submittedAt: Date.parse(mod.submitted) || 0,
      timeAgo: timeAgo(mod.submitted),
      engineId: "psychonline",
    };
  },

  async listAll(query = "", sort = "submitted:desc") {
    const cacheKey = `${query}\u0000${sort}`;
    if (this.listCache.has(cacheKey)) return this.listCache.get(cacheKey);
    const request = (async () => {
      const mods = [];
      for (let page = 0; ; page += 1) {
        const params = new URLSearchParams({
          q: query,
          page: String(page),
          sort,
        });
        const records = await this.request(`/api/search/mods?${params}`);
        if (!Array.isArray(records) || records.length === 0) break;
        mods.push(...records);
        if (records.length < PAGE_SIZE) break;
      }
      return mods.map((mod) => this.toGridMod(mod));
    })().catch((error) => {
      this.listCache.delete(cacheKey);
      throw error;
    });
    this.listCache.set(cacheKey, request);
    return request;
  },

  async getModDetails(sourceId) {
    if (this.detailCache.has(sourceId)) return this.detailCache.get(sourceId);
    const request = this.request(
      `/api/mod/details/${encodeURIComponent(sourceId)}`,
    )
      .then((data) => {
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
            downloadUrl: `${BASE_URL}/mod/${encodeURIComponent(data.id)}/dl/${encodeURIComponent(slug)}`,
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
          images: data.images?.length
            ? data.images
            : ["assets/icons/psychonline.png"],
          fileSizeStr:
            downloadOptions[0]?.fileSizeStr || "No download available",
          downloadUrl: downloadOptions[0]?.downloadUrl || "",
          downloadType: "sniro",
          downloadOptions,
          requirements: [],
          sourceUrl: `${BASE_URL}/mods`,
          engineId: "psychonline",
          engineLocked: true,
        };
      })
      .catch((error) => {
        this.detailCache.delete(sourceId);
        throw error;
      });
    this.detailCache.set(sourceId, request);
    return request;
  },
};
