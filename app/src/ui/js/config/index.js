import { appSettings } from "../../../backend/core/system/settings.service.js";
import { FS } from "../../../backend/services/filesystem.js";
import { setupDropdown } from "../../utils/components/dropdown.component.js";
import { downloadEngine } from "../engines/downloadEngine.js";
import { downloadMod } from "../home/modal/downloadMod.js";
import { appUpdater } from "../../../backend/core/updates/app-updater.service.js";
import { toastSystem } from "../toasts/toastSystem.js";
import { AppUpdateController } from "./appUpdateController.js";
import { StorageMoveFeedback } from "./storageMoveFeedback.js";
import { existingStorageModal } from "../existingStorageModal.js";
import { networkStatus } from "../../../backend/core/system/network-status.service.js";
import { syncWindowsProtocolRegistration } from "../../../backend/core/system/windows-protocol.util.js";
import { sidebar } from "../sidebar.js";
import { i18n, t } from "../i18n/index.js";

const appUpdates = new AppUpdateController(appUpdater);
const storageMoveFeedback = new StorageMoveFeedback(toastSystem);

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

export const configModal = {
  async init() {
    if (!document.getElementById("config-modal")) {
      const tpl = document.getElementById("tpl-config-modal");
      if (!tpl) return;

      const html = tpl.innerHTML;
      const wrapper = document.createElement("div");
      wrapper.innerHTML = html;
      document.body.appendChild(wrapper.firstElementChild);
      i18n.apply(document.getElementById("config-modal"));

      if (window.NL_OS !== "Windows") {
        document
          .getElementById("setting-registerProtocolLinks")
          ?.closest(".setting-item")
          ?.remove();
      }

      this.bindEvents();
      this.updateNetworkAvailability();
      networkStatus.addEventListener("change", () =>
        this.updateNetworkAvailability(),
      );
    }
  },

  bindEvents() {
    document
      .getElementById("config-close-btn")
      .addEventListener("click", () => this.close());
    document.getElementById("config-modal").addEventListener("click", (e) => {
      if (e.target.id === "config-modal") this.close();
    });
    document.querySelectorAll("#config-modal a[href]").forEach((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        Neutralino.os.open(link.href).catch(() => {});
      });
    });
    document
      .getElementById("choose-storage-location")
      ?.addEventListener("click", () => this.chooseStorageLocation());

    document
      .getElementById("use-default-storage-location")
      ?.addEventListener("click", () => this.useDefaultStorageLocation());

    document
      .getElementById("cleanup-incomplete-downloads")
      ?.addEventListener("click", () => this.cleanupIncompleteDownloads());

    document
      .getElementById("setting-language")
      ?.addEventListener("change", (event) => {
        i18n.setLocale(event.target.value);
        this.syncLanguageDropdown(i18n.locale);
        i18n.apply(document.getElementById("config-modal"));
      });

    const language = document.getElementById("setting-language");
    const languageDropdown = document.getElementById(
      "setting-language-dropdown",
    );
    const languageTrigger = document.getElementById("setting-language-trigger");
    const languageOptions = document.getElementById("setting-language-options");
    this.languageDropdownController = setupDropdown(
      languageTrigger,
      languageDropdown,
      { menuElement: languageOptions },
    );
    languageOptions?.addEventListener("click", (event) => {
      const option = event.target.closest("[data-language]");
      if (!option || !languageOptions.contains(option) || !language) return;
      language.value = option.dataset.language;
      language.dispatchEvent(new Event("change", { bubbles: true }));
      this.languageDropdownController?.close();
    });

    document
      .getElementById("storage-location-path")
      ?.addEventListener("click", () => this.openStorageLocation());

    document
      .getElementById("check-app-update")
      ?.addEventListener("click", () => {
        if (appUpdates.pendingUpdate) return appUpdates.install();
        return this.checkForAppUpdate();
      });

    document.addEventListener("app-update-available", (event) => {
      this.showAvailableAppUpdate(event.detail);
    });

    /**
     * Initializes tab switching logic for the configuration modal.
     */
    const tabBtns = document.querySelectorAll(".config-tab-btn");
    tabBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.dataset.externalUrl) {
          void Neutralino.os.open(btn.dataset.externalUrl).catch(() => {});
          return;
        }
        tabBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");

        const targetId = btn.getAttribute("data-tab-target");
        document.querySelectorAll(".config-tab-content").forEach((content) => {
          content.style.display = "none";
          content.classList.remove("active");
        });

        const targetContent = document.getElementById(`config-${targetId}`);
        if (targetContent) {
          targetContent.style.display = "block";
          targetContent.classList.add("active");
        }

        const titleElement = document.getElementById("config-section-title");
        if (titleElement) {
          titleElement.dataset.i18n = `settings.${targetId}`;
          titleElement.textContent = t(`settings.${targetId}`);
        }
      });
    });

    /**
     * Detects changes in configuration toggles and switches,
     * saving the updated settings to the application store.
     */
    const toggleIds = [
      "launchOnStartup",
      "registerProtocolLinks",
      "blurOutOfFocus",
      "hideOnLaunch",
      "autoStartAfterDownload",
      "multithreadDownloads",
      "multithreadStorageMoves",
      "checkUpdatesOnStartup",
      "checkUpdatesInBackground",
      "checkAppUpdatesOnStartup",
    ];

    toggleIds.forEach((settingKey) => {
      const checkbox = document.getElementById(`setting-${settingKey}`);
      if (checkbox) {
        checkbox.addEventListener("change", async (e) => {
          const enabled = e.target.checked;
          if (settingKey === "launchOnStartup") {
            const updated = await this.handleStartupToggle(enabled);
            if (!updated) {
              checkbox.checked = appSettings.get(settingKey);
              return;
            }
          }
          if (settingKey === "registerProtocolLinks") {
            const updated = await syncWindowsProtocolRegistration(enabled);
            if (!updated) {
              checkbox.checked = appSettings.get(settingKey);
              return;
            }
          }
          appSettings.set(settingKey, enabled);
        });
      }
    });
    if (language) {
      language.value = i18n.locale;
      this.syncLanguageDropdown(i18n.locale);
    }
  },

  syncLanguageDropdown(locale = i18n.locale) {
    const language = document.getElementById("setting-language");
    const selectedFlag = document.getElementById(
      "setting-language-selected-flag",
    );
    const selected = document.getElementById("setting-language-selected");
    const options = [
      ...document.querySelectorAll("#setting-language-options [data-language]"),
    ];
    const selectedOption =
      options.find((option) => option.dataset.language === locale) ||
      options[0];
    if (!selectedOption) return;

    if (language) language.value = selectedOption.dataset.language;
    if (selectedFlag) {
      selectedFlag.className = `mod-settings-select-icon setting-language-flag fi fi-${selectedOption.dataset.flag || "xx"}`;
    }
    options.forEach((option) => {
      const isSelected = option === selectedOption;
      option.classList.toggle("selected", isSelected);
      option.setAttribute("aria-selected", String(isSelected));
    });
    if (selected) {
      const label = selectedOption.querySelector("[data-i18n]");
      const labelKey = label?.dataset.i18n;
      if (labelKey) {
        selected.dataset.i18n = labelKey;
        selected.textContent = t(labelKey) || label.textContent.trim();
      } else {
        delete selected.dataset.i18n;
        selected.textContent = selectedOption.textContent.trim();
      }
    }
  },

  loadSettingsToUI() {
    const toggleIds = [
      "launchOnStartup",
      "registerProtocolLinks",
      "blurOutOfFocus",
      "hideOnLaunch",
      "autoStartAfterDownload",
      "multithreadDownloads",
      "multithreadStorageMoves",
      "checkUpdatesOnStartup",
      "checkUpdatesInBackground",
      "checkAppUpdatesOnStartup",
    ];

    toggleIds.forEach((settingKey) => {
      const checkbox = document.getElementById(`setting-${settingKey}`);
      if (checkbox) {
        checkbox.checked = appSettings.get(settingKey);
      }
    });
    this.updateStorageLocationLabel();
    this.updateNetworkAvailability();
    try {
      const update = JSON.parse(
        sessionStorage.getItem("weekbox_available_app_update") || "null",
      );
      if (update?.asset) this.showAvailableAppUpdate(update);
    } catch {}
  },

  async updateStorageLocationLabel() {
    const label = document.getElementById("storage-location-path");
    if (label)
      label.textContent = await formatStoragePath(
        FS.weekboxPath || "AppData/WeekBox",
      );
  },

  async cleanupIncompleteDownloads() {
    const button = document.getElementById("cleanup-incomplete-downloads");
    if (!button) return;
    button.disabled = true;
    button.textContent = t("settings.cleaning");
    try {
      await FS.cleanupIncompleteDownloads();
      button.textContent = t("settings.cleanedUp");
    } catch {
      button.textContent = t("settings.cleanupFailed");
    }
    setTimeout(() => {
      button.disabled = false;
      button.textContent = t("common.cleanUp");
    }, 1800);
  },

  async openStorageLocation() {
    if (!FS.weekboxPath) return;
    await Neutralino.os.open(FS.weekboxPath).catch((error) => {
      console.warn("Could not open the WeekBox storage folder", error);
    });
  },

  showAvailableAppUpdate(update) {
    return appUpdates.showAvailable(update);
  },

  async checkForAppUpdate() {
    if (!networkStatus.online) return;
    return appUpdates.check();
  },

  updateNetworkAvailability() {
    const button = document.getElementById("check-app-update");
    const status = document.getElementById("app-update-status");
    if (!button) return;
    button.disabled = !networkStatus.online;
    button.title = networkStatus.online
      ? ""
      : t("settings.connectToCheckWeekBoxUpdates");
    if (!networkStatus.online && status) {
      status.textContent = t("settings.connectToCheckUpdates");
    }
  },

  async installAppUpdate() {
    return appUpdates.install();
  },

  hasActiveDownloads() {
    return (
      downloadEngine.activeTasks.size > 0 || downloadMod.activeTasks.size > 0
    );
  },

  showStorageMoveToast() {
    storageMoveFeedback.show();
  },

  updateStorageMoveToast({ progress, copiedFiles, totalFiles }) {
    storageMoveFeedback.update({ progress, copiedFiles, totalFiles });
  },

  completeStorageMoveToast() {
    storageMoveFeedback.complete();
  },

  failStorageMoveToast(message) {
    storageMoveFeedback.fail(message);
  },

  async chooseStorageLocation() {
    if (FS.hasRunningProcesses() || this.hasActiveDownloads()) {
      await Neutralino.os.showMessageBox(
        t("storage.cannotMoveTitle"),
        t("storage.cannotMoveMessage"),
        t("common.ok"),
        "WARNING",
      );
      return;
    }

    const button = document.getElementById("choose-storage-location");
    try {
      const selectedPath = await Neutralino.os.showFolderDialog(
        t("storage.chooseParentDialog"),
        { defaultPath: FS.basePath },
      );
      if (!selectedPath) return;
      if (
        (await isSameStoragePath(selectedPath, FS.basePath)) ||
        (await isSameStoragePath(selectedPath, FS.weekboxPath))
      ) {
        await Neutralino.os.showMessageBox(
          t("storage.alreadyUsingTitle"),
          t("storage.alreadyUsingMessage"),
          t("common.ok"),
          "INFO",
        );
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
          this.showStorageMoveToast();
          await FS.moveStorageTo(
            existingStorage.basePath,
            (progress) => this.updateStorageMoveToast(progress),
            { replaceExisting: true },
          );
          this.updateStorageLocationLabel();
          this.completeStorageMoveToast();
          return;
        }
        if (choice !== "use") return;

        button.disabled = true;
        button.innerHTML = `<i class="fa-solid fa-folder-open"></i> ${t("storage.switchingLibrary")}`;
        await FS.useExistingStorage(existingStorage.basePath);
        location.reload();
        return;
      }
      if (/(?:^|[\\/])weekbox[\\/]*$/i.test(selectedPath)) {
        await Neutralino.os.showMessageBox(
          t("storage.chooseParentTitle"),
          t("storage.chooseParentMessage"),
          t("common.ok"),
          "WARNING",
        );
        return;
      }
      const newWeekboxPath = `${selectedPath.replace(/[\\/]+$/, "")}/WeekBox`;
      const choice = await Neutralino.os.showMessageBox(
        t("storage.moveFilesTitle"),
        t("storage.moveFilesMessage", {
          path: await formatStoragePath(newWeekboxPath),
        }),
        "YES_NO",
        "QUESTION",
      );
      if (choice !== "YES") return;

      if (FS.hasRunningProcesses() || this.hasActiveDownloads()) {
        throw new Error(t("storage.cannotMoveMessage"));
      }

      button.disabled = true;
      button.textContent = t("storage.movingFiles");
      button.innerHTML = `<i class="fa-solid fa-folder-open"></i> ${t("common.chooseFolder")}`;
      this.showStorageMoveToast();
      await FS.moveStorageTo(selectedPath, (progress) =>
        this.updateStorageMoveToast(progress),
      );
      this.updateStorageLocationLabel();
      this.completeStorageMoveToast();
    } catch (error) {
      console.error("Could not move WeekBox storage", error);
      this.failStorageMoveToast(t("storage.moveFailedMessage"));
      await Neutralino.os.showMessageBox(
        t("storage.moveFailedTitle"),
        t("storage.unexpectedMoveError"),
        t("common.ok"),
        "ERROR",
      );
    } finally {
      if (button) {
        button.disabled = false;
        button.innerHTML = `<i class="fa-solid fa-folder-open"></i> ${t("common.chooseFolder")}`;
      }
    }
  },

  async useDefaultStorageLocation() {
    if (FS.hasRunningProcesses() || this.hasActiveDownloads()) {
      await Neutralino.os.showMessageBox(
        t("storage.cannotMoveTitle"),
        t("storage.cannotMoveMessage"),
        t("common.ok"),
        "WARNING",
      );
      return;
    }

    const button = document.getElementById("use-default-storage-location");
    const chooseButton = document.getElementById("choose-storage-location");
    try {
      const defaultPath = await FS.getDefaultStorageParentPath();
      const defaultWeekboxPath = `${defaultPath.replace(/[\\/]+$/, "")}/WeekBox`;
      const choice = await Neutralino.os.showMessageBox(
        t("storage.useDefaultTitle"),
        t("storage.moveFilesMessage", {
          path: await formatStoragePath(defaultWeekboxPath),
        }),
        "YES_NO",
        "QUESTION",
      );
      if (choice !== "YES") return;

      button.disabled = true;
      chooseButton.disabled = true;
      button.textContent = t("storage.movingFiles");
      button.textContent = t("common.useDefault");
      this.showStorageMoveToast();
      await FS.moveStorageTo(defaultPath, (progress) =>
        this.updateStorageMoveToast(progress),
      );
      appSettings.set("storageParentPath", null);
      this.updateStorageLocationLabel();
      this.completeStorageMoveToast();
    } catch (error) {
      console.error("Could not use the default WeekBox storage", error);
      this.failStorageMoveToast(t("storage.moveFailedMessage"));
      await Neutralino.os.showMessageBox(
        t("storage.moveFailedTitle"),
        t("storage.unexpectedMoveError"),
        t("common.ok"),
        "ERROR",
      );
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = t("common.useDefault");
      }
      if (chooseButton) chooseButton.disabled = false;
    }
  },

  async handleStartupToggle(enabled) {
    if (window.NL_OS !== "Windows") return false;
    try {
      const runningExe = String(window.NL_ARGS?.[0] || "")
        .trim()
        .replace(/^"|"$/g, "");
      const exePath = runningExe || `${window.NL_PATH}\\WeekBox.exe`;

      if (enabled && exePath) {
        try {
          await Neutralino.filesystem.getStats(exePath);
        } catch {
          // If direct stats check fails in development or with specific pathing, continue
        }
      }

      const command = enabled
        ? `cmd /c reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "WeekBox" /t REG_SZ /d "\\"${exePath}\\"" /f`
        : `cmd /c reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "WeekBox" /f`;
      const result = await Neutralino.os.execCommand(command, {
        background: false,
      });
      if (result.exitCode !== 0) {
        throw new Error(
          result.stdErr || t("settings.startupRegistrationFailed"),
        );
      }
      return true;
    } catch (error) {
      console.warn("Could not configure Windows startup", error);
      return false;
    }
  },

  async open() {
    await this.init();
    const modal = document.getElementById("config-modal");
    if (!modal) return;

    sidebar.setActive(sidebar.configBtn);
    /**
     * Visually loads current configuration values into the UI.
     */
    this.loadSettingsToUI();

    modal.style.display = "flex";
    requestAnimationFrame(() => modal.classList.add("show"));
  },

  close() {
    const modal = document.getElementById("config-modal");
    if (!modal) return;

    sidebar.syncActive();
    modal.classList.remove("show");
    setTimeout(() => {
      modal.style.display = "none";
    }, 300);
  },
};
