import { sameId } from "./identity.util.js";

export class ModKindService {
  constructor({
    mods,
    injection,
    getIsInitialized,
    assertStorageUnlocked,
    assertModChangeAllowed,
    isCustomEngine,
    getInstalledEngines,
  }) {
    this.mods = mods;
    this.injection = injection;
    this.getIsInitialized = getIsInitialized;
    this.assertStorageUnlocked = assertStorageUnlocked;
    this.assertModChangeAllowed = assertModChangeAllowed;
    this.isCustomEngine = isCustomEngine;
    this.getInstalledEngines = getInstalledEngines;
  }

  async setModType(modId, type) {
    this.assertStorageUnlocked();
    if (!this.getIsInitialized()) return null;
    await this.assertModChangeAllowed(modId);
    const mods = await this.mods.getAll();
    const mod = mods.find((item) => sameId(item.id, modId));
    if (!mod) return null;
    if (
      type === "addon" &&
      mod.engineId !== "codename" &&
      !this.isCustomEngine(mod.engineId)
    ) {
      throw new Error("Addons are only available for Codename Engine mods");
    }
    if (type === "dependency") return this.moveModToDependencies(modId);
    const engines = await this.getInstalledEngines();
    if (mod.kind === "dependency") {
      const consumers = mods.filter(
        (item) =>
          item.kind !== "dependency" &&
          Array.isArray(item.dependencies) &&
          item.dependencies.some((dependencyId) => sameId(dependencyId, modId)),
      );
      if (consumers.length)
        throw new Error(
          `Remove ${consumers.map((item) => item.name).join(", ")} before changing ${mod.name}`,
        );
    }

    if ((mod.kind || "mod") !== type)
      await this.injection.unlinkFromInstalledEngines(mod, engines);
    const updated = await this.mods.setType(modId, type);
    if (updated?.engineId && !updated.hidden)
      await this.injection.injectIntoInstalledEngines(modId, engines);
    return updated;
  }
  async moveModToDependencies(modId) {
    this.assertStorageUnlocked();
    if (!this.getIsInitialized()) return null;
    await this.assertModChangeAllowed(modId);
    const mod = (await this.mods.getAll()).find((item) =>
      sameId(item.id, modId),
    );
    if (!mod || mod.kind === "dependency") return mod || null;
    const engines = await this.getInstalledEngines();
    await this.injection.unlinkFromInstalledEngines(mod, engines);
    const dependency = await this.mods.moveToDependencies(modId);
    if (dependency?.engineId && !dependency.hidden) {
      await this.injection.injectIntoInstalledEngines(modId, engines);
    }
    return dependency;
  }
  async moveDependencyToMods(modId) {
    this.assertStorageUnlocked();
    if (!this.getIsInitialized()) return null;
    await this.assertModChangeAllowed(modId);
    const mods = await this.mods.getAll();
    const dependency = mods.find((item) => sameId(item.id, modId));
    if (!dependency || dependency.kind !== "dependency")
      return dependency || null;
    const consumers = mods.filter(
      (item) =>
        item.kind !== "dependency" &&
        Array.isArray(item.dependencies) &&
        item.dependencies.some((dependencyId) => sameId(dependencyId, modId)),
    );
    if (consumers.length) {
      throw new Error(
        `Remove ${consumers.map((item) => item.name).join(", ")} before moving ${dependency.name}`,
      );
    }
    const mod = await this.mods.moveToMods(modId);
    if (mod?.engineId && !mod.hidden) {
      await this.injection.injectIntoInstalledEngines(
        modId,
        await this.getInstalledEngines(),
      );
    }
    return mod;
  }
}
