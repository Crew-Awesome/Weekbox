export class ModRepository {
  constructor({ api, getDataPath }) {
    this.api = api;
    this.getDataPath = getDataPath;
  }

  get filePath() {
    return `${this.getDataPath()}/installedmods.json`;
  }

  async getAll() {
    if (!(await this.api.exists(this.filePath))) return [];
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
    if (mods.some((mod) => mod.id === modId)) return;
    mods.push({ name: modName, id: modId, hidden: false, ...metadata });
    await this.saveAll(mods);
  }

  async setHidden(modId, hidden) {
    const mods = await this.getAll();
    const mod = mods.find((item) => item.id === modId);
    if (!mod) return null;
    mod.hidden = Boolean(hidden);
    await this.saveAll(mods);
    return mod;
  }

  async remove(modId) {
    if (!(await this.api.exists(this.filePath))) return;
    const mods = await this.getAll();
    const remainingMods = mods.filter((mod) => mod.id !== modId);
    if (remainingMods.length !== mods.length) await this.saveAll(remainingMods);
  }

  async has(modId) {
    return (await this.getAll()).some((mod) => mod.id === modId);
  }
}
