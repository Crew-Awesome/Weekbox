import { FS } from "../../utils/filesystem.js";
import {
  downloadArchive,
  extractArchive,
} from "../../utils/downloads/archiveTransfer.js";

export const downloadEngine = {
  activeTasks: new Map(),

  getTaskKey(engineId, version) {
    return `${engineId}:${version}`;
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

  // Función inteligente para buscar el ejecutable y subir todo su contenido a la raíz de {version}
  async flattenEngineDir(engineDir) {
    const exePath = await FS.findExecutable(engineDir);
    if (!exePath) return; // Si no hay ejecutable, la estructura se queda como está

    const executableDir = exePath
      .slice(0, Math.max(exePath.lastIndexOf("/"), exePath.lastIndexOf("\\")))
      .replace(/\\/g, "/");

    const normalizedEngineDir = engineDir.replace(/\\/g, "/");

    // Si el ejecutable está en una subcarpeta y no en la raíz
    if (
      executableDir !== normalizedEngineDir &&
      executableDir.startsWith(normalizedEngineDir)
    ) {
      try {
        const files = await Neutralino.filesystem.readDirectory(executableDir);
        for (const file of files) {
          if (file.entry === "." || file.entry === "..") continue;

          const fromPath = `${executableDir}/${file.entry}`;
          const toPath = `${normalizedEngineDir}/${file.entry}`;

          await Neutralino.filesystem.move(fromPath, toPath);
        }

        // Limpiar las subcarpetas vacías que quedaron después de mover los archivos
        const relativePart = executableDir.substring(
          normalizedEngineDir.length + 1,
        );
        const topSubDir = relativePart.split("/")[0];
        const dirToRemove = `${normalizedEngineDir}/${topSubDir}`;

        if (window.NL_OS === "Windows") {
          await Neutralino.os
            .execCommand(`rmdir /S /Q "${dirToRemove.replace(/\//g, "\\")}"`, {
              background: true,
            })
            .catch(() => {});
        } else {
          await Neutralino.os
            .execCommand(`rm -rf "${dirToRemove}"`, { background: true })
            .catch(() => {});
        }
      } catch (error) {
        console.warn("Could not organize engine folder:", error);
      }
    }
  },

  async install(engineId, version, downloadUrl, onProgress, onStateChange) {
    if (!FS.isInitialized) await FS.init();

    const enginesBasePath = FS.enginesPath;
    const engineDir = `${enginesBasePath}/${engineId}/${version}`;
    const tempFilePath = `${enginesBasePath}/temp_${engineId}_${version}.zip`;
    const taskKey = this.getTaskKey(engineId, version);

    if (this.activeTasks.has(taskKey)) return false;

    const task = {
      cancelled: false,
      pid: null,
      tempFilePath,
      engineDir,
      phase: "downloading",
      onStateChange,
    };
    this.activeTasks.set(taskKey, task);

    const updateProgress = (status, progress) => {
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
      updateProgress("Connecting...", 2);
      await downloadArchive({
        url: downloadUrl,
        outPath: tempFilePath,
        getTask: () => this.activeTasks.get(taskKey),
        onProgress: updateProgress,
      });

      task.phase = "extracting";
      this.notifyState(task, "installing");
      updateProgress("Installing...", 98);
      await extractArchive({
        archivePath: tempFilePath,
        destinationPath: engineDir,
        getTask: () => this.activeTasks.get(taskKey),
        onEntry: (file) => updateProgress(`Extracting: ${file}`, 98),
      });

      updateProgress("Organizing files...", 99);
      await this.flattenEngineDir(engineDir); // Usamos el nuevo método en lugar de flattenModFolder

      updateProgress("Cleaning temporary files...", 99);
      await FS.api.remove(tempFilePath).catch(() => {});
      await FS.api.remove(`${engineDir}/.downloading`).catch(() => {});

      const injectionResults = await FS.injectModsIntoEngine(engineId, version);
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
      if (!task.cancelled)
        console.error(`Error installing engine ${engineId}:`, error);

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
