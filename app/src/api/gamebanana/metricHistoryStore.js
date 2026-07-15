export class MetricHistoryStore {
  constructor() { this.records = new Map(); }
  get(id) { return this.records.get(String(id)) || null; }
  getMany(ids) { return Object.fromEntries(ids.map((id) => [id, this.get(id)])); }
  observe(candidates, observedAt) {
    candidates.forEach((candidate) => this.records.set(String(candidate.id), {
      likes: candidate.likes, views: candidate.views, observedAt,
    }));
  }
}
