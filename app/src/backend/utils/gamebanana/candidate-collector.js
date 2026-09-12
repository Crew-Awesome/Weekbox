export class CandidateCollector {
  constructor({
    transport,
    gameId,
    categoryRoots,
    categoryGroups = {},
    getRecords,
    isExcluded,
    normalizeCandidate,
    config,
  }) {
    Object.assign(this, {
      transport,
      gameId,
      categoryRoots,
      categoryGroups,
      getRecords,
      isExcluded: isExcluded || (() => false),
      normalizeCandidate,
      config,
    });
  }

  async collect(snapshot, { categoryId, signal }) {
    const isGroupedCategory = Boolean(this.categoryGroups[categoryId]);
    const categories =
      this.categoryGroups[categoryId] ||
      (this.categoryRoots.includes(categoryId)
        ? [categoryId]
        : this.categoryRoots);
    const sources = [
      {
        name: "newest",
        sort: "Generic_Newest",
      },
      {
        name: "mostLiked",
        sort: "Generic_MostLiked",
      },
    ];
    const maxConcurrentRequests = isGroupedCategory
      ? Math.max(this.config.maxConcurrentRequests, categories.length)
      : this.config.maxConcurrentRequests;
    const maxRequestsPerSnapshot = this.config.maxRequestsPerSnapshot;
    const tasks = [];
    for (const source of sources) {
      for (const id of categories) {
        const key = `${id}:${source.name}`;
        if (snapshot.sourceExhausted[key]) continue;
        const page = Number(snapshot.sourceCursors[key] || 0) + 1;
        tasks.push({ id, page, source, key });
      }
    }
    const errors = [];
    const seen = new Set(snapshot.candidatesById.keys());
    const blockedKeys = new Set();
    let pending = [...tasks];
    let requests = 0;
    let added = 0;

    while (pending.length && requests < maxRequestsPerSnapshot) {
      const group = [];
      while (
        pending.length &&
        group.length < maxConcurrentRequests &&
        requests + group.length < maxRequestsPerSnapshot
      ) {
        const task = pending[0];
        if (blockedKeys.has(task.key)) {
          pending.shift();
          continue;
        }
        if (group.some((item) => item.key === task.key)) break;
        pending.shift();
        group.push(task);
      }
      if (!group.length) break;
      const outcomes = await Promise.allSettled(
        group.map(({ id, page, source }) =>
          this.fetchSource(id, page, source.sort, signal),
        ),
      );
      requests += outcomes.length;
      outcomes.forEach((outcome, outcomeIndex) => {
        const request = group[outcomeIndex];
        if (outcome.status === "rejected") {
          if (outcome.reason?.kind === "aborted") throw outcome.reason;
          blockedKeys.add(request.key);
          errors.push({
            categoryId: request.id,
            kind: outcome.reason?.kind || "network",
          });
          return;
        }
        snapshot.sourceCursors[request.key] = request.page;
        if (outcome.value.length < this.config.sourcePerPage) {
          snapshot.sourceExhausted[request.key] = true;
        }
        for (const raw of outcome.value) {
          if (this.isExcluded(raw, request.id)) continue;
          if (seen.has(raw._idRow)) continue;
          seen.add(raw._idRow);
          const candidate = this.normalizeCandidate(raw, {
            categoryId: request.id,
          });
          if (candidate.id) {
            snapshot.candidatesById.set(candidate.id, candidate);
            added += 1;
          }
        }
      });
    }

    snapshot.errors.push(...errors);
    snapshot.exhausted = sources.every((source) =>
      categories.every((id) => {
        const key = `${id}:${source.name}`;
        return snapshot.sourceExhausted[key];
      }),
    );
    return {
      errors,
      added,
      requested: requests,
      partial: errors.length > 0,
    };
  }

  async fetchSource(categoryId, page, sort, signal) {
    const data = await this.transport.getModIndex({
      gameId: this.gameId,
      categoryId,
      page,
      perPage: this.config.sourcePerPage,
      sort,
      signal,
    });
    const records = this.getRecords(data);
    if (!Array.isArray(records)) {
      const error = new Error("Category response schema was invalid");
      error.kind = "schema";
      throw error;
    }
    return records;
  }
}
