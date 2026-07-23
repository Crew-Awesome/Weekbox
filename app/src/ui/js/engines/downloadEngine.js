import { FS } from "../../../utils/filesystem.js";
import {
  downloadArchive,
  extractArchive,
} from "../../../utils/downloads/archiveTransfer.js";
import { errorHandler } from "../errors/errorHandler.js";
import {
  describeExtractedFiles,
  flattenEngineDirectory,
} from "./engineInstallFiles.js";

export const downloadEngine = {
  activeTasks: new Map(),

  getTaskKey(engineId, version) {
    return `${engineId}:${version}`;
  },

  getActiveTask(engineId, version) {
    return this.activeTasks.get(this.getTaskKey(engineId, version)) || null;
  },

  async stopProcess(task) {
    if (!task?.pid) return;
    const command =
      window.NL_OS === "Windows"
        ? `taskkill /T /F /PID ${task.pid}`
        : `kill -TERM ${task.pid}`;
    try {
      await Neutralino.os.execCommand(command, { background: false });
    } catch (error) {
      console.warn("Could not stop engine install process:", error);
    }
  },

  notifyState(task, state) {
    task.state = state;
    task.onStateChange?.(state);
  },

  throwIfCancelled(task) {
    if (task?.cancelled) throw new Error("Cancelled");
  },

  async cleanupTask(task) {
    await this.stopProcess(task);

    await FS.api.remove(task.tempFilePath).catch(() => {});

    const vPath = task.engineDir;
    try {
      if (window.NL_OS === "Windows") {
        await Neutralino.os
          .execCommand(`rmdir /S /Q "${vPath.replace(/\//g, "\\")}"`, {
            background: true,
          })
          .catch(() => {});
      } else {
        await Neutralino.os
          .execCommand(`rm -rf "${vPath}"`, { background: true })
          .catch(() => {});
      }
    } catch (e) {}
  },

  async cancel(engineId, version) {
    const key = this.getTaskKey(engineId, version);
    const task = this.activeTasks.get(key);
    if (!task) return;
    task.cancelled = true;
    this.notifyState(task, "cancelled");
    await this.cleanupTask(task);
  },

  async cleanupAll() {
    await Promise.all(
      [...this.activeTasks.entries()].map(async ([key, task]) => {
        task.cancelled = true;
        await this.cleanupTask(task);
      }),
    );
  },

  async copyEngineDirectory(source, destination) {
    await Neutralino.filesystem.copy(source, destination, {
      recursive: true,
      overwrite: true,
    });
  },

  async flattenEngineDir(engineDir, isCancelled = () => false) {
    return flattenEngineDirectory({
      engineDir,
      findExecutable: FS.findExecutable.bind(FS),
      isCancelled,
    });
  },

  async describeExtractedFiles(directory, limit = 24) {
    return describeExtractedFiles({ directory, limit });
  },

  async install(engineId, version, downloadUrl, onProgress, onStateChange) {
    if (!FS.isInitialized) await FS.init();
    FS.assertStorageUnlocked();

    if (FS.isOneDriveStorage()) {
      throw new Error(
        "WeekBox storage is inside OneDrive. Choose a local folder outside OneDrive, such as C:\\WeekBoxData, before downloading engines.",
      );
    }

    const enginesBasePath = FS.enginesPath;
    const engineDir = `${enginesBasePath}/${engineId}/${version}`;
    const archiveExtension =
      window.NL_OS === "Darwin" && /\.dmg(?:$|[?#])/i.test(downloadUrl)
        ? ".dmg"
        : ".zip";
    const tempFilePath = `${enginesBasePath}/temp_${engineId}_${version}${archiveExtension}`;
    const taskKey = this.getTaskKey(engineId, version);

    if (this.activeTasks.has(taskKey)) return false;

    const task = {
      cancelled: false,
      pid: null,
      tempFilePath,
      engineDir,
      phase: "downloading",
      progressInfo: { status: "Preparing environment...", progress: 0 },
      onStateChange,
    };
    this.activeTasks.set(taskKey, task);

    const updateProgress = (status, progress) => {
      task.progressInfo = { status, progress };
      if (typeof onProgress === "function") {
        onProgress({ status, progress });
      }
    };

    try {
      this.notifyState(task, "downloading");
      updateProgress("Preparing environment...", 0);
      await FS.api.ensureDir(enginesBasePath);
      await FS.api.ensureDir(`${enginesBasePath}/${engineId}`);
      await FS.api.ensureDir(engineDir);

      await FS.api.write(`${engineDir}/.downloading`, "1");
      this.throwIfCancelled(task);
      updateProgress("Connecting...", 2);
      await downloadArchive({
        url: downloadUrl,
        outPath: tempFilePath,
        getTask: () => this.activeTasks.get(taskKey),
        onProgress: updateProgress,
      });
      this.throwIfCancelled(task);

      const archiveStats = await Neutralino.filesystem.getStats(tempFilePath);
      if (!archiveStats.size) {
        throw new Error("Download finished without creating an archive file");
      }

      task.phase = "extracting";
      this.notifyState(task, "installing");
      updateProgress("Download complete. Extracting archive...", 98);
      await extractArchive({
        archivePath: tempFilePath,
        destinationPath: engineDir,
        getTask: () => this.activeTasks.get(taskKey),
        onEntry: (file) => updateProgress(`Extracting: ${file}`, 98),
        extractNested: true,
      });
      this.throwIfCancelled(task);

      updateProgress("Extracted. Organizing engine files...", 99);
      await this.flattenEngineDir(engineDir, () => task.cancelled);
      this.throwIfCancelled(task);

      updateProgress("Checking for a runnable engine...", 99);
      const executablePath = await FS.findExecutable(engineDir);
      if (!executablePath) {
        const searchError = FS.getExecutableSearchError();
        if (searchError) {
          throw new Error(
            `WeekBox could not access the engine folder after extraction: ${searchError}`,
          );
        }
        const extractedFiles = await this.describeExtractedFiles(engineDir);
        throw new Error(
          `The downloaded archive does not contain a runnable engine. Extracted files: ${extractedFiles}`,
        );
      }

      // Zip/tar extraction on macOS/Linux does not preserve the executable
      // bit, so the engine (e.g. PsychEngine) cannot be launched until its
      // permissions are restored.
      if (window.NL_OS !== "Windows") {
        await Neutralino.os
          .execCommand(`chmod 755 "${executablePath}"`, { background: true })
          .catch(() => {});
      }
      this.throwIfCancelled(task);

      updateProgress("Cleaning temporary files...", 99);
      await FS.api.remove(tempFilePath).catch(() => {});
      await FS.api.remove(`${engineDir}/.downloading`).catch(() => {});
      this.throwIfCancelled(task);

      updateProgress("Setting up installed mods...", 99);
      const injectionResults = await FS.injectModsIntoEngine(engineId, version);
      this.throwIfCancelled(task);
      injectionResults
        .filter((result) => result.status === "rejected")
        .forEach((result) =>
          console.warn("Could not inject installed mod:", result.reason),
        );

      updateProgress("Completed", 100);
      this.notifyState(task, "completed");
      this.activeTasks.delete(taskKey);

      return true;
    } catch (error) {
      if (!task.cancelled) {
        console.error(`Error installing engine ${engineId}:`, error);
        errorHandler.show({
          error,
          action: "Install engine",
          item: engineId,
          version,
          storagePath: FS.weekboxPath,
        });
      }

      await FS.api.remove(tempFilePath).catch(() => {});

      try {
        if (window.NL_OS === "Windows") {
          await Neutralino.os.execCommand(
            `rmdir /S /Q "${engineDir.replace(/\//g, "\\")}"`,
            { background: true },
          );
        } else {
          await Neutralino.os.execCommand(`rm -rf "${engineDir}"`, {
            background: true,
          });
        }
      } catch (e) {}

      if (!task.cancelled) {
        this.notifyState(task, "error");
      }

      this.activeTasks.delete(taskKey);
      return false;
    }
  },

  async update(engineId, version, downloadUrl, onProgress, onStateChange) {
    const updateVersion = `.update-${Date.now()}`;
    const engineRoot = `${FS.enginesPath}/${engineId}`;
    const currentDir = `${engineRoot}/${version}`;
    const backupDir = `${engineRoot}/.previous-${Date.now()}`;
    const installed = await this.install(
      engineId,
      updateVersion,
      downloadUrl,
      onProgress,
      onStateChange,
    );
    if (!installed) return false;
    let backupReady = false;
    try {
      if (!(await FS.findExecutable(`${engineRoot}/${updateVersion}`))) {
        await FS.api.remove(`${engineRoot}/${updateVersion}`).catch(() => {});
        return false;
      }
      // Mod injection uses directory junctions on Windows. Neutralino cannot
      // reliably rename an engine directory while those junctions are inside it.
      await FS.cleanupEngineMods(engineId, version);
      await FS.cleanupEngineMods(engineId, updateVersion);
      await FS.api.remove(backupDir).catch(() => {});
      if (await FS.api.exists(currentDir)) {
        await this.copyEngineDirectory(currentDir, backupDir);
        backupReady = true;
        await FS.api.remove(currentDir);
      }
      await this.copyEngineDirectory(
        `${engineRoot}/${updateVersion}`,
        currentDir,
      );
      await FS.api.remove(`${engineRoot}/${updateVersion}`);
      await FS.api.remove(backupDir).catch(() => {});
      await FS.injectModsIntoEngine(engineId, version);
      return true;
    } catch (error) {
      await FS.api.remove(`${engineRoot}/${updateVersion}`).catch(() => {});
      if (backupReady && (await FS.api.exists(backupDir))) {
        await FS.api.remove(currentDir).catch(() => {});
        await this.copyEngineDirectory(backupDir, currentDir).catch(() => {});
      }
      if (await FS.api.exists(currentDir)) {
        await FS.injectModsIntoEngine(engineId, version).catch(() => {});
      }
      console.error("Could not replace engine update:", error);
      return false;
    }
  },
};
