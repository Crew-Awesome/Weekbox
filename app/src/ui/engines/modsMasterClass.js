import { FS } from "../../utils/filesystem.js";

class ModsMasterClass {
  async injectBeforeLaunch(engineId, version) {
    if (!FS.isInitialized) await FS.init();
    try {
      const results = await FS.injectModsIntoEngine(engineId, version);

      const failed = results.filter((result) => result.status === "rejected");
      if (failed.length > 0) {
        console.warn("ModsMasterClass: Failed to inject some mods.");
      }

      return true;
    } catch (error) {
      console.error("ModsMasterClass:", error);
      return false;
    }
  }

  async cleanupAfterExit(engineId, version) {
    if (!FS.isInitialized) await FS.init();
    try {
      await FS.cleanupEngineMods(engineId, version);
      return true;
    } catch (error) {
      console.error("ModsMasterClass cleanup:", error);
      return false;
    }
  }
}

export const modsMaster = new ModsMasterClass();
