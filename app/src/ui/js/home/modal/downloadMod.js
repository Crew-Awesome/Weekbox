import { FS } from "../../../../backend/services/filesystem.js";
import {
  sanitizeModFolderName,
  sanitizePathSegment,
} from "../../../../backend/services/filesystem/path.util.js";
import { gameBananaApi } from "../../../../backend/providers/gamebanana/gamebanana.provider.js";
import { primeModCover } from "../../mod-manager/modImageLoader.js";
import {
  downloadArchive,
  extractArchive,
} from "../../../../backend/services/downloads/archive-transfer.service.js";
import { toastDownloadMod } from "./toastDownloadMod.js";
import { errorHandler } from "../../errors/errorHandler.js";
import { t } from "../../i18n/index.js";

function setModalButtonState(btn, iconClass, text, disabled) {
  if (!btn) return;
  btn.disabled = disabled;
  const icon = document.createElement("i");
  icon.className = iconClass;
  btn.replaceChildren(icon, document.createTextNode(" " + text));
}

function getArchiveExtension(downloadUrl) {
  const lowerUrl = String(downloadUrl || "").toLowerCase();
  if (lowerUrl.includes(".rar")) return ".rar";
  if (lowerUrl.includes(".7z")) return ".7z";
  if (lowerUrl.includes(".tar.gz") || lowerUrl.includes(".tgz")) {
    return ".tar.gz";
  }
  return lowerUrl.includes(".tar") ? ".tar" : ".zip";
}

function assertInstallActive(service, modId) {
  if (service.activeTasks.get(modId)?.cancelled) throw new Error("Cancelled");
}

function isNestedArchive(entry) {
  const name = String(entry || "").toLowerCase();
  return [".zip", ".rar", ".7z", ".tar", ".gz"].some((extension) =>
    name.endsWith(extension),
  );
}

async function extractNestedInstallArchives(
  service,
  { modId, targetModFolder, modsBasePath },
) {
  const maxDepth = 10;
  let depth = 0;
  while (true) {
    const files = await Neutralino.filesystem.readDirectory(targetModFolder);
    const realFiles = files.filter(
      (file) =>
        file.entry !== "." &&
        file.entry !== ".." &&
        file.entry !== ".downloading",
    );
    const nestedFile =
      realFiles.length === 1 &&
      realFiles[0].type === "FILE" &&
      isNestedArchive(realFiles[0].entry)
        ? realFiles[0]
        : null;
    if (!nestedFile) return;
    depth += 1;
    if (depth > maxDepth) {
      throw new Error(
        "WeekBox found too many nested archives. The download may be invalid.",
      );
    }

    const innerZipPath = `${targetModFolder}/${nestedFile.entry}`;
    toastDownloadMod.update(modId, 98, t("downloads.extractingNested"));
    const innerTempPath = `${modsBasePath}/temp_inner_${modId}`;
    await FS.api.ensureDir(innerTempPath);
    await extractArchive({
      archivePath: innerZipPath,
      destinationPath: innerTempPath,
      getTask: () => service.activeTasks.get(modId),
      onEntry: (file) => {
        toastDownloadMod.update(
          modId,
          98,
          t("downloads.extractingNestedFile", { file }),
        );
      },
    });
    try {
      assertInstallActive(service, modId);
    } catch (error) {
      await FS.api.remove(innerTempPath).catch(() => {});
      throw error;
    }
    await FS.api.remove(innerZipPath).catch(() => {});
    const extractedFiles =
      await Neutralino.filesystem.readDirectory(innerTempPath);
    await service.moveEntries(extractedFiles, innerTempPath, targetModFolder);
    await FS.api.remove(innerTempPath).catch(() => {});
  }
}

async function prepareInstalledFolder(
  service,
  { modId, targetModFolder, modsBasePath, fallbackFolderName, taskKey },
) {
  toastDownloadMod.update(modId, 99, t("downloads.preparingFolder"));
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
  const engineFolderName = wrapper
    ? sanitizePathSegment(wrapper.entry) || fallbackFolderName
    : fallbackFolderName;
  const storageFolderName = wrapper
    ? `${sanitizeModFolderName(wrapper.entry, fallbackFolderName)}--${taskKey}`
    : `${fallbackFolderName}--${taskKey}`;
  const finalModFolder = `${modsBasePath}/${storageFolderName}`;
  const activeTask = service.activeTasks.get(modId);
  if (activeTask) activeTask.finalModFolder = finalModFolder;
  if (await FS.api.exists(finalModFolder)) {
    await FS.api.remove(finalModFolder).catch(() => {});
  }
  await new Promise((resolve) => setTimeout(resolve, 150));
  if (wrapper) {
    await FS.api.move(`${targetModFolder}/${wrapper.entry}`, finalModFolder);
  } else {
    await FS.api.ensureDir(finalModFolder);
    await service.moveEntries(realEntries, targetModFolder, finalModFolder);
  }
  await FS.api.remove(targetModFolder).catch(() => {});
  await FS.api.ensureDir(finalModFolder);
  const downloadMarkerPath = `${finalModFolder}/.downloading`;
  await FS.api.write(downloadMarkerPath, "1");
  if (activeTask) activeTask.targetModFolder = finalModFolder;
  return {
    targetModFolder: finalModFolder,
    finalModFolder,
    storageFolderName,
    engineFolderName,
    downloadMarkerPath,
  };
}

function markInstallModalComplete() {
  const modalBtn = document.getElementById("modal-download-btn");
  if (
    modalBtn &&
    document.getElementById("mod-modal")?.classList.contains("show")
  ) {
    setModalButtonState(
      modalBtn,
      "fa-solid fa-check",
      t("modModal.alreadyInstalled"),
      true,
    );
  }
}

async function finalizeInstall(
  service,
  {
    modId,
    modName,
    downloadUrl,
    engineId,
    installMetadata,
    targetModFolder,
    downloadMarkerPath,
    tempFilePath,
    storageFolderName,
    engineFolderName,
    coverUrlPromise,
  },
) {
  if (!(await service.hasExtractedFiles(targetModFolder))) {
    throw new Error(t("downloads.archiveEmpty"));
  }
  await FS.api.remove(downloadMarkerPath);
  await FS.api.write(`${targetModFolder}/mod_url.txt`, downloadUrl);
  await FS.saveInstalledMod(modId, modName, {
    engineId,
    folderName: storageFolderName,
    engineFolderName,
    ...installMetadata,
  });
  service.reportInstallProgress(
    modId,
    modName,
    t("downloads.preparingCover"),
    99,
  );
  const coverUrl = await coverUrlPromise.catch(() => null);
  const localCover = await service
    .cacheModCover(modId, coverUrl)
    .catch(() => null);
  primeModCover(modId, localCover);
  assertInstallActive(service, modId);
  const injectionResults = await FS.injectModIntoInstalledEngines(modId);
  injectionResults
    .filter((result) => result.status === "rejected")
    .forEach((result) =>
      console.warn("Could not inject mod into engine:", result.reason),
    );
  assertInstallActive(service, modId);
  service.reportInstallProgress(
    modId,
    modName,
    t("downloads.installed"),
    100,
    localCover,
  );
  await new Promise((resolve) => setTimeout(resolve, 320));
  service.reportInstallProgress(modId, modName, "complete", 100);
  document.dispatchEvent(new CustomEvent("mods-updated"));
  toastDownloadMod.success(modId);
  markInstallModalComplete();
  await FS.api.remove(tempFilePath);
  service.activeTasks.delete(modId);
  return true;
}

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

  /**
   * @fix 2026-08-05T03:31:10.964Z - Fix NE_FS_MOVEERR during mod entries move on Windows
   */
  // Keep extracted entry moves serial because concurrent Neutralino moves can fail on Windows.
  async moveEntries(entries, sourceDir, destinationDir) {
    const queue = entries.filter(
      (entry) => entry.entry !== "." && entry.entry !== "..",
    );
    await FS.api.ensureDir(destinationDir);
    for (const entry of queue) {
      await FS.api.move(
        `${sourceDir}/${entry.entry}`,
        `${destinationDir}/${entry.entry}`,
      );
    }
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
        this.cleanupData(
          modId,
          task.tempFilePath,
          task.targetModFolder,
          task.finalModFolder,
        );
        this.activeTasks.delete(modId);
        toastDownloadMod.hide(modId);
        const modalBtn = document.getElementById("modal-download-btn");
        if (
          modalBtn &&
          document.getElementById("mod-modal")?.classList.contains("show")
        ) {
          setModalButtonState(
            modalBtn,
            "fa-solid fa-download",
            t("common.download"),
            false,
          );
        }
      }, 600);
    }
  },

  async cleanupAll() {
    const tasks = [...this.activeTasks.entries()];
    for (const [modId, task] of tasks) {
      task.cancelled = true;
      if (task.pid) {
        try {
          if (window.NL_OS === "Windows") {
            await Neutralino.os
              .execCommand(`taskkill /T /F /PID ${task.pid}`)
              .catch(() => {});
          } else {
            await Neutralino.os
              .execCommand(`kill -9 ${task.pid}`)
              .catch(() => {});
          }
        } catch {}
      }
      try {
        await this.cleanupData(
          modId,
          task.tempFilePath,
          task.targetModFolder,
          task.finalModFolder,
        );
      } catch {}
    }
    this.activeTasks.clear();
  },

  /**
   * @fix 2026-08-05T03:32:55.361Z - Fix stale folder retention on failed installation
   */
  async cleanupData(
    modId,
    tempFilePath,
    targetModFolder,
    finalModFolder = null,
  ) {
    try {
      if (tempFilePath) await FS.api.remove(tempFilePath);
    } catch (error) {}
    try {
      if (targetModFolder) await FS.api.remove(targetModFolder);
    } catch (error) {}
    try {
      if (finalModFolder && finalModFolder !== targetModFolder) {
        await FS.api.remove(finalModFolder);
      }
    } catch (error) {}
    try {
      await FS.removeInstalledMod(modId);
    } catch (error) {}
  },

  /**
   * @fix 2026-08-05T03:47:55.251Z - Fix "This mod is already installed" unexpected error popup when mod is already installed
   */
  async install(modId, modName, downloadUrl, engineId = null, metadata = {}) {
    if (!FS.isInitialized) await FS.init();
    FS.assertStorageUnlocked();

    if (this.activeTasks.has(modId)) return false;

    if (await FS.isModInstalled(modId)) {
      this.reportInstallProgress(modId, modName, t("downloads.installed"), 100);
      toastDownloadMod.success(modId);
      const modalBtn = document.getElementById("modal-download-btn");
      if (
        modalBtn &&
        document.getElementById("mod-modal")?.classList.contains("show")
      ) {
        setModalButtonState(
          modalBtn,
          "fa-solid fa-check",
          t("modModal.alreadyInstalled"),
          true,
        );
      }
      return true;
    }

    const modsBasePath = FS.modsPath;
    const taskKey = String(modId).replace(/[^a-z0-9_-]/gi, "_");
    const fallbackFolderName = sanitizeModFolderName(modName, `Mod-${taskKey}`);
    let storageFolderName = `${fallbackFolderName}--${taskKey}`;
    let engineFolderName = fallbackFolderName;
    let targetModFolder = `${modsBasePath}/.extract_${taskKey}`;
    let finalModFolder = null;
    const archiveExt = getArchiveExtension(downloadUrl);
    const tempFilePath = `${modsBasePath}/temp_${taskKey}${archiveExt}`;
    let downloadMarkerPath = `${targetModFolder}/.downloading`;

    this.activeTasks.set(modId, {
      cancelled: false,
      pid: null,
      modName,
      tempFilePath,
      targetModFolder,
      finalModFolder,
    });

    const { toastThumbnail, sourceType, fileSize, ...installMetadata } =
      metadata;
    const coverUrlPromise = this.fetchModCoverUrl(
      modId,
      sourceType,
      toastThumbnail,
    );
    this.reportInstallProgress(modId, modName, t("downloads.downloading"), 2);
    toastDownloadMod.show(modId, modName, () => this.cancel(modId), {
      iconHtml: toastThumbnail
        ? `<img class="toast-system-thumbnail" src="${toastThumbnail}" alt="" />`
        : undefined,
    });

    try {
      await FS.api.ensureDir(modsBasePath);
      await FS.api.ensureDir(targetModFolder);
      await FS.api.write(downloadMarkerPath, "1");
      assertInstallActive(this, modId);
      toastDownloadMod.update(modId, 2, t("downloads.connecting"));

      const archiveStats = await downloadArchive({
        url: downloadUrl,
        sourceType,
        outPath: tempFilePath,
        expectedSize: fileSize,
        getTask: () => this.activeTasks.get(modId),
        onProgress: (status, progress) => {
          toastDownloadMod.update(modId, progress, status);
          this.reportInstallProgress(modId, modName, status, progress);
        },
      });

      if (!archiveStats.size) throw new Error("Downloaded archive is empty");

      assertInstallActive(this, modId);
      toastDownloadMod.update(modId, 98, t("downloads.extracting"));
      this.reportInstallProgress(modId, modName, t("downloads.installing"), 98);

      await extractArchive({
        archivePath: tempFilePath,
        destinationPath: targetModFolder,
        getTask: () => this.activeTasks.get(modId),
        onEntry: (file) => {
          if (file) {
            const entryText =
              t("engines.extractingFile", { file }) || `Extracting: ${file}`;
            toastDownloadMod.update(modId, 98, entryText);
            this.reportInstallProgress(modId, modName, entryText, 98);
          }
        },
      });

      assertInstallActive(this, modId);

      assertInstallActive(this, modId);
      await extractNestedInstallArchives(this, {
        modId,
        targetModFolder,
        modsBasePath,
      });
      assertInstallActive(this, modId);
      const prepared = await prepareInstalledFolder(this, {
        modId,
        targetModFolder,
        modsBasePath,
        fallbackFolderName,
        taskKey,
      });
      targetModFolder = prepared.targetModFolder;
      finalModFolder = prepared.finalModFolder;
      storageFolderName = prepared.storageFolderName;
      engineFolderName = prepared.engineFolderName;
      downloadMarkerPath = prepared.downloadMarkerPath;
      assertInstallActive(this, modId);
      toastDownloadMod.update(modId, 99, t("downloads.deletingTemp"));
      return await finalizeInstall(this, {
        modId,
        modName,
        downloadUrl,
        engineId,
        installMetadata,
        targetModFolder,
        downloadMarkerPath,
        tempFilePath,
        storageFolderName,
        engineFolderName,
        coverUrlPromise,
      });
    } catch (error) {
      this.reportInstallProgress(modId, modName, "cancelled", 0);
      if (error.message !== "Cancelled") {
        const task = this.activeTasks.get(modId);
        await this.cleanupData(
          modId,
          tempFilePath,
          targetModFolder,
          task?.finalModFolder || finalModFolder,
        );
        toastDownloadMod.error(
          modId,
          error.message || t("engines.installationFailed"),
        );
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
