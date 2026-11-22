import {
  getModFolderName,
  getEngineModFolderName,
  normalizeFolderName,
} from "./path.util.js";
import {
  allSettledWithConcurrency,
  mapWithConcurrency,
} from "../../utils/async-concurrency.util.mjs";
import {
  interpretEngineLinkCheck,
  shouldCopyWhenJunctionUnsupported,
} from "./engine-link-check.util.mjs";
import { sameId } from "./identity.util.js";

function supportsEngineVersion(mod, version) {
  return !mod.engineVersion || mod.engineVersion === version;
}

function usesAddonsDirectory(mod, engineId) {
  // Legacy Codename dependencies already live in addons; keep that placement on migration.
  return (
    (engineId === "codename" &&
      (mod.kind === "dependency" || mod.kind === "addon")) ||
    (String(engineId).startsWith("custom-") && mod.kind === "addon")
  );
}

function quotePosix(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}

function encodePowerShellCommand(command) {
  const bytes = new Uint8Array(command.length * 2);
  for (let index = 0; index < command.length; index += 1) {
    const code = command.charCodeAt(index);
    bytes[index * 2] = code & 0xff;
    bytes[index * 2 + 1] = code >> 8;
  }
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return window.btoa(binary);
}

function quotePowerShell(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function execPowerShell(script) {
  const encoded = encodePowerShellCommand(script);
  return Neutralino.os.execCommand(
    `powershell.exe -NoProfile -NonInteractive -EncodedCommand ${encoded}`,
    { background: false },
  );
}

async function removeEngineModLinkAttempt({
  api,
  isEngineRunning,
  mod,
  engineId,
  version,
  linkPath,
  isCopiedLink,
}) {
  if (isEngineRunning?.(engineId, version)) {
    throw new Error(
      `Close the ${engineId} engine before removing ${mod.name}.`,
    );
  }
  if (isCopiedLink) {
    await api.remove(linkPath);
  } else if (window.NL_OS === "Windows") {
    const path = quotePowerShell(linkPath);
    const result = await execPowerShell(
      `$item=Get-Item -LiteralPath ${path} -Force -ErrorAction Stop;if(($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -eq 0){exit 2};if($item.PSIsContainer){[System.IO.Directory]::Delete(${path},$false)}else{[System.IO.File]::Delete(${path})};if(Test-Path -LiteralPath ${path}){exit 1}`,
    );
    if (result.exitCode !== 0)
      throw new Error(
        result.stdErr || result.stdOut || "Could not remove engine link",
      );
  } else {
    const result = await Neutralino.os.execCommand(
      `unlink ${quotePosix(linkPath)}`,
      {
        background: false,
      },
    );
    if (result.exitCode !== 0)
      throw new Error(
        result.stdErr || result.stdOut || "The directory is not empty",
      );
  }
  if (await api.exists(linkPath)) throw new Error("The directory is not empty");
}

async function removeEngineModLink({
  api,
  isEngineRunning,
  mod,
  engineId,
  version,
  linkPath,
}) {
  const linkCheck =
    window.NL_OS === "Windows"
      ? execPowerShell(
          `try{$item=Get-Item -LiteralPath ${quotePowerShell(linkPath)} -Force -ErrorAction Stop;if($item.Attributes -band [IO.FileAttributes]::ReparsePoint){exit 0};exit 1}catch [System.Management.Automation.ItemNotFoundException]{exit 1}catch{[Console]::Error.WriteLine($_);exit 2}`,
        )
      : Neutralino.os.execCommand(`test -L ${quotePosix(linkPath)}`, {
          background: false,
        });
  const isLink = interpretEngineLinkCheck(await linkCheck, linkPath);
  const isCopiedLink =
    !isLink &&
    (await api.exists(`${linkPath}/.weekbox-copy-link`));
  if (!isLink && !isCopiedLink) return false;

  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await removeEngineModLinkAttempt({
        api,
        isEngineRunning,
        mod,
        engineId,
        version,
        linkPath,
        isCopiedLink,
      });
      return true;
    } catch (error) {
      lastError = error;
      if (attempt < 3)
        await new Promise((resolve) => setTimeout(resolve, attempt * 350));
    }
  }
  if (await api.exists(linkPath)) {
    const detail = String(lastError?.message || lastError || "")
      .replace(/[\0\r]+/g, " ")
      .trim();
    throw new Error(
      detail
        ? `Could not remove mod link because a file is in use: ${detail}`
        : `Could not remove mod link for ${mod.name}. Close the engine and try again.`,
    );
  }
  return true;
}

async function getExistingLinkConflict(
  service,
  mod,
  engineId,
  engineFolderName,
  allMods = null,
) {
  const storedMods = allMods || (await service.modRepository.getAll());
  const conflicts = (Array.isArray(storedMods) ? storedMods : []).filter(
    (otherMod) =>
      !sameId(otherMod.id, mod.id) &&
      otherMod.engineId === engineId &&
      !otherMod.hidden &&
      usesAddonsDirectory(otherMod, engineId) ===
        usesAddonsDirectory(mod, engineId) &&
      normalizeFolderName(getEngineModFolderName(otherMod)) ===
        normalizeFolderName(engineFolderName),
  );
  return conflicts[0] || null;
}

async function createEngineLink(service, mod, sourcePath, linkPath) {
  const command =
    window.NL_OS === "Windows"
      ? null
      : `ln -s ${quotePosix(sourcePath)} ${quotePosix(linkPath)}`;
  const result =
    window.NL_OS === "Windows"
      ? await execPowerShell(
          `try{New-Item -ItemType Junction -Path ${quotePowerShell(linkPath)} -Target ${quotePowerShell(sourcePath)} -ErrorAction Stop | Out-Null;exit 0}catch{[Console]::Error.WriteLine($_);exit 1}`,
        )
      : await Neutralino.os.execCommand(command, { background: false });
  if (result.exitCode === 0) return { linked: true, path: linkPath };
  const output = String(result.stdErr || result.stdOut || "");
  if (
    window.NL_OS === "Windows" &&
    /already exists|cannot create a file when that file already exists/i.test(
      output,
    ) &&
    (await service.api.exists(linkPath))
  ) {
    return { linked: false, path: linkPath };
  }
  if (
    window.NL_OS === "Windows" &&
    shouldCopyWhenJunctionUnsupported(output)
  ) {
    await Neutralino.filesystem.copy(sourcePath, linkPath, {
      recursive: true,
      overwrite: false,
      skip: false,
    });
    await service.api.write(`${linkPath}/.weekbox-copy-link`, "1");
    return { linked: true, copied: true, path: linkPath };
  }
  if (window.NL_OS === "Windows") {
    throw new Error(
      `Windows cannot create a junction for ${mod.name} on this storage volume. Move the WeekBox library and engine to a local NTFS volume, then try again.`,
    );
  }
  throw new Error(output || `Could not inject ${mod.name}`);
}

var _ModInjectionService = class _ModInjectionService {
  constructor({
    api,
    executables,
    modRepository,
    getEnginesPath,
    getModsPath,
    isEngineRunning,
    getCustomEngine,
  }) {
    this.api = api;
    this.executables = executables;
    this.modRepository = modRepository;
    this.getEnginesPath = getEnginesPath;
    this.getModsPath = getModsPath;
    this.isEngineRunning = isEngineRunning;
    this.getCustomEngine = getCustomEngine;
  }
  getLegacyModsPath(engineId, version) {
    return `${this.getEnginesPath()}/${engineId}/${version}/mods`;
  }
  getLegacyAddonsPath(engineId, version) {
    return `${this.getEnginesPath()}/${engineId}/${version}/addons`;
  }
  async getEngineContentPath(engineId, version, directoryName) {
    const customEngine = this.getCustomEngine?.(engineId);
    const customVersion = customEngine?.versions?.find(
      (candidate) => candidate.version === version,
    );
    const customDirectory = customVersion?.modDirectories?.find(
      (directory) =>
        directory.enabled !== false &&
        (directory.type ===
          (directoryName === "mods"
            ? "mod"
            : directoryName === "addons"
              ? "addon"
              : directoryName === "dependencies"
                ? "dependency"
                : directoryName) ||
          String(directory.path || "").toLocaleLowerCase() === directoryName),
    );
    const customInstallPath = customVersion
      ? `${this.getEnginesPath()}/${engineId}/${customVersion.installId}`
      : null;
    const legacyPath = `${customInstallPath || `${this.getEnginesPath()}/${engineId}/${version}`}/${customDirectory?.path || directoryName}`;
    if (window.NL_OS !== "Darwin") return legacyPath;
    const executablePath = await this.executables.find(
      customInstallPath || `${this.getEnginesPath()}/${engineId}/${version}`,
    );
    const normalizedPath = String(executablePath || "").replace(/\\/g, "/");
    const bundleMatch = normalizedPath.match(/^(.+?\.app)(?:\/|$)/i);
    return bundleMatch
      ? `${bundleMatch[1]}/Contents/Resources/${directoryName}`
      : legacyPath;
  }
  async getEngineModsPath(engineId, version) {
    return this.getEngineContentPath(engineId, version, "mods");
  }
  async getEngineAddonsPath(engineId, version) {
    return this.getEngineContentPath(engineId, version, "addons");
  }
  async migrateLegacyEngineMods(engineId, version) {
    if (window.NL_OS !== "Darwin") return;
    const legacyModsPath = this.getLegacyModsPath(engineId, version);
    const bundleModsPath = await this.getEngineModsPath(engineId, version);
    if (
      bundleModsPath === legacyModsPath ||
      !(await this.api.exists(legacyModsPath))
    ) {
      return;
    }
    await this.api.ensureDir(bundleModsPath);
    let entries;
    try {
      entries = await Neutralino.filesystem.readDirectory(legacyModsPath);
    } catch (error) {
      throw new Error(
        `Could not read legacy engine mods at ${legacyModsPath}: ${error?.message || error}`,
        { cause: error },
      );
    }
    for (const entry of entries.filter(
      (item) => item.entry !== "." && item.entry !== "..",
    )) {
      const sourcePath = `${legacyModsPath}/${entry.entry}`;
      const destinationPath = `${bundleModsPath}/${entry.entry}`;
      if (await this.api.exists(destinationPath)) continue;
      try {
        await this.api.move(sourcePath, destinationPath);
      } catch (error) {
        throw new Error(
          `Could not migrate legacy engine mod from ${sourcePath} to ${destinationPath}: ${error?.message || error}`,
          { cause: error },
        );
      }
    }
  }
  async migrateLegacyEngineModsFor(engines) {
    if (window.NL_OS !== "Darwin") return;
    await mapWithConcurrency(engines, 3, (engine) =>
      this.migrateLegacyEngineMods(engine.id, engine.version),
    );
  }
  async link(mod, engineId, version, allMods = null) {
    const folderName = getModFolderName(mod);
    if (!String(folderName || "").trim())
      throw new Error(
        "WeekBox could not link this mod: required parameter 'folderName' is missing.",
      );
    const sourcePath = `${this.getModsPath()}/${folderName}`;
    await this.migrateLegacyEngineMods(engineId, version);
    const modsPath = usesAddonsDirectory(mod, engineId)
      ? await this.getEngineAddonsPath(engineId, version)
      : await this.getEngineModsPath(engineId, version);
    const engineFolderName = getEngineModFolderName(mod);
    if (!String(modsPath || "").trim())
      throw new Error(
        "WeekBox could not link this mod: required parameter 'modsPath' is missing.",
      );
    if (!String(engineFolderName || "").trim())
      throw new Error(
        "WeekBox could not link this mod: required parameter 'engineFolderName' is missing.",
      );
    const linkPath = `${modsPath}/${engineFolderName}`;
    if (!(await this.api.exists(sourcePath))) {
      throw new Error(`Mod files not found for ${mod.name}`);
    }
    if (await this.executables.find(sourcePath))
      return { linked: false, standalone: true };
    if (mod.kind === "dependency" && !usesAddonsDirectory(mod, engineId)) {
      const oldLinkPath = `${await this.getEngineContentPath(
        engineId,
        version,
        "dependencies",
      )}/${engineFolderName}`;
      if (oldLinkPath !== linkPath)
        await removeEngineModLink({
          api: this.api,
          isEngineRunning: (...args) => this.isEngineRunning?.(...args),
          mod,
          engineId,
          version,
          linkPath: oldLinkPath,
        });
    }
    await this.api.ensureDir(modsPath);
    if (await this.api.exists(linkPath)) {
      const conflict = await getExistingLinkConflict(
        this,
        mod,
        engineId,
        engineFolderName,
        allMods,
      );
      if (conflict) {
        throw new Error(
          `Engine folder conflict: ${engineFolderName} is already used by ${conflict.name}. Remove or hide it before launching ${mod.name}.`,
        );
      }
      return { linked: false, path: linkPath };
    }
    return createEngineLink(this, mod, sourcePath, linkPath);
  }
  async injectOne(modId, engineId, version) {
    const storedMods = await this.modRepository.getAll();
    const mod = (Array.isArray(storedMods) ? storedMods : []).find((item) =>
      sameId(item.id, modId),
    );
    if (!mod || mod.hidden || !supportsEngineVersion(mod, version)) return;
    return this.link(mod, engineId, version, storedMods);
  }
  async injectForEngine(engineId, version) {
    const storedMods = await this.modRepository.getAll();
    const mods = (Array.isArray(storedMods) ? storedMods : []).filter(
      (mod) =>
        mod.engineId === engineId &&
        !mod.hidden &&
        supportsEngineVersion(mod, version),
    );
    return allSettledWithConcurrency(mods, 3, (mod) =>
      this.link(mod, engineId, version, storedMods),
    );
  }
  async injectIntoInstalledEngines(modId, engines) {
    const storedMods = await this.modRepository.getAll();
    const mod = (Array.isArray(storedMods) ? storedMods : []).find((item) =>
      sameId(item.id, modId),
    );
    if (!mod?.engineId || mod.hidden) return [];
    const matchingEngines = engines.filter(
      (engine) =>
        engine.id === mod.engineId &&
        supportsEngineVersion(mod, engine.version),
    );
    return allSettledWithConcurrency(matchingEngines, 3, (engine) =>
      this.link(mod, engine.id, engine.version, storedMods),
    );
  }
  async injectModsIntoInstalledEngines(mods, engines) {
    const batches = await allSettledWithConcurrency(mods, 3, async (mod) => {
      if (!mod?.engineId || mod.hidden) return [];
      const matches = engines.filter(
        (engine) =>
          engine.id === mod.engineId &&
          supportsEngineVersion(mod, engine.version),
      );
      return allSettledWithConcurrency(matches, 3, (engine) =>
        this.link(mod, engine.id, engine.version, mods),
      );
    });
    return batches.flatMap((batch) =>
      batch.status === "rejected" ? [batch] : batch.value,
    );
  }
  async unlinkFromEngine(mod, engineId, version) {
    const legacyModsPath = this.getLegacyModsPath(engineId, version);
    const bundleModsPath = await this.getEngineModsPath(engineId, version);
    const enginePaths = [bundleModsPath, legacyModsPath];
    if (engineId === "codename") {
      enginePaths.push(
        await this.getEngineAddonsPath(engineId, version),
        this.getLegacyAddonsPath(engineId, version),
      );
    }
    if (
      (mod.kind === "dependency" && !usesAddonsDirectory(mod, engineId)) ||
      this.getCustomEngine?.(engineId)
    ) {
      enginePaths.push(
        await this.getEngineContentPath(engineId, version, "dependencies"),
      );
    }
    const paths = [...new Set(enginePaths)].map(
      (modsPath) => `${modsPath}/${getEngineModFolderName(mod)}`,
    );
    let removed = false;
    for (const linkPath of paths) {
      if (!(await this.api.exists(linkPath))) continue;

      // to this WeekBox library entry, so never delete them as if they were links.
      removed =
        (await removeEngineModLink({
          api: this.api,
          isEngineRunning: (...args) => this.isEngineRunning?.(...args),
          mod,
          engineId,
          version,
          linkPath,
        })) || removed;
    }
    return removed;
  }
  async unlinkFromInstalledEngines(mod, engines) {
    const matchingEngines = engines.filter(
      (engine) =>
        engine.id === mod.engineId &&
        supportsEngineVersion(mod, engine.version),
    );
    return allSettledWithConcurrency(matchingEngines, 3, (engine) =>
      this.unlinkFromEngine(mod, engine.id, engine.version),
    );
  }
  async cleanup(engineId, version) {
    const legacyModsPath = this.getLegacyModsPath(engineId, version);
    const bundleModsPath = await this.getEngineModsPath(engineId, version);
    const enginePaths = [bundleModsPath, legacyModsPath];
    if (engineId === "codename") {
      enginePaths.push(
        await this.getEngineAddonsPath(engineId, version),
        this.getLegacyAddonsPath(engineId, version),
      );
    }
    if (this.getCustomEngine?.(engineId)) {
      enginePaths.push(
        await this.getEngineContentPath(engineId, version, "dependencies"),
      );
    }
    for (const modsPath of new Set(enginePaths)) {
      if (!(await this.api.exists(modsPath))) continue;
      try {
        const entries = await Neutralino.filesystem.readDirectory(modsPath);
        for (const entry of entries.filter(
          (item) => item.entry !== "." && item.entry !== "..",
        )) {
          const linkPath = `${modsPath}/${entry.entry}`;
          await removeEngineModLink({
            api: this.api,
            isEngineRunning: (...args) => this.isEngineRunning?.(...args),
            mod: { name: entry.entry },
            engineId,
            version,
            linkPath,
          }).catch((error) => {
            if (error?.message?.includes("Close the ")) throw error;
            console.warn(
              "Could not clean up a WeekBox mod link:",
              linkPath,
              error,
            );
          });
        }
      } catch (error) {
        console.warn("Could not clean up mods shortcuts", error);
      }
    }
  }
};

var ModInjectionService = _ModInjectionService;

export { ModInjectionService };
