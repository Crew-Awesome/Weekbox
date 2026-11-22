import { quoteCommandArgument } from "./shell-argument.util.js";
import {
  find7zBinary,
  get7zExtractionCommand,
  getPowerShellExtractCommand,
  getWindowsExtractionCommand,
} from "./archive-tools.service.js";

export function isNonFatalUnzipFilenameWarning(exitCode, output) {
  if (Number(exitCode) !== 1) return false;
  const detail = String(output || "");
  return (
    /mismatching ["']?local["']? filename/i.test(detail) &&
    /continuing with ["']?central["']? filename version/i.test(detail)
  );
}

export class ArchiveExtractionService {
  constructor({
    spawnProcessWithShell,
    getOsProcessId,
    listenForProcess,
    appendProcessOutput,
    createProcessError,
  }) {
    this.spawnProcessWithShell = spawnProcessWithShell;
    this.getOsProcessId = getOsProcessId;
    this.listenForProcess = listenForProcess;
    this.appendProcessOutput = appendProcessOutput;
    this.createProcessError = createProcessError;
  }

  async hasExtractedPayload(path) {
    try {
      const entries = await Neutralino.filesystem.readDirectory(path);
      for (const entry of entries) {
        if ([".", "..", ".downloading"].includes(entry.entry)) continue;
        if (entry.type === "FILE") return true;
        if (
          entry.type === "DIRECTORY" &&
          (await this.hasExtractedPayload(`${path}/${entry.entry}`))
        ) {
          return true;
        }
      }
    } catch {}
    return false;
  }

  getExtractionCommand({
    portable7z,
    archivePath,
    destinationPath,
    archiveFormat,
    isWindows,
  }) {
    if (portable7z)
      return get7zExtractionCommand(portable7z, archivePath, destinationPath);
    if (isWindows)
      return getWindowsExtractionCommand(archivePath, destinationPath);
    if (archiveFormat === "tar" || archiveFormat === "gzip") {
      return `tar -xf ${quoteCommandArgument(archivePath)} -C ${quoteCommandArgument(destinationPath)}`;
    }
    if (archiveFormat === "rar" || archiveFormat === "7z") {
      return window.NL_OS === "Darwin"
        ? `tar -xf ${quoteCommandArgument(archivePath)} -C ${quoteCommandArgument(destinationPath)}`
        : `7z x -y -aoa -o${quoteCommandArgument(destinationPath)} ${quoteCommandArgument(archivePath)}`;
    }
    return `unzip -oq ${quoteCommandArgument(archivePath)} -d ${quoteCommandArgument(destinationPath)}`;
  }

  createExecutor({ getTask, reportEntry, isWindows }) {
    return async (command) => {
      const process = await this.spawnProcessWithShell(command);
      const task = getTask();
      if (task) task.pid = this.getOsProcessId(process);
      let processOutput = "";
      await this.listenForProcess(
        process,
        getTask,
        (event, handler, resolve, reject) => {
          if (event.action === "stdOut" || event.action === "stdErr") {
            const output = String(event.data || "");
            processOutput = this.appendProcessOutput(processOutput, output);
            const trimmedOutput = output.trim();
            if (trimmedOutput) reportEntry(trimmedOutput);
            return;
          }
          if (event.action !== "exit") return;
          Neutralino.events.off("spawnedProcess", handler);
          const tolerated =
            !isWindows &&
            isNonFatalUnzipFilenameWarning(event.data, processOutput);
          if (event.data === 0 || tolerated) resolve();
          else
            reject(
              this.createProcessError("Extraction", event.data, processOutput),
            );
        },
      );
    };
  }

  async tryWindowsFallbacks({
    execute,
    archivePath,
    destinationPath,
    archiveFormat,
    portable7z,
  }) {
    if (portable7z) return false;
    for (const system7z of [
      "7z",
      "7za",
      "C:\\Program Files\\7-Zip\\7z.exe",
      "C:\\Program Files (x86)\\7-Zip\\7z.exe",
    ]) {
      try {
        await execute(
          get7zExtractionCommand(system7z, archivePath, destinationPath),
        );
        if (await this.hasExtractedPayload(destinationPath)) return true;
      } catch {}
    }
    try {
      await execute(getWindowsExtractionCommand(archivePath, destinationPath));
      if (await this.hasExtractedPayload(destinationPath)) return true;
    } catch {}
    const isZip =
      String(archivePath).toLowerCase().endsWith(".zip") ||
      archiveFormat === "zip" ||
      archiveFormat === "unknown";
    if (!isZip) return false;
    try {
      await execute(getPowerShellExtractCommand(archivePath, destinationPath));
      return await this.hasExtractedPayload(destinationPath);
    } catch {
      return false;
    }
  }

  async tryUnixFallbacks({
    execute,
    archivePath,
    destinationPath,
    archiveFormat,
  }) {
    if (archiveFormat !== "unknown" && archiveFormat !== "zip") return false;
    const fallbackCommands = [
      `tar -xf ${quoteCommandArgument(archivePath)} -C ${quoteCommandArgument(destinationPath)}`,
    ];
    if (window.NL_OS !== "Darwin") {
      fallbackCommands.push(
        `7z x -y -aoa -o${quoteCommandArgument(destinationPath)} ${quoteCommandArgument(archivePath)}`,
      );
    }
    for (const fallbackCommand of fallbackCommands) {
      try {
        await execute(fallbackCommand);
        if (await this.hasExtractedPayload(destinationPath)) return true;
      } catch {}
    }
    return false;
  }

  async extractContents({
    archivePath,
    destinationPath,
    archiveFormat,
    getTask,
    reportEntry,
  }) {
    const isWindows = window.NL_OS === "Windows";
    const portable7z = await find7zBinary();
    const command = this.getExtractionCommand({
      portable7z,
      archivePath,
      destinationPath,
      archiveFormat,
      isWindows,
    });
    const execute = this.createExecutor({ getTask, reportEntry, isWindows });
    let primaryError = null;
    try {
      await execute(command);
      if (await this.hasExtractedPayload(destinationPath)) return;
    } catch (error) {
      primaryError = error;
    }
    let recovered = await this.hasExtractedPayload(destinationPath);
    if (!recovered && isWindows) {
      recovered = await this.tryWindowsFallbacks({
        execute,
        archivePath,
        destinationPath,
        archiveFormat,
        portable7z,
      });
    } else if (!recovered) {
      recovered = await this.tryUnixFallbacks({
        execute,
        archivePath,
        destinationPath,
        archiveFormat,
      });
    }
    if (
      !recovered &&
      window.NL_OS === "Darwin" &&
      ["rar", "7z"].includes(archiveFormat)
    ) {
      throw new Error(
        `This ${archiveFormat.toUpperCase()} download cannot be unpacked by this version of macOS. Ask the mod author for a ZIP download.`,
      );
    }
    if (!recovered) {
      throw (
        primaryError ||
        new Error(
          "WeekBox could not extract the downloaded archive files to storage.",
        )
      );
    }
  }

  async extractDiskImage(archivePath, destinationPath, getTask, onEntry) {
    const mountPath = `${destinationPath}/.weekbox-dmg-${Date.now()}`;
    let attached = false;
    let processOutput = "";
    try {
      await Neutralino.filesystem.createDirectory(mountPath);
      const process = await this.spawnProcessWithShell(
        `hdiutil attach -nobrowse -readonly -mountpoint ${quoteCommandArgument(mountPath)} ${quoteCommandArgument(archivePath)}`,
      );
      const task = getTask();
      if (task) task.pid = this.getOsProcessId(process);
      await this.listenForProcess(
        process,
        getTask,
        (event, handler, resolve, reject) => {
          if (event.action === "stdOut" || event.action === "stdErr") {
            processOutput = this.appendProcessOutput(processOutput, event.data);
            return;
          }
          if (event.action !== "exit") return;
          Neutralino.events.off("spawnedProcess", handler);
          if (event.data === 0) resolve();
          else
            reject(
              this.createProcessError(
                "Mounting disk image",
                event.data,
                processOutput,
              ),
            );
        },
      );
      attached = true;
      const entries = await Neutralino.filesystem.readDirectory(mountPath);
      const app = entries.find(
        (entry) =>
          entry.type === "DIRECTORY" && /\.app$/i.test(String(entry.entry)),
      );
      if (!app)
        throw new Error("The disk image does not contain a macOS application");
      onEntry?.(app.entry);
      await Neutralino.filesystem.copy(
        `${mountPath}/${app.entry}`,
        `${destinationPath}/${app.entry}`,
        { recursive: true, overwrite: false },
      );
    } finally {
      if (attached) {
        const result = await Neutralino.os.execCommand(
          `hdiutil detach ${quoteCommandArgument(mountPath)}`,
          { background: false },
        );
        if (result.exitCode !== 0)
          console.warn("Could not detach WeekBox disk image:", result.stdErr);
      }
      await Neutralino.filesystem.remove(mountPath).catch(() => {});
    }
  }
}
