function sameId(left, right) {
  return String(left) === String(right);
}

class CustomEngineRepository {
  constructor({ api, getStoragePaths }) {
    this.api = api;
    this.getStoragePaths = getStoragePaths;
    this.engines = [];
  }

  get filePath() {
    return this.getStoragePaths().customEnginesFile;
  }

  async load() {
    try {
      const value = JSON.parse(await this.api.read(this.filePath));
      this.engines = Array.isArray(value)
        ? value.filter((engine) => engine?.id && Array.isArray(engine.versions))
        : [];
    } catch {
      this.engines = [];
    }
    return this.engines;
  }

  getAll() {
    return this.engines;
  }

  get(engineId) {
    return this.engines.find((engine) => sameId(engine.id, engineId)) || null;
  }

  async save() {
    await this.api.writeAtomic(
      this.filePath,
      `${JSON.stringify(this.engines, null, 2)}\n`,
    );
  }

  async upsert(engine) {
    const index = this.engines.findIndex((item) => sameId(item.id, engine.id));
    if (index < 0) this.engines.push(engine);
    else this.engines[index] = engine;
    await this.save();
    return engine;
  }

  async remove(engineId) {
    this.engines = this.engines.filter(
      (engine) => !sameId(engine.id, engineId),
    );
    await this.save();
  }
}

export { CustomEngineRepository };
