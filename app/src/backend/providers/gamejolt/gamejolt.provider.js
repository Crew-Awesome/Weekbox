import { nativeFetch } from "../../services/network/native-http.js";
import { timeAgo, formatBytes } from "../../utils/peo/formatters.js";

export const GAMEJOLT_API_URL = "https://gamejolt.com/site-api";
export const GAMEJOLT_SECTIONS = [
  ["featured", "Featured"],
  ["new", "New"],
  ["fresh", "Fresh"],
  ["hot", "Hot"],
  ["best", "Best"],
  ["worst", "Worst"],
];

export const GAMEJOLT_FILTERS = {
  os: [["windows", "Windows"], ["mac", "Mac"], ["linux", "Linux"], ["other", "Other"], ["rom", "ROM"]],
};

function absoluteUrl(value) {
  if (!value || typeof value !== "string") return "";
  try { return new URL(value, "https://gamejolt.com").href; } catch { return ""; }
}

function getGameUrl(game) {
  const slug = game.slug || game.path;
  return slug
    ? `https://gamejolt.com/games/${encodeURIComponent(slug)}/${encodeURIComponent(game.id)}`
    : `https://gamejolt.com/games/${encodeURIComponent(game.id)}`;
}

function getThumbnail(game) {
  return absoluteUrl(
    game.thumbnail_media_item?.img_url ||
    game.header_media_item?.img_url ||
    game.img_thumbnail ||
    game.thumbnail_media_item?.mediaserver_url ||
    game.thumbnail_media_item?.img_thumbnail,
  );
}

function toGridMod(game) {
  const author = game.developer?.display_name || game.developer?.name || game.developer?.username || "Unknown Creator";
  const submittedAt = Number(game.published_on || game.posted_on || 0);
  return {
    id: `gamejolt:${game.id}`,
    sourceId: String(game.id),
    source: "gamejolt",
    title: game.title || "Untitled game",
    author,
    image: getThumbnail(game),
    featureImage: absoluteUrl(game.header_media_item?.img_url) || getThumbnail(game),
    imageFallbacks: [
      absoluteUrl(game.header_media_item?.img_url),
      absoluteUrl(game.thumbnail_media_item?.img_url),
      absoluteUrl(game.img_thumbnail),
      absoluteUrl(game.thumbnail_media_item?.img_thumbnail),
    ].filter((url, index, urls) => url && url !== getThumbnail(game) && urls.indexOf(url) === index),
    likes: 0,
    followers: Number(game.follower_count) || 0,
    views: 0,
    downloads: 0,
    submittedAt,
    timeAgo: submittedAt ? timeAgo(new Date(submittedAt).toISOString()) : "",
    engineId: null,
    engineName: "",
    sourceUrl: getGameUrl(game),
    categoryId: "fnf",
    categoryName: "Friday Night Funkin'",
  };
}

function imageUrls(mediaItems) {
  return (Array.isArray(mediaItems) ? mediaItems : [])
    .filter((item) => /image|screenshot/i.test(`${item.media_type || ""} ${item.type || ""}`))
    .map((item) => absoluteUrl(
      item.media_item?.img_url || item.img_url || item.url ||
      item.media_item?.mediaserver_url || item.img_thumbnail ||
      item.thumbnail_media_item?.img_url || item.thumbnail_media_item?.mediaserver_url,
    ))
    .filter((url, index, urls) => url && urls.indexOf(url) === index);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

function renderDescriptionText(node) {
  let text = escapeHtml(node.text || "");
  for (const mark of Array.isArray(node.marks) ? node.marks : []) {
    const tags = { strong: "strong", em: "em", strike: "del", code: "code" };
    if (tags[mark.type]) text = `<${tags[mark.type]}>${text}</${tags[mark.type]}>`;
    if (mark.type === "link") {
      const href = absoluteUrl(mark.attrs?.href);
      if (href) text = `<a href="${escapeHtml(href)}">${text}</a>`;
    }
  }
  return text;
}

function renderDescriptionMedia(node, media) {
  const item = media.get(String(node.attrs?.id));
  const src = absoluteUrl(item?.img_url || item?.mediaserver_url);
  if (!src) return "";
  const width = Number(item.width || node.attrs?.width);
  const height = Number(item.height || node.attrs?.height);
  const dimensions = `${width ? ` width="${width}"` : ""}${height ? ` height="${height}"` : ""}`;
  const image = `<img src="${escapeHtml(src)}" alt="${escapeHtml(node.attrs?.caption || "")}"${dimensions}>`;
  const href = absoluteUrl(node.attrs?.href);
  return href ? `<p><a href="${escapeHtml(href)}">${image}</a></p>` : `<p>${image}</p>`;
}

function renderDescriptionChildren(node, media) {
  return (Array.isArray(node.content) ? node.content : [])
    .map((child) => renderDescriptionNode(child, media)).join("");
}

function renderDescriptionHeading(node, media) {
  const level = Math.max(1, Math.min(6, Number(node.attrs?.level) || 2));
  const content = (Array.isArray(node.content) ? node.content : [])
    .map((child) => child.type === "paragraph"
      ? (Array.isArray(child.content) ? child.content : []).map((item) => renderDescriptionNode(item, media)).join("")
      : renderDescriptionNode(child, media))
    .join("");
  return `<h${level}>${content}</h${level}>`;
}

function renderDescriptionNode(node, media) {
  if (!node || typeof node !== "object") return "";
  if (node.type === "text") return renderDescriptionText(node);
  if (node.type === "mediaItem") return renderDescriptionMedia(node, media);
  if (node.type === "hardBreak") return "<br>";
  if (node.type === "hr" || node.type === "horizontalRule") return "<hr>";
  if (node.type === "heading") return renderDescriptionHeading(node, media);
  const tags = {
    paragraph: "p", bulletList: "ul", orderedList: "ol", listItem: "li",
    blockquote: "blockquote", codeBlock: "pre",
  };
  const tag = tags[node.type];
  const content = renderDescriptionChildren(node, media);
  return tag ? `<${tag}>${content}</${tag}>` : content;
}

function getFullDescription(game) {
  const raw = game.description_content;
  let document;
  try { document = typeof raw === "string" ? JSON.parse(raw) : raw; } catch { document = null; }
  if (!document || !Array.isArray(document.content)) return game.description || "";
  const media = new Map((Array.isArray(document.hydration) ? document.hydration : [])
    .filter((entry) => entry?.source && entry?.data)
    .map((entry) => [String(entry.source), entry.data]));
  return document.content.map((node) => renderDescriptionNode(node, media)).join("");
}

function getFileName(file) {
  return file?.file_name || file?.filename || file?.name || file?.file?.name || "";
}

function getFileSize(file) {
  return Number(file?.file_size || file?.filesize || file?.size || file?.file?.size) || 0;
}

function buildDownloadOptions(builds, releases = []) {
  return (Array.isArray(builds) ? builds : [])
    .filter((build) => build?.type === "downloadable" && build?.id && build?.primary_file)
    .map((build) => {
      const file = build.primary_file;
      const size = getFileSize(file);
      const name = getFileName(file);
      const release = releases.find((item) => String(item.id) === String(build.game_release_id));
      const version = release?.version_number ? `v${release.version_number}` : "";
      return {
        id: `gamejolt:${build.id}`,
        name: [name || "Downloadable build", version].filter(Boolean).join(" · "),
        fileName: name,
        description: version ? `GameJolt build ${version}` : "GameJolt downloadable build",
        type: "external",
        fileSize: size,
        fileSizeStr: size ? formatBytes(size) : "Unknown size",
        downloadUrl: "",
        providerBuildId: String(build.id),
      };
    });
}

function findDownloadUrl(value, depth = 0) {
  if (depth > 4 || value == null) return "";
  if (typeof value === "string") {
    const url = absoluteUrl(value);
    return url && /^https?:\/\//i.test(url) ? url : "";
  }
  if (Array.isArray(value)) {
    for (const entry of value) {
      const result = findDownloadUrl(entry, depth + 1);
      if (result) return result;
    }
    return "";
  }
  if (typeof value !== "object") return "";
  for (const key of ["url", "downloadUrl", "download_url", "redirectUrl", "redirect_url"]) {
    if (typeof value[key] === "string") {
      const result = findDownloadUrl(value[key], depth + 1);
      if (result) return result;
    }
  }
  for (const key of ["payload", "data", "download", "file"]) {
    const result = findDownloadUrl(value[key], depth + 1);
    if (result) return result;
  }
  return "";
}

function createListingParams({ section, page, query, filters = {} }) {
  const params = new URLSearchParams();
  params.set("section", GAMEJOLT_SECTIONS.some(([key]) => key === section) ? section : "featured");
  params.set("tag", "fnf");
  if (page > 1) params.set("page", String(page));
  if (query.trim()) params.set("query", query.trim());
  const requestedOs = [...new Set(Array.isArray(filters.os) ? filters.os : [])]
    .filter((value) => GAMEJOLT_FILTERS.os.some(([option]) => option === value));
  const osFilters = requestedOs.length
    ? requestedOs
    : filters.downloadableOnly
      ? GAMEJOLT_FILTERS.os.map(([value]) => value)
      : [];
  for (const value of osFilters) {
    params.append("f_os[]", value);
  }
  return params;
}

function createGameSearchParams({ page, query }) {
  const params = new URLSearchParams({
    q: query.trim(),
    "post-feed-use-offset": "1",
  });
  if (page > 1) params.set("page", String(page));
  return params;
}

export class GameJoltService {
  constructor({ baseUrl = GAMEJOLT_API_URL, fetchImpl = nativeFetch } = {}) {
    this.baseUrl = baseUrl;
    this.fetchImpl = fetchImpl;
    this.detailsCache = new Map();
  }

  async request(path, options = {}) {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, options);
    if (!response.ok) throw new Error(`GameJolt API returned ${response.status}`);
    return response.json();
  }

  async getGames({ section = "hot", page = 1, query = "", filters = {}, signal } = {}) {
    const normalizedQuery = String(query || "").trim();
    const isSearch = Boolean(normalizedQuery);
    const params = isSearch
      ? createGameSearchParams({ page, query: normalizedQuery })
      : createListingParams({ section, page, query: "", filters });
    const endpoint = isSearch ? "/web/search/games" : "/web/discover/games";
    const response = await this.request(`${endpoint}?${params}`, { signal });
    const payload = response?.payload || {};
    const games = Array.isArray(payload.games) ? payload.games : [];
    const perPage = Math.max(1, Number(payload.perPage) || 36);
    const total = Math.max(0, Number(payload.gamesCount) || 0);
    return {
      mods: games.map(toGridMod),
      total,
      pageSize: perPage,
      exhausted: games.length < perPage || page * perPage >= total,
    };
  }

  async getGameDetails(id) {
    const key = String(id).replace(/^gamejolt:/, "");
    if (!/^\d+$/.test(key)) throw new Error("Invalid GameJolt game ID");
    if (!this.detailsCache.has(key)) {
      const request = Promise.all([
        this.request(`/web/discover/games/${encodeURIComponent(key)}`),
        this.request(`/web/discover/games/overview/${encodeURIComponent(key)}`).catch(() => null),
      ]).then(([detailResponse, overviewResponse]) => {
        const game = detailResponse?.payload?.game;
        if (!game) throw new Error("GameJolt game details were unavailable");
        const overview = overviewResponse?.payload || {};
        const base = toGridMod(game);
        const images = imageUrls(overview.mediaItems);
        const downloadOptions = buildDownloadOptions(overview.builds, overview.releases);
        const firstOption = downloadOptions[0];
        return {
          ...base,
          id: `gamejolt:${key}`,
          description: getFullDescription(game) || overview.metaDescription || "<p>No description available.</p>",
          images: images.length ? [base.image, ...images].filter((url, index, all) => url && all.indexOf(url) === index) : base.image ? [base.image] : ["assets/img/placeholder-mini.jpg"],
          downloadOptions,
          downloadUrl: "",
          fileSize: firstOption?.fileSize || 0,
          fileSizeStr: firstOption?.fileSizeStr || "No download available",
          sourceUrl: getGameUrl(game),
          source: "gamejolt",
          sourceId: key,
          providerBuilds: overview.builds || [],
          packageNames: (overview.packages || []).map((item) => item.title).filter(Boolean),
          songs: Array.isArray(overview.songs) ? overview.songs : [],
          engineLocked: false,
          kind: "mod",
          requirements: [],
          credits: [],
          videos: [],
        };
      }).catch((error) => {
        this.detailsCache.delete(key);
        throw error;
      });
      this.detailsCache.set(key, request);
    }
    return this.detailsCache.get(key);
  }

  async getBuildDownloadUrl(buildId) {
    if (!/^\d+$/.test(String(buildId))) throw new Error("Invalid GameJolt build ID");
    const response = await this.request(
      `/web/discover/games/builds/get-download-url/${encodeURIComponent(buildId)}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" },
    );
    const url = findDownloadUrl(response);
    if (!url) throw new Error("GameJolt did not return a downloadable file URL");
    return url;
  }
}

export const gameJoltApi = new GameJoltService();
