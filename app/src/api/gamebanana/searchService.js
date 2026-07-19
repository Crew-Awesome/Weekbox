import {
  getSearchTitleRelevance,
  getSearchTypoRelevance,
  getTypoSearchVariants,
} from "./searchRanking.js";

const SEARCH_API_URL = "https://gamebanana.com/apiv13/Util/Search";
const SNIRO_SORT = "submitted:desc";

function normalizeQuery(query) {
  return String(query || "")
    .trim()
    .replace(/\s+/g, " ");
}

function getQueryVariants(query) {
  const variants = new Set([query]);
  const withoutVsPrefix = query.replace(/^(?:vs\.?|versus)\s+/i, "");
  if (withoutVsPrefix !== query) variants.add(withoutVsPrefix);

  const withLetterNumberSpacing = query
    .replace(/([a-z])(\d)/gi, "$1 $2")
    .replace(/(\d)([a-z])/gi, "$1 $2");
  if (withLetterNumberSpacing !== query) variants.add(withLetterNumberSpacing);
  return [...variants];
}

function getSniroFallbackTerm(query) {
  return query
    .split(/\s+/)
    .find(
      (word) =>
        word.length > 2 &&
        !["fnf", "mod", "vs", "the"].includes(word.toLocaleLowerCase()),
    );
}

export class GameBananaSearchService {
  constructor({ api, sniroApi }) {
    this.api = api;
    this.sniroApi = sniroApi;
  }

  async getSuggestions(query, limit = 8) {
    const normalizedQuery = normalizeQuery(query);
    if (!normalizedQuery) return [];
    try {
      const params = new URLSearchParams({
        _idGameRow: String(this.api.gameId),
        _sSearchString: normalizedQuery,
      });
      const response = await fetch(`${SEARCH_API_URL}/Suggestions?${params}`);
      if (!response.ok) throw new Error("Search suggestions failed");
      const suggestions = await response.json();
      if (!Array.isArray(suggestions)) return [];
      return [
        ...new Set(
          suggestions
            .filter((suggestion) => typeof suggestion === "string")
            .map((suggestion) => suggestion.trim())
            .filter(Boolean),
        ),
      ].slice(0, limit);
    } catch {
      return [];
    }
  }

  async search(query, page = 1, perPage = 12) {
    const normalizedQuery = normalizeQuery(query);
    if (!normalizedQuery) return [];

    const cacheKey = `${normalizedQuery.toLocaleLowerCase()}:${page}:${perPage}`;
    if (this.api.searchCache.has(cacheKey))
      return this.api.searchCache.get(cacheKey);

    try {
      const directMod = await this.getDirectMod(normalizedQuery, page);
      if (directMod) return this.cache(cacheKey, [directMod]);

      const sniroResults =
        page === 1
          ? this.sniroApi.listAll(normalizedQuery, SNIRO_SORT).catch(() => [])
          : Promise.resolve([]);
      let records = await this.findRecords(normalizedQuery, page, perPage);
      if (!records.length && page === 1) {
        records = await this.findTypoRecords(normalizedQuery, page, perPage);
      }

      const primaryRecords = records.slice(0, perPage);
      await this.resolveEngines(primaryRecords);
      let mods = primaryRecords.map((mod) => this.api.toGridMod(mod));
      if (page === 1)
        mods = await this.insertSniroMods(
          mods,
          sniroResults,
          normalizedQuery,
          primaryRecords.length,
          perPage,
        );
      return this.cache(cacheKey, mods);
    } catch {
      return [];
    }
  }

  cache(key, mods) {
    this.api.searchCache.set(key, mods);
    if (this.api.searchCache.size > 40) {
      this.api.searchCache.delete(this.api.searchCache.keys().next().value);
    }
    return mods;
  }

  async getDirectMod(query, page) {
    const idMatch = query.match(
      /^(?:https?:\/\/)?(?:gamebanana\.com\/mods\/)?(\d+)(?:\/.*)?$/i,
    );
    if (page !== 1 || !idMatch?.[1]) return null;
    const mod = await this.api.getModDetails(idMatch[1]);
    if (
      mod?.gameId !== this.api.gameId ||
      mod.isDeleted ||
      this.api.isExcludedCategory(mod.categoryId)
    )
      return null;
    return {
      id: mod.id,
      title: mod.title,
      author: mod.author,
      gameId: mod.gameId,
      image: mod.images[0],
      likes: mod.likes,
      views: mod.views,
      timeAgo: mod.timeAgo,
      engineId: mod.engineId,
    };
  }

  async findRecords(query, page, perPage) {
    const variants = getQueryVariants(query);
    const [bestMatch, popularity] = await Promise.all([
      Promise.all(
        variants.map((variant) =>
          this.fetchRecords("best_match", variant, page, perPage),
        ),
      ).then((sets) => sets.flat()),
      page === 1
        ? Promise.all(
            variants.map((variant) =>
              this.fetchRecords("popularity", variant, page, perPage).catch(
                () => [],
              ),
            ),
          ).then((sets) => sets.flat())
        : [],
    ]);
    return this.getUsableRecords(
      [...bestMatch, ...popularity],
      query,
      getSearchTitleRelevance,
    );
  }

  async findTypoRecords(query, page, perPage) {
    const variants = getTypoSearchVariants(query);
    if (!variants.length) return [];
    const recordSets = await Promise.all(
      variants.flatMap((variant) => [
        this.fetchRecords("best_match", variant, page, perPage).catch(() => []),
        this.fetchRecords("popularity", variant, page, perPage).catch(() => []),
      ]),
    );
    return this.getUsableRecords(
      recordSets.flat(),
      query,
      getSearchTypoRelevance,
    );
  }

  async fetchRecords(order, query, page, perPage) {
    const params = new URLSearchParams({
      _sModelName: "Mod",
      _sOrder: order,
      _idGameRow: String(this.api.gameId),
      _sSearchString: query,
      _nPage: String(page),
      _nPerpage: String(perPage),
    });
    const response = await fetch(`${SEARCH_API_URL}/Results?${params}`);
    if (!response.ok) throw new Error("Mod search failed");
    return this.api.getValidRecords(await response.json());
  }

  getUsableRecords(source, query, relevance) {
    return [...new Map(source.map((mod) => [mod._idRow, mod])).values()]
      .filter(
        (mod) =>
          mod._sModelName === "Mod" &&
          Number(mod._aGame?._idRow || mod._idGame) === this.api.gameId &&
          !this.api.isDeletedMod(mod) &&
          !this.api.isExcludedCategory(
            mod._aCategory,
            mod._aRootCategory,
            mod._aSubCategory,
          ) &&
          relevance(mod, query) > 0,
      )
      .sort(
        (left, right) =>
          relevance(right, query) - relevance(left, query) ||
          Number(right._nViewCount || 0) - Number(left._nViewCount || 0),
      );
  }

  async resolveEngines(records) {
    for (let index = 0; index < records.length; index += 2) {
      await Promise.all(
        records.slice(index, index + 2).map(async (mod) => {
          mod.__resolvedEngineId = await this.api.resolveEngineIdForMod(mod);
        }),
      );
    }
  }

  async insertSniroMods(mods, sniroResults, query, primaryCount, perPage) {
    let candidates = await sniroResults;
    let matching = candidates.filter(
      (mod) => getSearchTitleRelevance(mod, query) > 0,
    );
    if (!matching.length) {
      const fallbackTerm = getSniroFallbackTerm(query);
      if (fallbackTerm) {
        candidates = await this.sniroApi
          .listAll(fallbackTerm, SNIRO_SORT)
          .catch(() => []);
        matching = candidates.filter(
          (mod) => getSearchTitleRelevance(mod, query) > 0,
        );
      }
    }
    const insertAt = Math.min(2, primaryCount);
    return [
      ...mods.slice(0, insertAt),
      ...matching,
      ...mods.slice(insertAt),
    ].slice(0, perPage);
  }
}
