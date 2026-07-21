export class GameBananaTransportError extends Error {
  constructor(kind, message, details = {}) {
    super(message);
    this.name = "GameBananaTransportError";
    this.kind = kind;
    Object.assign(this, details);
  }
}

export class GameBananaTransport {
  constructor({
    baseUrl,
    fetchImpl = (...args) => fetch(...args),
    config = {},
  }) {
    this.baseUrl = baseUrl;
    this.fetchImpl = fetchImpl;
    this.config = config;
    this.cache = new Map();
    this.inFlight = new Map();
  }

  async getModIndex({ gameId, categoryId, page, perPage, sort, signal }) {
    const params = new URLSearchParams({
      _nPage: String(page),
      _nPerpage: String(perPage),
    });
    params.set("_aFilters[Generic_Game]", String(gameId));
    params.set("_aFilters[Generic_Category]", String(categoryId));
    if (sort) params.set("_sSort", sort);

    const url = `${this.baseUrl}/Mod/Index?${params}`;
    const cached = this.cache.get(url);
    if (cached && Date.now() - cached.at < this.config.transportCacheFreshMs)
      return cached.data;
    if (this.inFlight.has(url)) return this.inFlight.get(url);
    const request = this.request(url, signal)
      .then((data) => {
        this.cache.set(url, { at: Date.now(), data });
        return data;
      })
      .finally(() => this.inFlight.delete(url));
    this.inFlight.set(url, request);
    return request;
  }

  async request(url, signal) {
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal?.addEventListener("abort", abort, { once: true });
    const timeout = setTimeout(
      () => controller.abort(),
      this.config.requestTimeoutMs || 12000,
    );
    try {
      let attempt = 0;
      while (true) {
        let response;
        try {
          response = await this.fetchImpl(url, { signal: controller.signal });
        } catch (cause) {
          if (controller.signal.aborted)
            throw new GameBananaTransportError(
              signal?.aborted ? "aborted" : "timeout",
              "Category request was cancelled",
              { cause },
            );
          if (attempt++ < (this.config.transientRetryCount ?? 1)) continue;
          throw new GameBananaTransportError(
            "network",
            "Category request failed",
            { cause },
          );
        }
        if (!response?.ok) {
          const retryAfter = response.headers?.get?.("Retry-After");
          throw new GameBananaTransportError(
            "http",
            "Category request failed",
            { status: response?.status, retryAfter },
          );
        }
        try {
          return await response.json();
        } catch (cause) {
          throw new GameBananaTransportError(
            "parse",
            "Category response was invalid",
            { cause },
          );
        }
      }
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", abort);
    }
  }
}
