export class CandidateCollector {
  constructor({
    transport,
    gameId,
    categoryRoots,
    getRecords,
    isExcluded,
    normalizeCandidate,
    config,
  }) {
    Object.assign(this, {
      transport,
      gameId,
      categoryRoots,
      getRecords,
      isExcluded: isExcluded || (() => false),
      normalizeCandidate,
      config,
    });
  }

  async collect(snapshot, { categoryId, signal }) {
    const categories = this.categoryRoots.includes(categoryId)
      ? [categoryId]
      : this.categoryRoots;
    const sources = [
      {
        name: "newest",
        sort: "Generic_Newest",
        pages: this.config.newestMaxPagesPerCategory,
      },
      {
        name: "mostLiked",
        sort: "Generic_MostLiked",
        pages: this.config.mostLikedMaxPagesPerCategory,
      },
    ];
    const errors = [];
    const seen = new Set();
    let requests = 0;

    for (let page = 1; requests < this.config.maxRequestsPerSnapshot; page++) {
      let requestedThisRound = false;
      for (const source of sources) {
        if (
          page > source.pages ||
          requests >= this.config.maxRequestsPerSnapshot
        )
          continue;
        requestedThisRound = true;
        const batch = categories
          .slice(0, this.config.maxRequestsPerSnapshot - requests)
          .map((id) => ({ id, page, source }));
        for (
          let index = 0;
          index < batch.length;
          index += this.config.maxConcurrentRequests
        ) {
          const group = batch.slice(
            index,
            index + this.config.maxConcurrentRequests,
          );
          const outcomes = await Promise.allSettled(
            group.map(({ id, page: sourcePage, source: itemSource }) =>
              this.fetchSource(id, sourcePage, itemSource.sort, signal),
            ),
          );
          requests += outcomes.length;
          outcomes.forEach((outcome, outcomeIndex) => {
            const request = group[outcomeIndex];
            snapshot.sourceCursors[`${request.id}:${request.source.name}`] =
              request.page;
            if (outcome.status === "rejected") {
              if (outcome.reason?.kind === "aborted") throw outcome.reason;
              errors.push({
                categoryId: request.id,
                kind: outcome.reason?.kind || "network",
              });
              return;
            }
            for (const raw of outcome.value) {
              if (this.isExcluded(raw)) continue;
              if (seen.has(raw._idRow)) continue;
              seen.add(raw._idRow);
              const candidate = this.normalizeCandidate(raw, {
                categoryId: request.id,
              });
              if (candidate.id)
                snapshot.candidatesById.set(candidate.id, candidate);
            }
          });
        }
      }
      if (!requestedThisRound) break;
    }

    snapshot.errors.push(...errors);
    snapshot.exhausted = requests >= this.config.maxRequestsPerSnapshot;
    return { errors, partial: errors.length > 0 };
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
