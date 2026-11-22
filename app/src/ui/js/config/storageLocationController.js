import { FS } from "../../../backend/services/filesystem/index.js";
import { downloadEngine } from "../engines/downloadEngine.js";
import { downloadMod } from "../home/modal/downloadMod.js";
import { t } from "../i18n/index.js";
import { storageMoveFeedback } from "./storageMoveFeedback.js";
import { existingStorageModal } from "../existingStorageModal.js";
async function formatStoragePath(path) {
  const value = String(path || "");
  if (window.NL_OS !== "Windows") return value;
  try {
    return await Neutralino.filesystem.getUnnormalizedPath(value);
  } catch {
    return value;
  }
}

async function isSameStoragePath(left, right) {
  const normalise = async (path) => {
    const value = String(path || "");
    try {
      return (await Neutralino.filesystem.getNormalizedPath(value))
        .replace(/[\\/]+$/, "")
        .toLowerCase();
    } catch {
      return value.replace(/[\\/]+$/, "").toLowerCase();
    }
  };
  const [normalisedLeft, normalisedRight] = await Promise.all([
    normalise(left),
    normalise(right),
  ]);
  return normalisedLeft === normalisedRight;
}

export class StorageLocationController {
  constructor({ updateStorageLocationLabel }) {
    this.updateStorageLocationLabel = updateStorageLocationLabel;
  }

  formatStoragePath(path) {
    return formatStoragePath(path);
  }

  async openStorageLocation() {
    if (!FS.weekboxPath) return;
    await Neutralino.os.open(FS.weekboxPath).catch((error) => {
      console.warn("Could not open the WeekBox storage folder", error);
    });
  }
  hasActiveDownloads() {
    return (
      downloadEngine.activeTasks.size > 0 || downloadMod.activeTasks.size > 0
    );
  }
  async runStorageMove(
    destination,
    buttons = [],
    { destinationIsResolved = false } = {},
  ) {
    const resolvedDestination = destinationIsResolved
      ? destination
      : FS.getStorageDestinationPath(destination);
    buttons.filter(Boolean).forEach((button) => {
      button.disabled = true;
    });
    storageMoveFeedback.show({
      destination: resolvedDestination,
      onCancel: () => FS.cancelStorageMove(),
    });
    try {
      await FS.moveStorageTo(
        resolvedDestination,
        (progress) => storageMoveFeedback.update(progress),
        { destinationIsResolved: true },
      );
      this.updateStorageLocationLabel();
      storageMoveFeedback.complete();
      return true;
    } catch (error) {
      if (error?.code === "STORAGE_MOVE_CANCELLED") {
        storageMoveFeedback.cancelled();
        return false;
      }
      console.error("Could not move WeekBox storage", error);
      storageMoveFeedback.fail(
        error?.message || t("storage.moveFailedMessage"),
      );
      return false;
    } finally {
      buttons.filter(Boolean).forEach((button) => {
        button.disabled = false;
      });
    }
  }
  async chooseStorageLocation() {
    if (FS.hasRunningProcesses() || this.hasActiveDownloads()) {
      await storageMoveFeedback.showNotice({
        title: t("storage.cannotMoveTitle"),
        message: t("storage.cannotMoveMessage"),
      });
      return;
    }

    const button = document.getElementById("choose-storage-location");
    try {
      const selectedPath = await Neutralino.os.showFolderDialog(
        t("common.chooseFolder"),
        { defaultPath: FS.basePath },
      );
      if (!selectedPath) return;
      const destination = FS.getStorageDestinationPath(selectedPath);
      if (
        (await isSameStoragePath(destination, FS.basePath)) ||
        (await isSameStoragePath(destination, FS.weekboxPath))
      ) {
        await storageMoveFeedback.showNotice({
          title: t("storage.alreadyUsingTitle"),
          message: t("storage.alreadyUsingMessage"),
        });
        return;
      }
      const existingStorage = await FS.findExistingStorage(selectedPath);
      if (existingStorage) {
        const choice = await existingStorageModal.show({
          ...existingStorage,
          weekboxPath: await formatStoragePath(existingStorage.weekboxPath),
        });
        if (choice === "replace") {
          button.disabled = true;
          button.innerHTML = `<i class="fa-solid fa-folder-open"></i> ${t("storage.movingFiles")}`;
          await FS.removeExistingStorage(existingStorage.basePath);
          await this.runStorageMove(existingStorage.basePath, [button], {
            destinationIsResolved: true,
          });
          return;
        }
        if (choice !== "use") return;

        button.disabled = true;
        button.innerHTML = `<i class="fa-solid fa-folder-open"></i> ${t("storage.switchingLibrary")}`;
        await FS.useExistingStorage(existingStorage.basePath);
        location.reload();
        return;
      }
      if (await FS.hasStorageFolder(selectedPath)) {
        await storageMoveFeedback.showNotice({
          title: t("storage.destinationNotEmptyTitle"),
          message: t("storage.destinationNotEmpty"),
        });
        return;
      }
      const confirmed = await storageMoveFeedback.showMoveConfirmation({
        destination: await formatStoragePath(destination),
      });
      if (!confirmed) return;

      if (FS.hasRunningProcesses() || this.hasActiveDownloads()) {
        throw new Error(t("storage.cannotMoveMessage"));
      }

      button.innerHTML = `<i class="fa-solid fa-folder-open"></i> ${t("storage.movingFiles")}`;
      await this.runStorageMove(destination, [button], {
        destinationIsResolved: true,
      });
    } catch (error) {
      console.error("Could not move WeekBox storage", error);
      await storageMoveFeedback.showNotice({
        title: t("storage.moveFailedTitle"),
        message: error?.message || t("storage.unexpectedMoveError"),
      });
    } finally {
      if (button) {
        button.innerHTML = `<i class="fa-solid fa-folder-open"></i> ${t("common.chooseFolder")}`;
      }
    }
  }
  async useDefaultStorageLocation() {
    if (FS.hasRunningProcesses() || this.hasActiveDownloads()) {
      await storageMoveFeedback.showNotice({
        title: t("storage.cannotMoveTitle"),
        message: t("storage.cannotMoveMessage"),
      });
      return;
    }

    const button = document.getElementById("use-default-storage-location");
    const chooseButton = document.getElementById("choose-storage-location");
    try {
      const defaultPath = await FS.getDefaultStoragePath();
      const destination = FS.getStorageDestinationPath(defaultPath);
      if (await isSameStoragePath(destination, FS.basePath)) {
        await storageMoveFeedback.showNotice({
          title: t("storage.alreadyUsingTitle"),
          message: t("storage.alreadyUsingMessage"),
        });
        return;
      }
      const existingStorage = await FS.findExistingStorage(defaultPath);
      if (existingStorage) {
        const choice = await existingStorageModal.show({
          ...existingStorage,
          weekboxPath: await formatStoragePath(existingStorage.weekboxPath),
        });
        if (choice === "replace") {
          button.disabled = true;
          chooseButton.disabled = true;
          button.innerHTML = `<i class="fa-solid fa-folder-open"></i> ${t("storage.movingFiles")}`;
          await FS.removeExistingStorage(existingStorage.basePath);
          await this.runStorageMove(
            existingStorage.basePath,
            [button, chooseButton],
            { destinationIsResolved: true },
          );
          return;
        }
        if (choice === "use") {
          button.disabled = true;
          chooseButton.disabled = true;
          button.innerHTML = `<i class="fa-solid fa-folder-open"></i> ${t("storage.switchingLibrary")}`;
          await FS.useExistingStorage(existingStorage.basePath);
          location.reload();
        }
        return;
      }
      if (await FS.hasStorageFolder(defaultPath)) {
        await storageMoveFeedback.showNotice({
          title: t("storage.destinationNotEmptyTitle"),
          message: t("storage.destinationNotEmpty"),
        });
        return;
      }
      const confirmed = await storageMoveFeedback.showMoveConfirmation({
        destination: await formatStoragePath(destination),
      });
      if (!confirmed) return;

      button.disabled = true;
      chooseButton.disabled = true;
      button.innerHTML = `<i class="fa-solid fa-folder-open"></i> ${t("storage.movingFiles")}`;
      await this.runStorageMove(destination, [button, chooseButton], {
        destinationIsResolved: true,
      });
    } catch (error) {
      console.error("Could not use the default WeekBox storage", error);
      await storageMoveFeedback.showNotice({
        title: t("storage.moveFailedTitle"),
        message: error?.message || t("storage.unexpectedMoveError"),
      });
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = t("common.useDefault");
      }
      if (chooseButton) chooseButton.disabled = false;
    }
  }
}
