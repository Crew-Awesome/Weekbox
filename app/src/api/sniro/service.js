import { toGridMod, toModDetails } from "./modMapper.js";

const PAGE_SIZE = 15;

export class SniroModService {
  constructor({
    baseUrl = "https://funkin.sniro.boo",
    fetchImpl = (...args) => fetch(...args),
  } = {}) {
    this.baseUrl = baseUrl;
    this.fetchImpl = fetchImpl;
    this.listCache = new Map();
    this.detailCache = new Map();
  }

  async request(path) {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`);
    if (!response.ok)
      throw new Error(`Psych Online mod service returned ${response.status}`);
    return response.json();
  }

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
        if (!Array.isArray(records) || !records.length) break;
        mods.push(...records);
        if (records.length < PAGE_SIZE) break;
      }
      return mods.map(toGridMod);
    })().catch((error) => {
      this.listCache.delete(cacheKey);
      throw error;
    });
    this.listCache.set(cacheKey, request);
    return request;
  }

  async getModDetails(sourceId) {
    if (this.detailCache.has(sourceId)) return this.detailCache.get(sourceId);
    const request = this.request(
      `/api/mod/details/${encodeURIComponent(sourceId)}`,
    )
      .then((data) => toModDetails(data, this.baseUrl))
      .catch((error) => {
        this.detailCache.delete(sourceId);
        throw error;
      });
    this.detailCache.set(sourceId, request);
    return request;
  }
}
