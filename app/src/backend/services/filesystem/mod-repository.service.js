function sameId(left, right) {
  return String(left) === String(right);
}

var _ModRepository = class _ModRepository {
  constructor({ api, getDataPath }) {
    this.api = api;
    this.getDataPath = getDataPath;
  }
  get filePath() {
    return `${this.getDataPath()}/installedmods.json`;
  }
  async getAll() {
    if (!await this.api.exists(this.filePath)) return [];
    try {
      const mods = JSON.parse(await this.api.read(this.filePath));
      return Array.isArray(mods) ? mods : [];
    } catch (error) {
      return [];
    }
  }
  async saveAll(mods) {
    await this.api.write(this.filePath, JSON.stringify(mods, null, 2));
  }
  async add(modId, modName, metadata = {}) {
    const mods = await this.getAll();
    if (mods.some((mod) => sameId(mod.id, modId))) return;
    mods.push({ name: modName, id: modId, hidden: false, ...metadata });
    await this.saveAll(mods);
  }
  async setHidden(modId, hidden) {
    const mods = await this.getAll();
    const mod = mods.find((item) => sameId(item.id, modId));
    if (!mod) return null;
    mod.hidden = Boolean(hidden);
    await this.saveAll(mods);
    return mod;
  }
  async setEngineVersion(modId, engineVersion) {
    const mods = await this.getAll();
    const mod = mods.find((item) => sameId(item.id, modId));
    if (!mod) return null;
    mod.engineVersion = engineVersion || null;
    await this.saveAll(mods);
    return mod;
  }
  async setEngineCompatibility(modId, engineId, engineVersion) {
    const mods = await this.getAll();
    const mod = mods.find((item) => sameId(item.id, modId));
    if (!mod) return null;
    mod.engineId = engineId || null;
    mod.engineVersion = engineId ? engineVersion || null : null;
    await this.saveAll(mods);
    return mod;
  }
  async moveToDependencies(modId) {
    const mods = await this.getAll();
    const mod = mods.find((item) => sameId(item.id, modId));
    if (!mod) return null;
    for (const dependencyId of mod.dependencies || []) {
      const dependency = mods.find((item) => sameId(item.id, dependencyId));
      if (!dependency) continue;
      dependency.consumers = (dependency.consumers || []).filter(
        (consumerId) => !sameId(consumerId, modId)
      );
    }
    mod.kind = "dependency";
    delete mod.dependencies;
    await this.saveAll(mods);
    return mod;
  }
  async moveToMods(modId) {
    const mods = await this.getAll();
    const mod = mods.find((item) => sameId(item.id, modId));
    if (!mod) return null;
    delete mod.kind;
    delete mod.consumers;
    await this.saveAll(mods);
    return mod;
  }
  async updateAppearance(modId, { name, coverPath } = {}) {
    const mods = await this.getAll();
    const mod = mods.find((item) => sameId(item.id, modId));
    if (!mod) return null;
    if (typeof name === "string" && name.trim()) mod.name = name.trim();
    if (coverPath !== void 0) {
      mod.coverPath = coverPath || null;
      delete mod.image;
      delete mod.imageBase64;
    }
    await this.saveAll(mods);
    return mod;
  }
  async addDependencyConsumer(dependencyId, consumerId) {
    const mods = await this.getAll();
    const dependency = mods.find((mod) => sameId(mod.id, dependencyId));
    if (!dependency) return null;
    const consumers = new Set(dependency.consumers || []);
    consumers.add(consumerId);
    dependency.consumers = [...consumers];
    await this.saveAll(mods);
    return dependency;
  }
  async removeDependencyConsumer(dependencyId, consumerId) {
    const mods = await this.getAll();
    const dependency = mods.find((mod) => sameId(mod.id, dependencyId));
    if (!dependency) return null;
    dependency.consumers = (dependency.consumers || []).filter(
      (id) => !sameId(id, consumerId)
    );
    await this.saveAll(mods);
    return dependency;
  }
  async remove(modId) {
    if (!await this.api.exists(this.filePath)) return;
    const mods = await this.getAll();
    const remainingMods = mods.filter((mod) => !sameId(mod.id, modId));
    if (remainingMods.length !== mods.length) await this.saveAll(remainingMods);
  }
  async has(modId) {
    return (await this.getAll()).some((mod) => sameId(mod.id, modId));
  }
};

var ModRepository = _ModRepository;

export { ModRepository };
