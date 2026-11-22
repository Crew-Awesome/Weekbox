import { mapWithConcurrency } from "../../utils/async-concurrency.util.mjs";
import { getModFolderName } from "./path.util.js";

export class StandaloneModCatalogService {
  constructor({
    mods,
    getModsPath,
    findExecutable,
    getModIcon,
    getIconDataUrl,
  }) {
    this.mods = mods;
    this.getModsPath = getModsPath;
    this.findExecutable = findExecutable;
    this.getModIcon = getModIcon;
    this.getIconDataUrl = getIconDataUrl;
  }

  async getMods({ includeIcons = true, mods: installedMods } = {}) {
    const shouldPersist = !installedMods;
    const mods = installedMods || (await this.mods.getAll());
    const standaloneMods = await mapWithConcurrency(mods, 4, async (mod) => {
      const folderName = getModFolderName(mod);
      if (!folderName) return null;
      const executable = await this.findExecutable(
        `${this.getModsPath()}/${folderName}`,
      );
      if (!executable) return null;
      return {
        ...mod,
        engineId: "executable",
        engineVersion: null,
        engineLocked: false,
        kind: "mod",
        exePath: executable,
        icoPath: includeIcons
          ? (await this.getModIcon(mod.id)) ||
            mod.providerIconUrl ||
            (await this.getIconDataUrl(executable))
          : "",
      };
    });
    const availableMods = standaloneMods.filter(Boolean);
    let changed = false;
    for (const mod of availableMods) {
      if (
        mod.engineId !== "executable" ||
        mod.engineVersion ||
        mod.engineLocked ||
        mod.kind !== "mod"
      ) {
        Object.assign(mod, {
          engineId: "executable",
          engineVersion: null,
          engineLocked: false,
          kind: "mod",
        });
        changed = true;
      }
    }
    if (changed && shouldPersist) await this.mods.saveAll(mods);
    return availableMods;
  }
}
