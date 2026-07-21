export class DiscoverySnapshotStore {
  constructor({ config }) {
    this.config = config;
    this.snapshots = new Map();
  }
  get(queryKey, now) {
    const snapshot = [...this.snapshots.values()].find(
      (item) => item.queryKey === queryKey,
    );
    if (!snapshot || now - snapshot.createdAt > this.config.snapshotFreshMs)
      return null;
    this.snapshots.delete(snapshot.id);
    this.snapshots.set(snapshot.id, snapshot);
    return snapshot;
  }
  getStale(queryKey, now) {
    return (
      [...this.snapshots.values()].find(
        (item) =>
          item.queryKey === queryKey &&
          now - item.createdAt <= this.config.snapshotStaleIfErrorMs,
      ) || null
    );
  }
  create(queryKey, now) {
    const snapshot = {
      id: `${now}-${Math.random().toString(36).slice(2)}`,
      queryKey,
      createdAt: now,
      configVersion: this.config.version,
      candidatesById: new Map(),
      orderedIds: [],
      generatedPageCount: 0,
      sourceCursors: {},
      errors: [],
      exhausted: false,
    };
    this.snapshots.set(snapshot.id, snapshot);
    while (this.snapshots.size > this.config.maximumSnapshots)
      this.snapshots.delete(this.snapshots.keys().next().value);
    return snapshot;
  }
  byId(id) {
    return this.snapshots.get(id) || null;
  }
}
