export class CandidateCollector {
  constructor({ transport, gameId, categoryRoots, getRecords, normalizeCandidate, config }) {
    Object.assign(this, { transport, gameId, categoryRoots, getRecords, normalizeCandidate, config });
  }

  async collect(snapshot, { categoryId, signal }) {
    const categories = this.categoryRoots.includes(categoryId) ? [categoryId] : this.categoryRoots;
    const errors = [];
    const seenSignatures = new Set();
    let requests = 0;
    for (let page = 1; page <= this.config.newestMaxPagesPerCategory && requests < this.config.maxRequestsPerSnapshot; page++) {
      const batch = [];
      for (const id of categories) {
        if (requests + batch.length >= this.config.maxRequestsPerSnapshot) break;
        batch.push({ id, page });
      }
      const outcomes = [];
      for (let index = 0; index < batch.length; index += this.config.maxConcurrentRequests) {
        outcomes.push(...await Promise.allSettled(batch.slice(index, index + this.config.maxConcurrentRequests)
          .map(({ id, page: sourcePage }) => this.fetchSource(id, sourcePage, "Generic_Newest", signal))));
      }
      const aborted = outcomes.find((outcome) => outcome.status === "rejected" && outcome.reason?.kind === "aborted");
      if (aborted) throw aborted.reason;
      requests += outcomes.length;
      batch.forEach((source) => {
        snapshot.sourceCursors[`${source.id}:newest`] = source.page;
      });
      outcomes.forEach((outcome, index) => {
        const source = batch[index];
        if (outcome.status === "rejected") { if (outcome.reason?.kind !== "aborted") errors.push({ categoryId: source.id, kind: outcome.reason?.kind || "network" }); return; }
        const signature = outcome.value.map((item) => item._idRow).join(",");
        if (!outcome.value.length || seenSignatures.has(`${source.id}:${signature}`)) return;
        seenSignatures.add(`${source.id}:${signature}`);
        outcome.value.forEach((raw) => {
          const candidate = this.normalizeCandidate(raw, { categoryId: source.id });
          if (candidate.id) snapshot.candidatesById.set(candidate.id, candidate);
        });
      });
      if (snapshot.candidatesById.size >= this.config.initialCandidateTarget) break;
    }
    if (snapshot.candidatesById.size < this.config.initialCandidateTarget && requests < this.config.maxRequestsPerSnapshot) {
      for (let page = 1; page <= this.config.mostLikedMaxPagesPerCategory && requests < this.config.maxRequestsPerSnapshot; page++) {
        for (const id of categories) {
          if (requests++ >= this.config.maxRequestsPerSnapshot) break;
          try { (await this.fetchSource(id, page, "Generic_MostLiked", signal)).forEach((raw) => {
            const candidate = this.normalizeCandidate(raw, { categoryId: id }); if (candidate.id) snapshot.candidatesById.set(candidate.id, candidate);
          }); snapshot.sourceCursors[`${id}:mostLiked`] = page; } catch (error) { if (error?.kind === "aborted") throw error; errors.push({ categoryId: id, kind: error?.kind || "network" }); }
        }
      }
    }
    snapshot.errors.push(...errors); snapshot.exhausted = requests >= this.config.maxRequestsPerSnapshot || snapshot.candidatesById.size < this.config.initialCandidateTarget;
    return { errors, partial: errors.length > 0 };
  }

  async fetchSource(categoryId, page, sort, signal) {
    const data = await this.transport.getModIndex({ gameId: this.gameId, categoryId, page, perPage: this.config.sourcePerPage, sort, signal });
    if (!Array.isArray(data) && !Array.isArray(data?._aRecords)) {
      const error = new Error("Category response schema was invalid"); error.kind = "schema"; throw error;
    }
    const records = this.getRecords(data);
    if (!Array.isArray(records)) { const error = new Error("Category response schema was invalid"); error.kind = "schema"; throw error; }
    return records;
  }
}
