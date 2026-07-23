import { FS } from "../../../../utils/filesystem.js";
import {
  sanitizeModFolderName,
  sanitizePathSegment,
} from "../../../../utils/filesystem/pathUtils.js";
import { gameBananaApi } from "../../../../backend/api/gamebanana.js";
import { primeModCover } from "../../mod-manager/modImageLoader.js";
import {
  downloadArchive,
  extractArchive,
} from "../../../../utils/downloads/archiveTransfer.js";
import { toastDownloadMod } from "./toastDownloadMod.js";
import { errorHandler } from "../../errors/errorHandler.js";

export const downloadMod = {
  activeTasks: new Map(),

  reportInstallProgress(modId, modName, status, progress, coverUrl = null) {
    document.dispatchEvent(
      new CustomEvent("mod-install-progress", {
        detail: { modId, modName, status, progress, coverUrl },
      }),
    );
  },

  async fetchModCoverUrl(modId, sourceType, fallbackCoverUrl = null) {
    const source = String(modId).match(/^(mod|tool):(\d+)$/);
    const type =
      sourceType === "tool" || source?.[1] === "tool" ? "tool" : "mod";
    const sourceId = source?.[2] || modId;
    const details =
      type === "tool"
        ? await gameBananaApi.getToolDetails(sourceId).catch(() => null)
        : await gameBananaApi
            .getModDetails(sourceId, { includeRequirements: false })
            .catch(() => null);
    const imageUrl =
      (type === "tool" ? details?.thumbnail : details?.images?.[0]) ||
      fallbackCoverUrl;
    if (!imageUrl || imageUrl === "assets/icons/launcher-icon.png") return null;

    const preload = new Image();
    preload.src = imageUrl;
    return imageUrl;
  },

  async cacheModCover(modId, coverUrl) {
    return FS.ensureModCover(modId, async () => coverUrl);
  },

  async moveEntries(entries, sourceDir, destinationDir, concurrency = 8) {
    const queue = entries.filter(
      (entry) => entry.entry !== "." && entry.entry !== "..",
    );
    let nextIndex = 0;
    const worker = async () => {
      while (nextIndex < queue.length) {
        const entry = queue[nextIndex];
        nextIndex += 1;
        await Neutralino.filesystem.move(
          `${sourceDir}/${entry.entry}`,
          `${destinationDir}/${entry.entry}`,
        );
      }
    };

    await Promise.all(
      Array.from({ length: Math.min(concurrency, queue.length) }, worker),
    );
  },

  async hasExtractedFiles(path) {
    const entries = await Neutralino.filesystem.readDirectory(path);
    for (const entry of entries) {
      if (
        entry.entry === "." ||
        entry.entry === ".." ||
        entry.entry === ".downloading"
      ) {
        continue;
      }
      if (entry.type === "FILE") return true;
      if (
        entry.type === "DIRECTORY" &&
        (await this.hasExtractedFiles(`${path}/${entry.entry}`))
      ) {
        return true;
      }
    }
    return false;
  },

  cancel(modId) {
    const task = this.activeTasks.get(modId);
    if (task) {
      task.cancelled = true;
      this.reportInstallProgress(modId, task.modName, "cancelled", 0);
      if (task.pid) {
        const os = window.NL_OS;
        if (os === "Windows") {
          Neutralino.os
            .execCommand(`taskkill /T /F /PID ${task.pid}`, {
              background: true,
            })
            .catch(() => {});
        } else {
          Neutralino.os
            .execCommand(`kill -9 ${task.pid}`, { background: true })
            .catch(() => {});
        }
      }
      toastDownloadMod.cancelAnim(modId);
      setTimeout(() => {
        this.cleanupData(modId, task.tempFilePath, task.targetModFolder);
        this.activeTasks.delete(modId);
        toastDownloadMod.hide(modId);
        const modalBtn = document.getElementById("modal-download-btn");
        if (
          modalBtn &&
          document.getElementById("mod-modal").classList.contains("show")
        ) {
          modalBtn.disabled = false;
          modalBtn.innerHTML = '<i class="fa-solid fa-download"></i> Download';
        }
      }, 600);
    }
  },

  async cleanupData(modId, tempFilePath, targetModFolder) {
    try {
      if (tempFilePath) await FS.api.remove(tempFilePath);
    } catch (error) {}
    try {
      if (targetModFolder) await FS.api.remove(targetModFolder);
    } catch (error) {}
    try {
      await FS.removeInstalledMod(modId);
    } catch (error) {}
  },

  async install(modId, modName, downloadUrl, engineId = null, metadata = {}) {
    if (!FS.isInitialized) await FS.init();
    FS.assertStorageUnlocked();
    const modsBasePath = FS.modsPath;
    const taskKey = String(modId).replace(/[^a-z0-9_-]/gi, "_");
    const fallbackFolderName = sanitizeModFolderName(modName, `Mod-${taskKey}`);
    let storageFolderName = `${fallbackFolderName}--${taskKey}`;
    let engineFolderName = fallbackFolderName;
    let targetModFolder = `${modsBasePath}/.extract_${taskKey}`;
    const tempFilePath = `${modsBasePath}/temp_${taskKey}.zip`;
    let downloadMarkerPath = `${targetModFolder}/.downloading`;

    this.activeTasks.set(modId, {
      cancelled: false,
      pid: null,
      modName,
      tempFilePath,
      targetModFolder,
    });

    const { toastThumbnail, sourceType, ...installMetadata } = metadata;
    const coverUrlPromise = this.fetchModCoverUrl(
      modId,
      sourceType,
      toastThumbnail,
    );
    this.reportInstallProgress(modId, modName, "Downloading...", 2);
    toastDownloadMod.show(modId, modName, () => this.cancel(modId), {
      iconHtml: toastThumbnail
        ? `<img class="toast-system-thumbnail" src="${toastThumbnail}" alt="" />`
        : undefined,
    });

    try {
      await FS.api.ensureDir(modsBasePath);
      await FS.api.ensureDir(targetModFolder);
      await FS.api.write(downloadMarkerPath, "1");
      if (this.activeTasks.get(modId)?.cancelled) throw new Error("Cancelled");
      toastDownloadMod.update(modId, 2, "Connecting...");

      await downloadArchive({
        url: downloadUrl,
        sourceType,
        outPath: tempFilePath,
        getTask: () => this.activeTasks.get(modId),
        onProgress: (status, progress) => {
          toastDownloadMod.update(modId, progress, status);
          this.reportInstallProgress(modId, modName, status, progress);
        },
      });

      const archiveStats = await Neutralino.filesystem.getStats(tempFilePath);
      if (!archiveStats.size) throw new Error("Downloaded archive is empty");

      if (this.activeTasks.get(modId)?.cancelled) throw new Error("Cancelled");
      toastDownloadMod.update(modId, 98, "Extracting...");
      this.reportInstallProgress(modId, modName, "Installing...", 98);
      const extractionStartedAt = performance.now();
      const extractionStatusTimer = setInterval(() => {
        const elapsedSeconds = Math.floor(
          (performance.now() - extractionStartedAt) / 1000,
        );
        toastDownloadMod.update(modId, 98, `Extracting... ${elapsedSeconds}s`);
        this.reportInstallProgress(modId, modName, "Installing...", 98);
      }, 2000);

      try {
        await extractArchive({
          archivePath: tempFilePath,
          destinationPath: targetModFolder,
          getTask: () => this.activeTasks.get(modId),
        });
      } finally {
        clearInterval(extractionStatusTimer);
      }

      if (this.activeTasks.get(modId)?.cancelled) throw new Error("Cancelled");

      let hasNestedArchive = true;
      while (hasNestedArchive) {
        hasNestedArchive = false;
        const files =
          await Neutralino.filesystem.readDirectory(targetModFolder);
        const realFiles = files.filter(
          (f) =>
            f.entry !== "." && f.entry !== ".." && f.entry !== ".downloading",
        );

        if (realFiles.length === 1 && realFiles[0].type === "FILE") {
          const entryName = realFiles[0].entry.toLowerCase();
          if (
            entryName.endsWith(".zip") ||
            entryName.endsWith(".rar") ||
            entryName.endsWith(".7z") ||
            entryName.endsWith(".tar") ||
            entryName.endsWith(".gz")
          ) {
            hasNestedArchive = true;
            const innerZipPath = `${targetModFolder}/${realFiles[0].entry}`;
            toastDownloadMod.update(modId, 98, "Extracting nested archive...");

            const innerTempPath = `${modsBasePath}/temp_inner_${modId}`;
            await FS.api.ensureDir(innerTempPath);

            await extractArchive({
              archivePath: innerZipPath,
              destinationPath: innerTempPath,
              getTask: () => this.activeTasks.get(modId),
              onEntry: (file) => {
                toastDownloadMod.update(
                  modId,
                  98,
                  `Extracting nested - ${file}`,
                );
              },
            });

            if (this.activeTasks.get(modId)?.cancelled) {
              await FS.api.remove(innerTempPath).catch(() => {});
              throw new Error("Cancelled");
            }

            await FS.api.remove(innerZipPath).catch(() => {});

            const extractedFiles =
              await Neutralino.filesystem.readDirectory(innerTempPath);
            await this.moveEntries(
              extractedFiles,
              innerTempPath,
              targetModFolder,
            );
            await FS.api.remove(innerTempPath).catch(() => {});
          }
        }
      }

      if (this.activeTasks.get(modId)?.cancelled) throw new Error("Cancelled");
      toastDownloadMod.update(modId, 99, "Preparing mod folder...");
      const extractedEntries =
        await Neutralino.filesystem.readDirectory(targetModFolder);
      const realEntries = extractedEntries.filter(
        (entry) =>
          entry.entry !== "." &&
          entry.entry !== ".." &&
          entry.entry !== ".downloading",
      );
      const wrapper =
        realEntries.length === 1 && realEntries[0].type === "DIRECTORY"
          ? realEntries[0]
          : null;

      if (wrapper) {
        engineFolderName =
          sanitizePathSegment(wrapper.entry) || fallbackFolderName;
        storageFolderName = `${sanitizeModFolderName(wrapper.entry, fallbackFolderName)}--${taskKey}`;
      }

      const stagingFolder = targetModFolder;
      const finalModFolder = `${modsBasePath}/${storageFolderName}`;
      if (await FS.api.exists(finalModFolder)) {
        throw new Error("This mod is already installed");
      }
      if (wrapper) {
        await Neutralino.filesystem.move(
          `${stagingFolder}/${wrapper.entry}`,
          finalModFolder,
        );
      } else {
        await FS.api.ensureDir(finalModFolder);
        await this.moveEntries(realEntries, stagingFolder, finalModFolder);
      }
      await FS.api.remove(stagingFolder).catch(() => {});
      targetModFolder = finalModFolder;
      downloadMarkerPath = `${targetModFolder}/.downloading`;
      const activeTask = this.activeTasks.get(modId);
      if (activeTask) activeTask.targetModFolder = targetModFolder;
      await FS.api.ensureDir(targetModFolder);
      await FS.api.write(downloadMarkerPath, "1");

      if (this.activeTasks.get(modId)?.cancelled) throw new Error("Cancelled");
      toastDownloadMod.update(modId, 99, "Deleting temp Zip...");
      await FS.api.remove(tempFilePath);

      const hasExtractedFiles = await this.hasExtractedFiles(targetModFolder);
      if (!hasExtractedFiles) {
        throw new Error("Downloaded archive did not contain any files");
      }
      await FS.api.remove(downloadMarkerPath);
      await FS.api.write(`${targetModFolder}/mod_url.txt`, downloadUrl);

      await FS.saveInstalledMod(modId, modName, {
        engineId,
        folderName: storageFolderName,
        engineFolderName,
        ...installMetadata,
      });

      this.reportInstallProgress(modId, modName, "Preparing cover...", 99);
      const coverUrl = await coverUrlPromise.catch(() => null);
      const localCover = await this.cacheModCover(modId, coverUrl).catch(
        () => null,
      );
      primeModCover(modId, localCover);
      if (this.activeTasks.get(modId)?.cancelled) throw new Error("Cancelled");

      const injectionResults = await FS.injectModIntoInstalledEngines(modId);
      injectionResults
        .filter((result) => result.status === "rejected")
        .forEach((result) =>
          console.warn("Could not inject mod into engine:", result.reason),
        );

      if (this.activeTasks.get(modId)?.cancelled) throw new Error("Cancelled");
      this.reportInstallProgress(modId, modName, "Installed", 100, localCover);
      await new Promise((resolve) => setTimeout(resolve, 320));
      this.reportInstallProgress(modId, modName, "complete", 100);
      document.dispatchEvent(new CustomEvent("mods-updated"));
      toastDownloadMod.success(modId);

      const modalBtn = document.getElementById("modal-download-btn");
      if (
        modalBtn &&
        document.getElementById("mod-modal").classList.contains("show")
      ) {
        modalBtn.disabled = true;
        modalBtn.innerHTML =
          '<i class="fa-solid fa-check"></i> Already Installed';
      }
      this.activeTasks.delete(modId);
      return true;
    } catch (error) {
      this.reportInstallProgress(modId, modName, "cancelled", 0);
      if (error.message !== "Cancelled") {
        await this.cleanupData(modId, tempFilePath, targetModFolder);
        toastDownloadMod.error(modId, error.message || "Installation failed");
        errorHandler.show({
          error,
          action: "Install mod",
          item: modName,
          storagePath: FS.weekboxPath,
        });
        this.activeTasks.delete(modId);
      }
      return false;
    }
  },
};
