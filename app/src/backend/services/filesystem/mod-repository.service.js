function sameId(left, right) {
  return String(left) === String(right);
}

function normalizeTags(tags) {
  if (!Array.isArray(tags)) return [];
  return [...new Set(tags.map((tag) => String(tag || "").trim().replace(/^#+/, "").replace(/\s+/g, " ").toLocaleLowerCase()).filter((tag) => tag && tag.length <= 48))].slice(0, 20);
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
  async setTags(modId, tags) {
    const mods = await this.getAll();
    const mod = mods.find((item) => sameId(item.id, modId));
    if (!mod) return null;
    mod.tags = normalizeTags(tags);
    await this.saveAll(mods);
    return mod;
  }
  async setType(modId, type) {
    const mods = await this.getAll();
    const mod = mods.find((item) => sameId(item.id, modId));
    if (!mod) return null;
    if (!['mod', 'dependency', 'addon'].includes(type)) throw new Error('Unknown mod type');
    if (type === 'dependency') return this.moveToDependencies(modId);
    if (mod.kind === 'dependency') {
      const consumers = mods.filter((item) => Array.isArray(item.dependencies) && item.dependencies.some((dependencyId) => sameId(dependencyId, modId)));
      if (consumers.length) throw new Error(`Remove ${consumers.map((item) => item.name).join(', ')} before changing ${mod.name}`);
      delete mod.consumers;
    }
    if (type === 'addon') mod.kind = 'addon';
    else delete mod.kind;
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
    if (arguments[1] && Object.prototype.hasOwnProperty.call(arguments[1], "folderName")) {
      mod.folderName = arguments[1].folderName || null;
    }
    if (coverPath !== void 0) {
      mod.coverPath = coverPath || null;
      delete mod.coverFallback;
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
    // A dependency can be deleted deliberately. Keep the remaining library
    // valid by removing its stale references in the same write.
    for (const mod of remainingMods) {
      if (Array.isArray(mod.dependencies)) {
        mod.dependencies = mod.dependencies.filter((dependencyId) => !sameId(dependencyId, modId));
        if (!mod.dependencies.length) delete mod.dependencies;
      }
      if (Array.isArray(mod.consumers)) {
        mod.consumers = mod.consumers.filter((consumerId) => !sameId(consumerId, modId));
        if (!mod.consumers.length) delete mod.consumers;
      }
    }
    if (remainingMods.length !== mods.length) await this.saveAll(remainingMods);
  }
  async has(modId) {
    return (await this.getAll()).some((mod) => sameId(mod.id, modId));
  }
};

var ModRepository = _ModRepository;

export { ModRepository };
