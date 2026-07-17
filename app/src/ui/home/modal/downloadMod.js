import { FS } from "../../../utils/filesystem.js";
import { sanitizePathSegment } from "../../../utils/filesystem/pathUtils.js";
import {
  downloadArchive,
  extractArchive,
} from "../../../utils/downloads/archiveTransfer.js";
import { toastDownloadMod } from "./toastDownloadMod.js";
import { errorHandler } from "../../errors/errorHandler.js";

export const downloadMod = {
  activeTasks: new Map(),

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
      if (task.pid) {
        const os = window.NL_OS;
        if (os === "Windows") {
          Neutralino.os
            .execCommand(`taskkill /F /PID ${task.pid}`, { background: true })
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
    const sanitizedModName = sanitizePathSegment(modName);
    const targetModFolder = `${modsBasePath}/${sanitizedModName}`;
    const taskKey = String(modId).replace(/[^a-z0-9_-]/gi, "_");
    const tempFilePath = `${modsBasePath}/temp_${taskKey}.zip`;
    const downloadMarkerPath = `${targetModFolder}/.downloading`;

    this.activeTasks.set(modId, {
      cancelled: false,
      pid: null,
      tempFilePath,
      targetModFolder,
    });

    const { toastThumbnail, sourceType, ...installMetadata } = metadata;
    toastDownloadMod.show(modId, modName, () => this.cancel(modId), {
      iconHtml: toastThumbnail
        ? `<img class="toast-system-thumbnail" src="${toastThumbnail}" alt="" />`
        : undefined,
    });

    try {
      await FS.api.ensureDir(modsBasePath);
      await FS.api.ensureDir(targetModFolder);
      await FS.api.write(downloadMarkerPath, "");
      if (this.activeTasks.get(modId)?.cancelled) throw new Error("Cancelled");
      toastDownloadMod.update(modId, 2, "Connecting...");

      await downloadArchive({
        url: downloadUrl,
        sourceType,
        outPath: tempFilePath,
        getTask: () => this.activeTasks.get(modId),
        onProgress: (status, progress) => {
          toastDownloadMod.update(modId, progress, status);
        },
      });

      const archiveStats = await Neutralino.filesystem.getStats(tempFilePath);
      if (!archiveStats.size) throw new Error("Downloaded archive is empty");

      if (this.activeTasks.get(modId)?.cancelled) throw new Error("Cancelled");
      toastDownloadMod.update(modId, 98, "Extracting...");

      await extractArchive({
        archivePath: tempFilePath,
        destinationPath: targetModFolder,
        getTask: () => this.activeTasks.get(modId),
        onEntry: (file) => {
          toastDownloadMod.update(modId, 98, `Extracting - ${file}`);
        },
      });

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
            for (const ef of extractedFiles) {
              if (ef.entry !== "." && ef.entry !== "..") {
                await Neutralino.filesystem.move(
                  `${innerTempPath}/${ef.entry}`,
                  `${targetModFolder}/${ef.entry}`,
                );
              }
            }
            await FS.api.remove(innerTempPath).catch(() => {});
          }
        }
      }

      if (this.activeTasks.get(modId)?.cancelled) throw new Error("Cancelled");
      toastDownloadMod.update(modId, 99, "Flattening Folder...");

      let flattened = true;
      while (flattened) {
        flattened = false;
        const currentFiles =
          await Neutralino.filesystem.readDirectory(targetModFolder);
        const currentReal = currentFiles.filter(
          (f) =>
            f.entry !== "." && f.entry !== ".." && f.entry !== ".downloading",
        );

        if (currentReal.length === 1 && currentReal[0].type === "DIRECTORY") {
          flattened = true;
          const subDirName = currentReal[0].entry;
          const subDirPath = `${targetModFolder}/${subDirName}`;

          const subFiles =
            await Neutralino.filesystem.readDirectory(subDirPath);
          const realSubFiles = subFiles.filter(
            (f) => f.entry !== "." && f.entry !== "..",
          );

          // Stage entries outside the wrapper before removing it. This also
          // handles archives with repeated wrapper names (for example,
          // `Mod/Mod/...`) without trying to move a folder into itself.
          const flattenTempPath = `${targetModFolder}/.flatten_${taskKey}`;
          await FS.api.ensureDir(flattenTempPath);
          for (const sf of realSubFiles) {
            await Neutralino.filesystem.move(
              `${subDirPath}/${sf.entry}`,
              `${flattenTempPath}/${sf.entry}`,
            );
          }
          await Neutralino.filesystem.remove(subDirPath).catch(() => {});

          const stagedFiles =
            await Neutralino.filesystem.readDirectory(flattenTempPath);
          for (const sf of stagedFiles) {
            if (sf.entry !== "." && sf.entry !== "..") {
              await Neutralino.filesystem.move(
                `${flattenTempPath}/${sf.entry}`,
                `${targetModFolder}/${sf.entry}`,
              );
            }
          }
          await Neutralino.filesystem.remove(flattenTempPath).catch(() => {});
        }
      }

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
        folderName: sanitizedModName,
        ...installMetadata,
      });

      const injectionResults = await FS.injectModIntoInstalledEngines(modId);
      injectionResults
        .filter((result) => result.status === "rejected")
        .forEach((result) =>
          console.warn("Could not inject mod into engine:", result.reason),
        );

      if (this.activeTasks.get(modId)?.cancelled) throw new Error("Cancelled");
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
