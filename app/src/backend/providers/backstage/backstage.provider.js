import { nativeFetch } from "../../services/network/native-http.js";
import { formatBytes, timeAgo } from "../../utils/peo/formatters.js";

export const BACKSTAGE_API_URL = "https://api.funkinbackstage.net";
export const BACKSTAGE_CATEGORIES = [
  ["full-mods", "Full Mods"], ["modpacks", "Modpacks"], ["ports", "Ports"],
  ["scripts", "Scripts"], ["tools", "Tools"], ["wips", "Work in Progress"],
];
export const BACKSTAGE_ENGINES = [
  ["base-game", "Base Game", "vslice"], ["codename-engine", "Codename Engine", "codename"],
  ["psych-engine", "Psych Engine", "psych"], ["kade-engine", "Kade Engine", null],
  ["fps-plus", "FPS Plus", "fpsplus"], ["other", "Other", null],
];

const engineIds = Object.fromEntries(BACKSTAGE_ENGINES.map(([key, , id]) => [key, id]));
const engineLabels = Object.fromEntries(BACKSTAGE_ENGINES.map(([key, label]) => [key, label]));
const categoryLabels = Object.fromEntries(BACKSTAGE_CATEGORIES);
const engineKeys = new Set(BACKSTAGE_ENGINES.map(([key]) => key));
const sortKeys = new Set(["activity", "downloads", "likes", "views", "added", "stars"]);

function mediaUrl(path) {
  if (!path) return "";
  try { return new URL(path, `${BACKSTAGE_API_URL}/`).href; } catch { return ""; }
}

function getModIconUrl(mod) {
  return mediaUrl(mod.icon || `/mods/${encodeURIComponent(mod.id)}/icon`);
}

function toAuthor(mod) {
  if (mod.team) {
    return {
      author: mod.team.name || mod.creator || "Unknown Creator",
      authorId: null,
      authorSource: null,
    };
  }
  const authorId = mod.submitter?.id || null;
  return {
    author: mod.submitter?.username || mod.creator || "Unknown Creator",
    authorId,
    authorSource: authorId ? "backstage" : null,
  };
}

function toGridMod(mod) {
  const thumbnail = mediaUrl(mod.thumbnail);
  const card = mediaUrl(mod.card);
  const author = toAuthor(mod);
  return {
    id: `backstage:${mod.id}`,
    sourceId: mod.id,
    source: "backstage",
    title: mod.title || "Untitled mod",
    ...author,
    image: thumbnail || card,
    imageFallbacks: [card, thumbnail].filter((url, index, urls) => url && url !== (thumbnail || card) && urls.indexOf(url) === index),
    icon: getModIconUrl(mod),
    likes: Number(mod.likes) || 0,
    views: Number(mod.views) || 0,
    downloads: Number(mod.downloads) || 0,
    stars: Number(mod.stars) || 0,
    ratings: Number(mod.ratings) || 0,
    submittedAt: Date.parse(mod.uploaded) || 0,
    timeAgo: mod.uploaded ? timeAgo(mod.uploaded) : "",
    engineId: engineIds[mod.engine] || null,
    engineName: engineLabels[mod.engine] || "",
    categoryId: mod.category || "",
    categoryName: categoryLabels[mod.category] || mod.category || "",
    wip: mod.wip || null,
  };
}

function toDownloadOption(file, modId, index) {
  const downloadUrl = mediaUrl(file.url);
  if (!downloadUrl) return null;
  const fileSize = Number(file.size) || 0;
  const name = file.name || file.version || `Download ${index + 1}`;
  return {
    id: `backstage:${modId}:file:${index}`,
    name: file.version ? `${name} (${file.version})` : name,
    fileName: file.name || "",
    description: file.description || "",
    type: "external",
    fileSize,
    fileSizeStr: fileSize ? formatBytes(fileSize) : "Unknown size",
    downloadUrl,
  };
}

function toCredits(credits) {
  const creditList = Array.isArray(credits) ? credits : [];
  const groups = new Map();
  for (const credit of creditList) {
    const roles = Array.isArray(credit.roles) && credit.roles.length ? credit.roles : ["Contributors"];
    const userId = credit.userId == null ? null : credit.userId;
    const profilePath = userId == null ? "" : `/users/${encodeURIComponent(userId)}`;
    for (const role of roles) {
      if (!groups.has(role)) groups.set(role, []);
      groups.get(role).push({
        id: userId,
        source: userId == null ? null : "backstage",
        name: credit.name || "Contributor",
        role: "",
        avatar: "",
        url: profilePath ? `https://funkinbackstage.net${profilePath}` : "",
      });
    }
  }
  return [...groups].map(([name, authors]) => ({ name, authors }));
}

function toImages(data) {
  return [data.card, ...(Array.isArray(data.screenshots) ? data.screenshots : [])]
    .map(mediaUrl)
    .filter((url, index, all) => url && all.indexOf(url) === index);
}

function toDetails(data) {
  const downloadOptions = (Array.isArray(data.files) ? data.files : [])
    .map((file, index) => toDownloadOption(file, data.id, index))
    .filter(Boolean);
  const images = toImages(data);
  return {
    ...toGridMod(data),
    description: data.description || "<p>No description available.</p>",
    images: images.length ? images : ["assets/img/placeholder-mini.jpg"],
    downloadOptions,
    downloadUrl: downloadOptions[0]?.downloadUrl || "",
    fileSize: downloadOptions[0]?.fileSize || 0,
    fileSizeStr: downloadOptions[0]?.fileSizeStr || "No download available",
    sourceUrl: `https://funkinbackstage.net/mods/${encodeURIComponent(data.id)}`,
    submittedTimeAgo: data.uploaded ? timeAgo(data.uploaded) : "",
    updatedTimeAgo: data.updated ? timeAgo(data.updated) : "",
    modifiedTimeAgo: "",
    // Backstage provides an actual engine classification; engineLocked is
    // reserved for provider mods that must be forced into Psych Online.
    engineLocked: false,
    kind: "mod",
    categoryName: categoryLabels[data.category] || data.category || "",
    credits: toCredits(data.credits),
    updates: Array.isArray(data.updates) ? data.updates : [],
    videos: Array.isArray(data.videos) ? data.videos : [],
    wip: data.wip || null,
    requirements: [],
  };
}

function createModsParams({ query, sort, reverse, engine, category, featured, page, limit }) {
  const params = new URLSearchParams({
    page: String(page), limit: String(limit), sort: sortKeys.has(sort) ? sort : "activity",
  });
  if (query.trim()) params.set("q", query.trim());
  if (reverse) params.set("reverse", "1");
  if (engineKeys.has(engine)) params.set("engine", engine);
  if (categoryLabels[category]) params.set("category", category);
  if (featured) params.set("featured", "1");
  return params;
}

function mapModsResponse(data, page, limit) {
  const records = Array.isArray(data) ? data : data.mods || [];
  const mods = records.map(toGridMod);
  const total = Number(data?.total);
  const pages = Number(data?.pages);
  return { mods, total: Number.isFinite(total) ? total : null, exhausted: pages ? page >= pages : mods.length < limit };
}

function mapUsersResponse(data) {
  const users = Array.isArray(data)
    ? data
    : Array.isArray(data?.value)
      ? data.value
      : Array.isArray(data?.users)
        ? data.users
        : data?.id != null
          ? [data]
          : [];
  return users.map((user) => ({
    id: user.id,
    source: "backstage",
    username: user.username || "Unknown User",
    avatar: Number(user.avatar) > 0
      ? `${BACKSTAGE_API_URL}/users/${encodeURIComponent(user.id)}/avatar?v=${encodeURIComponent(user.avatar)}`
      : "",
    profileUrl: `https://funkinbackstage.net/users/${encodeURIComponent(user.id)}`,
  }));
}

export class BackstageService {
  constructor({ baseUrl = BACKSTAGE_API_URL, fetchImpl = nativeFetch } = {}) {
    this.baseUrl = baseUrl;
    this.fetchImpl = fetchImpl;
    this.detailsCache = new Map();
    this.userContributionsCache = new Map();
  }

  async request(path, signal) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      if (signal?.aborted) {
        const error = new Error("The request was aborted.");
        error.name = "AbortError";
        throw error;
      }
      try {
        const response = await this.fetchImpl(`${this.baseUrl}${path}`, { signal });
        if (!response.ok) {
          const error = new Error(`FunkinBackstage API returned ${response.status}`);
          error.status = response.status;
          throw error;
        }
        return await response.json();
      } catch (error) {
        const retryable =
          error?.name !== "AbortError" &&
          (error?.status == null || error.status === 429 || error.status >= 500);
        if (attempt >= 2 || !retryable) throw error;
        await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
      }
    }
    throw new Error("FunkinBackstage API request failed");
  }

  async getMods({ query = "", sort = "activity", reverse = false, engine = "", category = "", featured = false, page = 1, limit = 24, signal } = {}) {
    const params = createModsParams({ query, sort, reverse, engine, category, featured, page, limit });
    return mapModsResponse(await this.request(`/mods?${params}`, signal), page, limit);
  }

  async getModDetails(id) {
    const key = String(id);
    if (!this.detailsCache.has(key)) {
      const request = this.request(`/mods/${encodeURIComponent(key)}`)
        .then(toDetails)
        .catch((error) => { this.detailsCache.delete(key); throw error; });
      this.detailsCache.set(key, request);
    }
    return this.detailsCache.get(key);
  }

  async searchUsers(query, signal) {
    const params = new URLSearchParams({ search: query });
    return mapUsersResponse(await this.request(`/users?${params}`, signal));
  }

  async getUserProfile(id) {
    const user = await this.request(`/users/${encodeURIComponent(id)}`);
    if (!user || user.id == null) return null;
    return mapUsersResponse(user)[0] || null;
  }

  async getUserContributions(id, signal) {
    const key = String(id);
    if (!this.userContributionsCache.has(key)) {
      const request = this.loadUserContributions(key, signal).catch((error) => {
        this.userContributionsCache.delete(key);
        throw error;
      });
      this.userContributionsCache.set(key, request);
    }
    return this.userContributionsCache.get(key);
  }

  async loadUserContributions(userId, signal) {
    const limit = 100;
    const first = await this.request(`/mods?sort=added&page=1&limit=${limit}`, signal);
    const firstMods = Array.isArray(first) ? first : first.mods || [];
    const pages = Math.max(1, Number(first?.pages) || 1);
    const remaining = await Promise.all(
      Array.from({ length: pages - 1 }, (_, index) => index + 2).map(async (page) => {
        const data = await this.request(`/mods?sort=added&page=${page}&limit=${limit}`, signal);
        return Array.isArray(data) ? data : data.mods || [];
      }),
    );
    return [...firstMods, ...remaining.flat()]
      .filter((mod) =>
        String(mod.submitter?.id ?? "") === userId ||
        (Array.isArray(mod.credits) && mod.credits.some((credit) => String(credit.userId ?? "") === userId)),
      )
      .map(toGridMod);
  }

}

export const backstageApi = new BackstageService();
