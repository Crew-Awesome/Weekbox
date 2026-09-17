import type { DesktopTransport } from "../transport";
import { getDesktopBasePath } from "../settings";
import { sanitizeEngineId, sanitizeVersion } from "./utils";
import type { StoragePathProvider } from "./verification";

/**
 * Retrieves the registry of all installed engines and their versions from disk.
 */
export async function getInstalledEngines(
  transport: DesktopTransport,
  storage: StoragePathProvider
): Promise<Record<string, Record<string, any>>> {
  const basePath = await getDesktopBasePath();
  const registryPath = `${basePath}/data/installed_engines.json`;
  let registry: Record<string, Record<string, any>> = {};

  try {
    const raw = await transport.call("fs.readFile" as any, { path: registryPath });
    registry = JSON.parse(raw as unknown as string) || {};
  } catch {}

  const enginesDir = await storage.getEnginesPath();
  try {
    const enginesExists = await transport
      .call("fs.exists" as any, { path: enginesDir })
      .catch(() => false);

    if (enginesExists) {
      const engineEntries = await transport.call("fs.readDirectory" as any, { path: enginesDir });
      if (Array.isArray(engineEntries)) {
        for (const entry of engineEntries) {
          if (entry.type === "DIRECTORY" && !entry.entry.startsWith("_") && !entry.entry.startsWith(".")) {
            const safeEngineId = entry.entry;
            const subDir = `${enginesDir}/${safeEngineId}`;
            try {
              const verEntries = await transport.call("fs.readDirectory" as any, { path: subDir });
              if (Array.isArray(verEntries)) {
                for (const ver of verEntries) {
                  if (ver.type === "DIRECTORY" && !ver.entry.startsWith("_") && !ver.entry.startsWith(".")) {
                    const safeVersion = ver.entry;
                    if (!registry[safeEngineId]) {
                      registry[safeEngineId] = {};
                    }
                    if (!registry[safeEngineId][safeVersion]) {
                      registry[safeEngineId][safeVersion] = {
                        engineId: safeEngineId,
                        version: safeVersion,
                        installedAt: new Date().toISOString(),
                      };
                    }
                  }
                }
              }
            } catch {}
          }
        }
      }
    }
  } catch {}

  return registry;
}

/**
 * Registers an installed engine version into the local metadata registry.
 */
export async function registerInstalledEngine(
  transport: DesktopTransport,
  engineId: string,
  version: string,
  metadata?: Record<string, any>
): Promise<void> {
  const basePath = await getDesktopBasePath();
  const dataDir = `${basePath}/data`;
  const registryPath = `${dataDir}/installed_engines.json`;

  const safeEngineId = sanitizeEngineId(engineId);
  const safeVersion = sanitizeVersion(version);

  await transport.call("fs.createDirectory" as any, { path: dataDir }).catch(() => {});

  let registry: Record<string, Record<string, any>> = {};
  try {
    const raw = await transport.call("fs.readFile" as any, { path: registryPath });
    registry = JSON.parse(raw as unknown as string) || {};
  } catch {}

  if (!registry[safeEngineId]) {
    registry[safeEngineId] = {};
  }

  registry[safeEngineId][safeVersion] = {
    engineId: safeEngineId,
    version: safeVersion,
    installedAt: new Date().toISOString(),
    ...(metadata || {}),
  };

  try {
    await transport.call("fs.writeFile" as any, {
      path: registryPath,
      content: JSON.stringify(registry, null, 2),
    });

    transport.emitLocalEvent("engines:changed", {
      action: "installed",
      engine: registry[safeEngineId][safeVersion],
    });

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("wb:engines-changed", {
          detail: { action: "installed", engine: registry[safeEngineId][safeVersion] },
        })
      );
    }
  } catch (err) {
    console.warn("Could not save installed engines registry:", err);
  }
}

/**
 * Removes an engine release entry from local metadata persistence.
 */
export async function unregisterInstalledEngine(
  transport: DesktopTransport,
  engineId: string,
  version: string
): Promise<void> {
  const basePath = await getDesktopBasePath();
  const safeEngineId = sanitizeEngineId(engineId);
  const safeVersion = sanitizeVersion(version);
  const registryPath = `${basePath}/data/installed_engines.json`;

  try {
    const raw = await transport.call("fs.readFile" as any, { path: registryPath });
    const registry = JSON.parse(raw as unknown as string) || {};
    if (registry[safeEngineId] && registry[safeEngineId][safeVersion]) {
      delete registry[safeEngineId][safeVersion];
      if (Object.keys(registry[safeEngineId]).length === 0) {
        delete registry[safeEngineId];
      }
      await transport.call("fs.writeFile" as any, {
        path: registryPath,
        content: JSON.stringify(registry, null, 2),
      });
    }
  } catch {}

  transport.emitLocalEvent("engines:changed", {
    action: "uninstalled",
    engineId: safeEngineId,
    version: safeVersion,
  });

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("wb:engines-changed", {
        detail: { action: "uninstalled", engineId: safeEngineId, version: safeVersion },
      })
    );
  }
}
