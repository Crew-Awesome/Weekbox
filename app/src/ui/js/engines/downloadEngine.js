import { FS } from "../../../backend/services/filesystem.js";
import {
  downloadArchive,
  extractArchive,
} from "../../../backend/services/downloads/archive-transfer.service.js";
import { errorHandler } from "../errors/errorHandler.js";
import {
  describeExtractedFiles,
  flattenEngineDirectory,
} from "./engineInstallFiles.js";
import { t } from "../i18n/index.js";

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
    await FS.api.remove(task.stagingDir).catch(() => {});
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

  async replaceInstalledDirectory(task) {
    const { engineId, version, engineDir, stagingDir } = task;
    const engineRoot = `${FS.enginesPath}/${engineId}`;
    const safeVersion = String(version).replace(/[^a-z0-9._-]/gi, "_");
    const backupDir = `${engineRoot}/.previous-${safeVersion}-${Date.now()}`;

    // Junctions used for mod injection can prevent a Windows directory move.
    await FS.cleanupEngineMods(engineId, version).catch(() => {});
    if (await FS.api.exists(engineDir)) {
      await FS.api.move(engineDir, backupDir);
      task.backupDir = backupDir;
    }

    try {
      await FS.api.move(stagingDir, engineDir);
      task.committed = true;
    } catch (error) {
      await FS.api.remove(engineDir).catch(() => {});
      if (task.backupDir && (await FS.api.exists(task.backupDir))) {
        await FS.api.move(task.backupDir, engineDir).catch(() => {});
      }
      task.backupDir = null;
      throw error;
    }
  },

  async install(
    engineId,
    version,
    downloadUrl,
    onProgress,
    onStateChange,
    { expectedSize = 0 } = {},
  ) {
    if (!FS.isInitialized) await FS.init();
    FS.assertStorageUnlocked();

    if (FS.isOneDriveStorage()) {
      throw new Error(
        "WeekBox storage is inside OneDrive. Choose a local folder outside OneDrive, such as C:\\WeekBox, before downloading engines.",
      );
    }

    const enginesBasePath = FS.enginesPath;
    const engineDir = `${enginesBasePath}/${engineId}/${version}`;
    if (FS.isEngineRunning(engineId, version)) {
      throw new Error("Close the engine before reinstalling this version.");
    }
    const archiveExtension =
      window.NL_OS === "Darwin" && /\.dmg(?:$|[?#])/i.test(downloadUrl)
        ? ".dmg"
        : ".zip";
    const safeVersion = String(version).replace(/[^a-z0-9._-]/gi, "_");
    const taskId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const stagingDir = `${enginesBasePath}/${engineId}/.install-${safeVersion}-${taskId}`;
    const tempFilePath = `${enginesBasePath}/.temp-${engineId}-${safeVersion}-${taskId}${archiveExtension}`;
    const taskKey = this.getTaskKey(engineId, version);

    if (this.activeTasks.has(taskKey)) return false;

    const task = {
      cancelled: false,
      pid: null,
      tempFilePath,
      engineDir,
      stagingDir,
      progressInfo: { status: t("engines.preparingEnvironment"), progress: 0 },
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
      updateProgress(t("engines.preparingEnvironment"), 0);
      await FS.api.ensureDir(enginesBasePath);
      await FS.api.ensureDir(`${enginesBasePath}/${engineId}`);
      await FS.api.ensureDir(stagingDir);

      await FS.api.write(`${stagingDir}/.downloading`, "1");
      this.throwIfCancelled(task);
      updateProgress(t("downloads.connecting"), 2);
      const archiveStats = await downloadArchive({
        url: downloadUrl,
        outPath: tempFilePath,
        expectedSize,
        getTask: () => this.activeTasks.get(taskKey),
        onProgress: updateProgress,
      });
      this.throwIfCancelled(task);

      if (!archiveStats.size) {
        throw new Error("Download finished without creating an archive file");
      }

      this.notifyState(task, "installing");
      updateProgress(t("engines.downloadCompleteExtracting"), 98);
      await extractArchive({
        archivePath: tempFilePath,
        destinationPath: stagingDir,
        getTask: () => this.activeTasks.get(taskKey),
        onEntry: (file) =>
          updateProgress(t("engines.extractingFile", { file }), 98),
        extractNested: true,
      });
      this.throwIfCancelled(task);

      updateProgress(t("engines.organizingFiles"), 99);
      await this.flattenEngineDir(stagingDir, () => task.cancelled);
      this.throwIfCancelled(task);

      updateProgress(t("engines.checkingRunnable"), 99);
      const executablePath = await FS.findExecutable(stagingDir);
      if (!executablePath) {
        const searchError = FS.getExecutableSearchError();
        if (searchError) {
          throw new Error(
            `WeekBox could not access the engine folder after extraction: ${searchError}`,
          );
        }
        const extractedFiles = await this.describeExtractedFiles(stagingDir);
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

      updateProgress(t("engines.cleaningTemporaryFiles"), 99);
      await FS.api.remove(tempFilePath).catch(() => {});
      await FS.api.remove(`${stagingDir}/.downloading`).catch(() => {});
      this.throwIfCancelled(task);

      updateProgress(t("engines.settingUpMods"), 99);
      await this.replaceInstalledDirectory(task);
      const injectionResults = await FS.injectModsIntoEngine(engineId, version);
      this.throwIfCancelled(task);
      injectionResults
        .filter((result) => result.status === "rejected")
        .forEach((result) =>
          console.warn("Could not inject installed mod:", result.reason),
        );

      updateProgress(t("engines.completed"), 100);
      this.notifyState(task, "completed");
      await FS.api.remove(task.backupDir).catch(() => {});
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

      if (!task.committed) await FS.api.remove(stagingDir).catch(() => {});

      if (!task.cancelled) {
        this.notifyState(task, "error");
      }

      if (task.committed) await FS.api.remove(task.backupDir).catch(() => {});

      this.activeTasks.delete(taskKey);
      return false;
    }
  },

  async update(
    engineId,
    version,
    downloadUrl,
    onProgress,
    onStateChange,
    options,
  ) {
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
      options,
    );
    if (!installed) return false;
    let backupReady = false;
    try {
      if (!(await FS.findExecutable(`${engineRoot}/${updateVersion}`))) {
        await FS.api.remove(`${engineRoot}/${updateVersion}`).catch(() => {});
        return false;
      }
      // Mod injection uses directory junctions on Windows. Neutralino cannot

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
