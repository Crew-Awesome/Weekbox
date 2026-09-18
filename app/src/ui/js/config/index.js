import { appSettings } from "../../../backend/core/system/settings.service.js";
import { FS } from "../../../backend/services/filesystem.js";
import { setupDropdown } from "../../utils/components/dropdown.component.js";
import { downloadEngine } from "../engines/downloadEngine.js";
import { downloadMod } from "../home/modal/downloadMod.js";
import { appUpdater } from "../../../backend/core/updates/app-updater.service.js";
import { toastSystem } from "../toasts/toastSystem.js";
import { AppUpdateController } from "./appUpdateController.js";
import { whatsNewModal } from "../updates/whatsNewModal.js";
import { StorageMoveFeedback } from "./storageMoveFeedback.js";
import { existingStorageModal } from "../existingStorageModal.js";
import { networkStatus } from "../../../backend/core/system/network-status.service.js";
import {
  syncWindowsProtocolRegistration,
  syncWindowsStartupRegistration,
} from "../../../backend/core/system/windows-protocol.util.js";
import { sidebar } from "../sidebar.js";
import { getLocaleCoverage, i18n, LANGUAGES, t } from "../i18n/index.js";
import { firstRunLanguageModal } from "../firstRunLanguageModal.js";
import iro from "@jaames/iro";
import { hueToHex, setAccentHue, setTheme } from "../theme.js";
import {
  activateCheckoutDialog,
  deactivateCheckoutDialog,
} from "../home/modal/dialogFocus.js";

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
      const modalElement = wrapper.firstElementChild;
      if (!modalElement)
        throw new Error("WeekBox configuration template is unavailable.");
      document.body.appendChild(modalElement);
      this.renderLanguageOptions();
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

  renderLanguageOptions() {
    const container = document.getElementById("setting-language-options");
    const select = document.getElementById("setting-language");
    if (!container || !select) return;
    container.replaceChildren();
    select.replaceChildren();
    LANGUAGES.forEach(({ id, flag, name }) => {
      const option = document.createElement("button");
      option.type = "button";
      option.className = "setting-language-option";
      option.dataset.language = id;
      option.dataset.flag = flag;
      option.dataset.languageName = name;
      option.setAttribute("role", "option");
      option.setAttribute("aria-selected", "false");
      const flagElement = document.createElement("span");
      flagElement.className = `language-flag setting-language-flag fi fi-${flag}`;
      flagElement.setAttribute("aria-hidden", "true");
      const label = document.createElement("span");
      label.textContent = name;
      option.append(flagElement, label);
      container.append(option);

      const selectOption = document.createElement("option");
      selectOption.value = id;
      selectOption.textContent = name;
      select.append(selectOption);
    });
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
      .getElementById("delete-all-library")
      ?.addEventListener("click", () => this.showLibraryDeleteModal());

    document
      .getElementById("setting-language")
      ?.addEventListener("change", (event) => {
        i18n.setLocale(event.target.value, { reload: true });
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
    languageTrigger?.addEventListener("click", async (event) => {
      event.stopImmediatePropagation();
      this.languageDropdownController?.close();
      await firstRunLanguageModal.show({ markComplete: false });
      this.syncLanguageDropdown(i18n.locale);
    });
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
    document
      .getElementById("view-app-changelog")
      ?.addEventListener("click", () =>
        whatsNewModal
          .showIfNeeded({ force: true })
          .catch((error) =>
            console.warn("Could not show the WeekBox changelog", error),
          ),
      );

    document.addEventListener("app-update-available", (event) => {
      this.showAvailableAppUpdate(event.detail);
    });




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
          requestAnimationFrame(() => {
            if (targetContent.isConnected)
              targetContent.classList.add("active");
          });
        }

        const titleElement = document.getElementById("config-section-title");
        if (titleElement) {
          titleElement.dataset.i18n = `settings.${targetId}`;
          titleElement.textContent = t(`settings.${targetId}`);
        }
      });
    });





    const toggleIds = [
      "darkMode",
      "launchOnStartup",
      "registerProtocolLinks",
      "hideOnLaunch",
      "closeToTray",
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
          if (settingKey === "darkMode") {
            setTheme(enabled);
            this.syncAccentPicker(appSettings.get("accentHue"));
          }
          appSettings.set(settingKey, enabled);
        });
      }
    });

    const accentPickerElement = document.getElementById("setting-accentPicker");
    if (accentPickerElement) {
      this.accentPicker = new iro.ColorPicker(accentPickerElement, {
        width: 190,
        color: hueToHex(appSettings.get("accentHue")),
        layout: [
          {
            component: iro.ui.Slider,
            options: { sliderType: "hue" },
          },
        ],
      });
      this.accentPicker.on("color:change", (color) => {
        const hue = setAccentHue(color.hue);
        if (!this.accentPickerSyncing) appSettings.set("accentHue", hue);
      });
    }
    document
      .getElementById("reset-accent")
      ?.addEventListener("click", () => this.resetAccent());
    document
      .getElementById("reset-settings")
      ?.addEventListener("click", () => this.resetSettings());

    document
      .getElementById("setting-wineCommand")
      ?.addEventListener("change", (event) => {
        appSettings.set("wineCommand", event.target.value || null);
      });
    document
      .getElementById("refresh-wine-versions")
      ?.addEventListener("click", () => this.loadWineSettings());
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
      selectedFlag.className = `mod-settings-select-icon language-flag setting-language-flag fi fi-${selectedOption.dataset.flag || "xx"}`;
    }
    options.forEach((option) => {
      const isSelected = option === selectedOption;
      option.classList.toggle("selected", isSelected);
      option.setAttribute("aria-selected", String(isSelected));
      const name =
        option.dataset.languageName ||
        option.querySelector("span:last-child")?.textContent.trim() ||
        option.dataset.language;
      option.title = `${name} (${getLocaleCoverage(option.dataset.language)}%)`;
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

  syncAccentPicker(hue) {
    if (!this.accentPicker) return;
    this.accentPickerSyncing = true;
    this.accentPicker.color.hexString = hueToHex(hue);
    this.accentPickerSyncing = false;
  },

  resetAccent() {
    const hue = appSettings.defaultSettings.accentHue;
    appSettings.set("accentHue", hue);
    setAccentHue(hue);
    this.syncAccentPicker(hue);
  },

  showSettingsResetModal() {
    const template = document.getElementById("tpl-settings-reset-modal");
    if (!template) return Promise.resolve(false);
    const wrapper = document.createElement("div");
    wrapper.innerHTML = template.innerHTML;
    const overlay = wrapper.firstElementChild;
    if (!overlay) return Promise.resolve(false);

    const dialog = overlay.querySelector(".settings-reset-dialog");
    const cancel = overlay.querySelector("#settings-reset-cancel");
    const confirm = overlay.querySelector("#settings-reset-confirm");

    return new Promise((resolve) => {
      let closed = false;
      const close = (accepted) => {
        if (closed) return;
        closed = true;
        deactivateCheckoutDialog(overlay);
        overlay.remove();
        resolve(accepted);
      };

      cancel.addEventListener("click", () => close(false));
      confirm.addEventListener("click", () => close(true));
      overlay.addEventListener("click", (event) => {
        if (event.target === overlay) close(false);
      });
      document.body.appendChild(overlay);
      i18n.apply(overlay);
      overlay.hidden = false;
      requestAnimationFrame(() => overlay.classList.add("show"));
      activateCheckoutDialog(overlay, dialog, confirm, () => close(false));
    });
  },

  async resetSettings() {
    if (!(await this.showSettingsResetModal())) return;

    await appSettings.resetUserSettings();
    await this.handleStartupToggle(appSettings.get("launchOnStartup"));
    await syncWindowsProtocolRegistration(
      appSettings.get("registerProtocolLinks"),
    );
    setTheme(appSettings.get("darkMode"), {
      hue: appSettings.get("accentHue"),
    });
    i18n.setLocale(appSettings.get("language"));
    this.loadSettingsToUI();
  },

  loadSettingsToUI() {
    const toggleIds = [
      "darkMode",
      "launchOnStartup",
      "registerProtocolLinks",
      "hideOnLaunch",
      "closeToTray",
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
    const hue = setAccentHue(appSettings.get("accentHue"));
    this.syncAccentPicker(hue);
    this.loadWineSettings();
    void this.loadAppVersion();
    this.updateStorageLocationLabel();
    this.updateNetworkAvailability();
    try {
      const update = JSON.parse(
        sessionStorage.getItem("weekbox_available_app_update") || "null",
      );
      if (update?.asset) this.showAvailableAppUpdate(update);
    } catch {}
  },

  async loadWineSettings() {
    const setting = document.getElementById("wine-setting");
    const select = document.getElementById("setting-wineCommand");
    const refresh = document.getElementById("refresh-wine-versions");
    const status = document.getElementById("wine-setting-status");
    if (!setting || !select || !refresh) return;

    const supported = window.NL_OS === "Linux" || window.NL_OS === "Darwin";
    setting.hidden = !supported;
    if (!supported) return;

    select.disabled = true;
    refresh.disabled = true;
    try {
      const installations = await FS.getWineInstallations();
      select.replaceChildren(
        ...installations.map((installation) => {
          const option = document.createElement("option");
          option.value = installation.command;
          option.textContent = `${installation.version} (${installation.command})`;
          return option;
        }),
      );
      const selected = appSettings.get("wineCommand");
      select.value = installations.some(
        (installation) => installation.command === selected,
      )
        ? selected
        : installations[0]?.command || "";
      if (select.value && select.value !== selected) {
        appSettings.set("wineCommand", select.value);
      }
      if (status)
        status.textContent = installations.length ? "" : t("wine.title");
    } catch (error) {
      console.warn("Could not find Wine installations", error);
      select.replaceChildren();
      if (status) status.textContent = t("wine.title");
    } finally {
      select.disabled = !select.options.length;
      refresh.disabled = false;
    }
  },

  async loadAppVersion() {
    const versionElement = document.getElementById("app-current-version");
    if (!versionElement) return;
    try {
      versionElement.textContent = await appUpdater.getCurrentVersion();
    } catch {
      versionElement.textContent = t("common.unknown");
    }
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

  showLibraryDeleteModal() {
    const template = document.getElementById("tpl-library-delete-modal");
    if (!template) return;
    const wrapper = document.createElement("div");
    wrapper.innerHTML = template.innerHTML;
    const overlay = wrapper.firstElementChild;
    if (!overlay) return;
    const dialog = overlay.querySelector(".library-delete-dialog");
    const title = overlay.querySelector("#library-delete-title");
    const description = overlay.querySelector("#library-delete-description");
    const status = overlay.querySelector("#library-delete-status");
    const targetPicker = overlay.querySelector(
      "#library-delete-target-picker",
    );
    const targetPickerLabel = overlay.querySelector(
      "#library-delete-target-label",
    );
    const targetDropdown = overlay.querySelector(
      "#library-delete-target-dropdown",
    );
    const targetTrigger = overlay.querySelector(
      "#library-delete-target-trigger",
    );
    const targetMenu = overlay.querySelector("#library-delete-target-options");
    const targetSelected = overlay.querySelector(
      "#library-delete-target-selected",
    );
    const targetSelect = overlay.querySelector("#library-delete-target");
    const confirmationField = overlay.querySelector(
      "#library-delete-confirmation",
    );
    const confirmationLabel = overlay.querySelector(
      "#library-delete-confirmation-label",
    );
    const confirmationInput = overlay.querySelector(
      "#library-delete-confirmation-input",
    );
    const cancel = overlay.querySelector("#library-delete-cancel");
    const confirm = overlay.querySelector("#library-delete-confirm");
    let target = "";
    let targetLabel = "";
    let step = 0;
    let closed = false;
    const targetDropdownController = setupDropdown(
      targetTrigger,
      targetDropdown,
      { menuElement: targetMenu },
    );

    const getTargetLabel = () =>
      t(
        target === "mods"
          ? "settings.modsLabel"
          : target === "engines"
            ? "settings.enginesLabel"
            : "settings.allLibraryLabel",
      );

    const syncTargetPicker = () => {
      targetSelected.textContent = target
        ? getTargetLabel()
        : t("settings.clearLibraryChooseOption");
      targetMenu.querySelectorAll("[data-target]").forEach((option) => {
        const selected = option.dataset.target === target;
        option.classList.toggle("selected", selected);
        option.setAttribute("aria-selected", String(selected));
        option.textContent = t(
          option.dataset.target === "mods"
            ? "settings.modsLabel"
            : option.dataset.target === "engines"
              ? "settings.enginesLabel"
              : "settings.allLibraryLabel",
        );
      });
      targetSelect.value = target;
    };

    const close = (restoreFocus = true) => {
      if (closed) return;
      closed = true;
      targetDropdownController.destroy();
      deactivateCheckoutDialog(overlay, restoreFocus);
      overlay.remove();
    };

    const renderStep = () => {
      targetPickerLabel.textContent = t("settings.clearLibraryTargetLabel");
      targetLabel = getTargetLabel();
      syncTargetPicker();
      title.textContent = t(
        step === 0
          ? "settings.clearLibraryChooseTitle"
          : step === 1
            ? "settings.clearLibraryFirstTitle"
            : step === 2
              ? "settings.clearLibrarySecondTitle"
              : "settings.clearLibraryFinalTitle",
        { target: targetLabel },
      );
      description.textContent = t(
        step === 0
          ? "settings.clearLibraryChooseDescription"
          : step === 1
            ? "settings.clearLibraryFirstDescription"
            : step === 2
              ? "settings.clearLibrarySecondDescription"
              : "settings.clearLibraryFinalDescription",
        { target: targetLabel },
      );
      status.textContent = "";
      cancel.textContent = t("common.cancel");
      confirm.textContent = t(
        step === 0
          ? "common.continue"
          : step === 3
            ? "settings.clearLibraryFinalButton"
            : step === 2
              ? "settings.clearLibraryUnderstand"
              : "common.continue",
        { target: targetLabel },
      );
      targetPicker.hidden = step !== 0;
      confirmationField.hidden = step !== 3;
      if (step === 0) {
        targetSelect.value = target;
        confirm.disabled = !target;
      } else if (step === 3) {
        const confirmationText = t("settings.clearLibraryFinalButton", {
          target: targetLabel,
        });
        confirmationLabel.textContent = t(
          "settings.clearLibraryFinalInputLabel",
          { confirmation: confirmationText },
        );
        confirmationInput.value = "";
        confirm.disabled = true;
      } else {
        confirm.disabled = false;
      }
    };

    cancel.addEventListener("click", () => close());
    targetMenu.addEventListener("click", (event) => {
      const option = event.target.closest("[data-target]");
      if (!option) return;
      target = option.dataset.target;
      syncTargetPicker();
      targetDropdownController.close();
      status.textContent = "";
      confirm.disabled = !target;
    });
    confirmationInput.addEventListener("input", () => {
      const confirmationText = t("settings.clearLibraryFinalButton", {
        target: targetLabel,
      });
      confirm.disabled = confirmationInput.value.trim() !== confirmationText;
    });
    confirm.addEventListener("click", async () => {
      if (step === 0) {
        target = targetSelect.value;
        if (!target) return;
        step = 1;
        renderStep();
        return;
      }
      if (step < 3) {
        step += 1;
        renderStep();
        return;
      }
      const confirmationText = t("settings.clearLibraryFinalButton", {
        target: targetLabel,
      });
      if (confirmationInput.value.trim() !== confirmationText) return;
      if (this.hasActiveDownloads()) {
        status.textContent = t("settings.clearLibraryStopDownloads");
        return;
      }
      confirm.disabled = true;
      cancel.disabled = true;
      status.textContent = t("settings.clearLibraryDeleting");
      try {
        await FS.clearInstalledLibrary(target);
        close(false);
        window.location.reload();
      } catch (error) {
        confirm.disabled = false;
        cancel.disabled = false;
        status.textContent = error?.message || t("settings.clearLibraryFailed");
      }
    });
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) close();
    });
    document.body.appendChild(overlay);
    overlay.hidden = false;
    renderStep();
    requestAnimationFrame(() => overlay.classList.add("show"));
    activateCheckoutDialog(overlay, dialog, confirm, () => close());
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

  updateStorageMoveToast({ progress, copiedFiles, totalFiles, phase }) {
    storageMoveFeedback.update({ progress, copiedFiles, totalFiles, phase });
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
        "OK",
        "WARNING",
      );
      return;
    }

    const button = document.getElementById("choose-storage-location");
    try {
      const selectedPath = await Neutralino.os.showFolderDialog(
        t("common.chooseFolder"),
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
          "OK",
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
      if (await FS.hasStorageFolder(selectedPath)) {
        const replaceChoice = await Neutralino.os.showMessageBox(
          t("storage.moveFilesTitle"),
          t("storage.moveFilesMessage", {
            path: await formatStoragePath(selectedPath),
          }),
          "YES_NO",
          "QUESTION",
        );
        if (replaceChoice !== "YES") return;
        button.disabled = true;
        button.innerHTML = `<i class="fa-solid fa-folder-open"></i> ${t("storage.movingFiles")}`;
        this.showStorageMoveToast();
        await FS.moveStorageTo(
          selectedPath,
          (progress) => this.updateStorageMoveToast(progress),
          { replaceExisting: true },
        );
        this.updateStorageLocationLabel();
        this.completeStorageMoveToast();
        return;
      }
      const choice = await Neutralino.os.showMessageBox(
        t("storage.moveFilesTitle"),
        t("storage.moveFilesMessage", {
          path: await formatStoragePath(selectedPath),
        }),
        "YES_NO",
        "QUESTION",
      );
      if (choice !== "YES") return;

      if (FS.hasRunningProcesses() || this.hasActiveDownloads()) {
        throw new Error(t("storage.cannotMoveMessage"));
      }

      button.disabled = true;
      button.innerHTML = `<i class="fa-solid fa-folder-open"></i> ${t("storage.movingFiles")}`;
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
        error?.message || t("storage.unexpectedMoveError"),
        "OK",
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
        "OK",
        "WARNING",
      );
      return;
    }

    const button = document.getElementById("use-default-storage-location");
    const chooseButton = document.getElementById("choose-storage-location");
    try {
      const defaultPath = await FS.getDefaultStoragePath();
      const defaultWeekboxPath = defaultPath;
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
      button.innerHTML = `<i class="fa-solid fa-folder-open"></i> ${t("storage.movingFiles")}`;
      this.showStorageMoveToast();
      await FS.api.ensureDir(defaultPath);
      await FS.moveStorageTo(
        defaultPath,
        (progress) => this.updateStorageMoveToast(progress),
        { replaceExisting: true },
      );
      this.updateStorageLocationLabel();
      this.completeStorageMoveToast();
    } catch (error) {
      console.error("Could not use the default WeekBox storage", error);
      this.failStorageMoveToast(t("storage.moveFailedMessage"));
      await Neutralino.os.showMessageBox(
        t("storage.moveFailedTitle"),
        error?.message || t("storage.unexpectedMoveError"),
        "OK",
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

  handleStartupToggle: syncWindowsStartupRegistration,

  async open() {
    await this.init();
    const modal = document.getElementById("config-modal");
    if (!modal) return;

    sidebar.setActive(sidebar.configBtn);



    this.loadSettingsToUI();

    modal.style.display = "flex";
    activateCheckoutDialog(
      modal,
      modal.querySelector(".config-content"),
      modal.querySelector("#config-close-btn"),
      () => this.close(),
    );
    requestAnimationFrame(() => modal.classList.add("show"));
  },

  close() {
    const modal = document.getElementById("config-modal");
    if (!modal) return;

    sidebar.syncActive();
    deactivateCheckoutDialog(modal);
    modal.classList.remove("show");
    setTimeout(() => {
      modal.style.display = "none";
    }, 260);
  },
};
