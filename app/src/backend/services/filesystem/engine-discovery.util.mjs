import { mapWithConcurrency } from "../../utils/async-concurrency.util.mjs";

export async function discoverInstalledEngines({
  enginesPath,
  engineDetails,
  customEngines,
  readDirectory,
  exists,
  findExecutable,
  isValidEngineVersion,
}) {
  const readEntries = async (path) => {
    try {
      return await readDirectory(path);
    } catch (error) {
      throw new Error(
        `WeekBox could not read installed engine files at ${path}. ${error?.message || error}`,
        { cause: error },
      );
    }
  };
  const customInstallIds = new Set(
    customEngines.flatMap((engine) =>
      engine.versions.map((version) => `${engine.id}/${version.installId}`),
    ),
  );
  const entries = await readEntries(enginesPath);
  const engines = await mapWithConcurrency(
    entries.filter(
      (entry) =>
        entry.type === "DIRECTORY" &&
        Object.prototype.hasOwnProperty.call(engineDetails, entry.entry),
    ),
    2,
    async (engine) => {
      const enginePath = `${enginesPath}/${engine.entry}`;
      const versions = await readEntries(enginePath);
      const candidates = versions.filter(
        (version) =>
          version.type === "DIRECTORY" &&
          isValidEngineVersion(version.entry) &&
          (engine.entry !== "psychonline" || version.entry === "Latest") &&
          !customInstallIds.has(`${engine.entry}/${version.entry}`),
      );
      const installedVersions = await mapWithConcurrency(
        candidates,
        2,
        async (version) => {
          const versionPath = `${enginePath}/${version.entry}`;
          if (await exists(`${versionPath}/.downloading`)) return null;
          if (!(await findExecutable(versionPath))) return null;
          return { id: engine.entry, version: version.entry };
        },
      );
      return installedVersions.filter(Boolean);
    },
  );
  const installed = engines.flat();
  const customInstalled = await mapWithConcurrency(
    customEngines,
    2,
    async (engine) =>
      mapWithConcurrency(engine.versions, 2, async (version) => {
        const path = `${enginesPath}/${engine.id}/${version.installId}`;
        if (await exists(`${path}/.downloading`)) return null;
        const executable = version.executable
          ? `${path}/${version.executable}`
          : await findExecutable(path);
        if (!executable || !(await exists(executable))) return null;
        return {
          id: engine.id,
          version: version.version,
          installId: version.installId,
          custom: true,
          path,
          originalVersion: version.version,
        };
      }),
  );
  return [...installed, ...customInstalled.flat().filter(Boolean)];
}
