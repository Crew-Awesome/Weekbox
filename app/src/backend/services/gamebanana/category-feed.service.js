import { DISCOVERY_CONFIG } from "../../config/discovery.config.js";
import { CandidateCollector } from "../../utils/gamebanana/candidate-collector.js";
import {
  createDiscoveryResult,
  normalizeDiscoveryCandidate,
} from "../../utils/gamebanana/discovery-shapes.js";
import {
  applyDiversity,
  rankCandidates,
} from "../../utils/gamebanana/discovery-ranker.js";
import { DiscoverySnapshotStore } from "../../utils/gamebanana/discovery-snapshot-store.js";

export class CategoryFeedService {
  constructor({
    transport,
    gameId,
    categoryRoots,
    getRecords,
    toGridMod,
    isExcluded,
    getEngineId,
    config,
  }) {
    this.transport = transport;
    this.gameId = gameId;
    this.categoryRoots = categoryRoots;
    this.getRecords = getRecords;
    this.toGridMod = toGridMod;
    this.isExcluded = isExcluded || (() => false);
    this.config = config || DISCOVERY_CONFIG;
    this.getEngineId = getEngineId || (() => null);
    this.snapshots = new DiscoverySnapshotStore({ config: this.config });
    this.collector = new CandidateCollector({
      transport,
      gameId,
      categoryRoots,
      getRecords,
      isExcluded: this.isExcluded,
      normalizeCandidate: (raw, context) =>
        normalizeDiscoveryCandidate(raw, {
          ...context,
          engineId: this.getEngineId(raw, context.categoryId),
        }),
      config: this.config,
    });
  }

  getCategories(categoryId) {
    return this.categoryRoots.includes(categoryId)
      ? [categoryId]
      : this.categoryRoots;
  }

  getSortValue(mod, sort) {
    if (sort === "Generic_LatestUpdated") {
      return Number(
        mod._tsDateUpdated || mod._tsDateModified || mod._tsDateAdded || 0,
      );
    }
    if (sort === "Generic_MostLiked") return Number(mod._nLikeCount || 0);
    return Number(mod._tsDateAdded || 0);
  }

  async getCategoryRecords({ page = 1, perPage = 20, sort, categoryId } = {}) {
    const responses = await Promise.allSettled(
      this.getCategories(categoryId).map(async (id) => {
        const data = await this.transport.getModIndex({
          gameId: this.gameId,
          categoryId: id,
          page,
          perPage,
          sort,
        });
        return this.getRecords(data).map((record) => ({
          ...record,
          __injectedCategoryId: id,
        }));
      }),
    );
    const records = responses
      .filter((result) => result.status === "fulfilled")
      .flatMap((result) => result.value);
    if (
      !records.length &&
      responses.every((result) => result.status === "rejected")
    ) {
      throw new Error("GameBanana category requests failed");
    }
    return [...new Map(records.map((mod) => [mod._idRow, mod])).values()]
      .filter((mod) => !this.isExcluded(mod))
      .sort(
        (left, right) =>
          this.getSortValue(right, sort) - this.getSortValue(left, sort),
      );
  }

  async getDiscovery(page, categoryId, { snapshotId, signal } = {}) {
    const queryKey = `popular:${categoryId || "all"}`;
    const now = Date.now();
    let snapshot = snapshotId && this.snapshots.byId(snapshotId);
    const staleCandidate = !snapshot && this.snapshots.getStale(queryKey, now);
    if (!snapshot || snapshot.queryKey !== queryKey)
      snapshot =
        this.snapshots.get(queryKey, now) ||
        this.snapshots.create(queryKey, now);
    const pageStart = (page - 1) * this.config.pageSize;
    while (pageStart >= snapshot.orderedIds.length && !snapshot.exhausted) {
      const collection = await this.collector.collect(snapshot, {
        categoryId,
        signal,
      });
      if (
        !snapshot.candidatesById.size &&
        collection.errors.length &&
        staleCandidate
      ) {
        const ids = staleCandidate.orderedIds.slice(
          (page - 1) * this.config.pageSize,
          page * this.config.pageSize,
        );
        return createDiscoveryResult({
          mods: ids.map((id) =>
            this.toGridMod(staleCandidate.candidatesById.get(id).raw),
          ),
          page,
          pageSize: this.config.pageSize,
          snapshotId: staleCandidate.id,
          stale: true,
          exhausted:
            page * this.config.pageSize >= staleCandidate.orderedIds.length,
          sourceErrors: collection.errors,
          diagnostics: { candidateCount: staleCandidate.candidatesById.size },
        });
      }
      const candidates = [...snapshot.candidatesById.values()];
      const ranked = applyDiversity(
        rankCandidates(candidates, {
          snapshotCreatedAt: snapshot.createdAt / 1000,
          config: this.config,
        }),
        { config: this.config },
      );
      const known = new Set(snapshot.orderedIds);
      snapshot.orderedIds.push(
        ...ranked.map((item) => item.id).filter((id) => !known.has(id)),
      );
      snapshot.generatedPageCount = Math.max(snapshot.generatedPageCount, page);
      snapshot.partial = snapshot.partial || collection.partial;
      if (!collection.requested || collection.errors.length) break;
    }
    const ids = snapshot.orderedIds.slice(
      pageStart,
      page * this.config.pageSize,
    );
    return createDiscoveryResult({
      mods: ids.map((id) =>
        this.toGridMod(snapshot.candidatesById.get(id).raw),
      ),
      page,
      pageSize: this.config.pageSize,
      snapshotId: snapshot.id,
      exhausted:
        snapshot.exhausted &&
        page * this.config.pageSize >= snapshot.orderedIds.length,
      partial: Boolean(snapshot.partial),
      sourceErrors: snapshot.errors,
      diagnostics: { candidateCount: snapshot.candidatesById.size },
    });
  }

  async getGridMods(
    filter = "popular",
    page = 1,
    categoryId = null,
    options = {},
  ) {
    if (filter === "popular")
      return this.getDiscovery(page, categoryId, options);
    try {
      const pageSize = Math.max(
        1,
        Number(options.pageSize) || this.config.pageSize,
      );
      const sort =
        {
          new: "Generic_Newest",
          updated: "Generic_LatestUpdated",
        }[filter] || "Generic_Newest";
      return (await this.getCategoryRecords({
        page,
        perPage: pageSize,
        sort,
        categoryId,
      }))
        .slice(0, pageSize)
        .map(this.toGridMod);
    } catch (error) {
      return [];
    }
  }
}
