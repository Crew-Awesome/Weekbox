import { appSettings } from "../../core/settings.js";
import { FS } from "../../utils/filesystem.js";
import { downloadEngine } from "../engines/downloadEngine.js";
import { downloadMod } from "../home/modal/downloadMod.js";
import { appUpdater } from "../../core/appUpdater.js";
import { toastSystem } from "../toasts/toastSystem.js";

export const configModal = {
  async init() {
    if (!document.getElementById("config-modal")) {
      const response = await fetch("src/html/sections/config-modal.html");
      if (!response.ok) return;

      const html = await response.text();
      const wrapper = document.createElement("div");
      wrapper.innerHTML = html;
      document.body.appendChild(wrapper.firstElementChild);

      this.bindEvents();
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
      .querySelector('[data-credit-message="Oyachi"]')
      ?.addEventListener("click", () => {
        Neutralino.os
          .showMessageBox(
            "To Oyachi",
            "Sorry for not using your logo and art. I really loved it, and I do love you a lot. I always will.\n\n- Malloy",
            "OK",
            "INFO",
          )
          .catch(() => {});
      });

    document
      .getElementById("choose-storage-location")
      ?.addEventListener("click", () => this.chooseStorageLocation());

    document
      .getElementById("use-default-storage-location")
      ?.addEventListener("click", () => this.useDefaultStorageLocation());

    document
      .getElementById("check-app-update")
      ?.addEventListener("click", () => {
        if (this.pendingAppUpdate) return this.installAppUpdate();
        return this.checkForAppUpdate();
      });

    document.addEventListener("app-update-available", (event) => {
      this.showAvailableAppUpdate(event.detail);
    });

    // Cambiar Tabs (Pestañas)
    const tabBtns = document.querySelectorAll(".config-tab-btn");
    tabBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
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
          titleElement.textContent =
            targetId.charAt(0).toUpperCase() + targetId.slice(1);
        }
      });
    });

    // Detectar cambios en los Toggles/Switches
    const toggleIds = [
      "launchOnStartup",
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
          appSettings.set(settingKey, enabled);
        });
      }
    });
  },

  loadSettingsToUI() {
    const toggleIds = [
      "launchOnStartup",
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
    try {
      const update = JSON.parse(
        sessionStorage.getItem("weekbox_available_app_update") || "null",
      );
      if (update?.asset) this.showAvailableAppUpdate(update);
    } catch {}
  },

  updateStorageLocationLabel() {
    const label = document.getElementById("storage-location-path");
    if (label) label.textContent = FS.weekboxPath || "AppData/WeekBox";
  },

  showAvailableAppUpdate(update) {
    const button = document.getElementById("check-app-update");
    const status = document.getElementById("app-update-status");
    if (!button || !status || !update?.latestVersion) return;
    this.pendingAppUpdate = update;
    status.textContent = `WeekBox ${update.latestVersion} is ready to install.`;
    button.textContent = "Install and restart";
    button.disabled = false;
  },

  async checkForAppUpdate() {
    const button = document.getElementById("check-app-update");
    const status = document.getElementById("app-update-status");
    if (!button || !status) return;
    button.disabled = true;
    this.pendingAppUpdate = null;
    status.textContent = "Checking for updates…";
    try {
      const update = await appUpdater.check();
      if (update.status === "current") {
        sessionStorage.removeItem("weekbox_available_app_update");
        status.textContent = `WeekBox ${update.currentVersion} is up to date.`;
        button.textContent = "Up to date";
        return;
      }
      if (update.status === "unsupported") {
        status.textContent = update.message;
        button.textContent = "Unavailable";
        return;
      }
      this.showAvailableAppUpdate(update);
    } catch (error) {
      status.textContent = error.message || "Could not check for updates.";
      button.textContent = "Try again";
      button.disabled = false;
    }
  },

  async installAppUpdate() {
    const button = document.getElementById("check-app-update");
    const status = document.getElementById("app-update-status");
    const update = this.pendingAppUpdate;
    if (!button || !status || !update) return;
    button.disabled = true;
    try {
      await appUpdater.install(update, (message) => {
        status.textContent = message;
      });
    } catch (error) {
      status.textContent = error.message || "Could not install the update.";
      button.textContent = "Try again";
      this.pendingAppUpdate = null;
      button.disabled = false;
    }
  },

  hasActiveDownloads() {
    return (
      downloadEngine.activeTasks.size > 0 || downloadMod.activeTasks.size > 0
    );
  },

  showStorageMoveToast() {
    if (!document.getElementById("storage-move-lock")) {
      const lock = document.createElement("div");
      lock.id = "storage-move-lock";
      lock.className = "storage-move-lock";
      lock.setAttribute("aria-hidden", "true");
      document.body.appendChild(lock);
    }
    toastSystem.show("weekbox-storage-move", {
      title: "Moving WeekBox files",
      message: "Preparing files…",
      mediaHtml: '<i class="fa-solid fa-folder-open" aria-hidden="true"></i>',
      showPercent: true,
    });
  },

  updateStorageMoveToast({ progress, copiedFiles, totalFiles }) {
    toastSystem.update("weekbox-storage-move", {
      message: `Moving files (${copiedFiles} of ${totalFiles})`,
      progress,
    });
  },

  completeStorageMoveToast() {
    document.getElementById("storage-move-lock")?.remove();
    toastSystem.setState("weekbox-storage-move", "complete", {
      badgeHtml: '<i class="fa-solid fa-check" aria-hidden="true"></i>',
    });
    toastSystem.update("weekbox-storage-move", {
      message: "WeekBox files moved",
      progress: 100,
    });
    setTimeout(() => toastSystem.hide("weekbox-storage-move"), 3600);
  },

  failStorageMoveToast(message) {
    document.getElementById("storage-move-lock")?.remove();
    toastSystem.setState("weekbox-storage-move", "error", {
      badgeHtml: '<i class="fa-solid fa-xmark" aria-hidden="true"></i>',
    });
    toastSystem.update("weekbox-storage-move", { message, progress: 100 });
  },

  async chooseStorageLocation() {
    if (FS.hasRunningProcesses() || this.hasActiveDownloads()) {
      await Neutralino.os.showMessageBox(
        "Cannot move WeekBox files",
        "Close all running engines and wait for downloads to finish before changing the storage location.",
        "OK",
        "WARNING",
      );
      return;
    }

    const button = document.getElementById("choose-storage-location");
    try {
      const selectedPath = await Neutralino.os.showFolderDialog(
        "Choose WeekBox's parent folder (not a folder named WeekBox)",
        { defaultPath: FS.basePath },
      );
      if (!selectedPath) return;
      if (/(?:^|[\\/])weekbox[\\/]*$/i.test(selectedPath)) {
        await Neutralino.os.showMessageBox(
          "Choose the parent folder",
          "WeekBox creates its own WeekBox folder inside the location you choose. Select the parent folder instead (for example, AppData\\Local, not AppData\\Local\\WeekBox).",
          "OK",
          "WARNING",
        );
        return;
      }
      const newWeekboxPath = `${selectedPath.replace(/[\\/]+$/, "")}/WeekBox`;
      const choice = await Neutralino.os.showMessageBox(
        "Move WeekBox files?",
        `WeekBox will move all mods, engines, and data to:\n${newWeekboxPath}\n\nThis can take a while for large libraries.`,
        "YES_NO",
        "QUESTION",
      );
      if (choice !== "YES") return;

      if (FS.hasRunningProcesses() || this.hasActiveDownloads()) {
        throw new Error(
          "Close all running engines and wait for downloads to finish before moving WeekBox files.",
        );
      }

      button.disabled = true;
      button.textContent = "Moving files…";
      button.innerHTML =
        '<i class="fa-solid fa-folder-open"></i> Choose folder';
      this.showStorageMoveToast();
      await FS.moveStorageTo(selectedPath, (progress) =>
        this.updateStorageMoveToast(progress),
      );
      this.updateStorageLocationLabel();
      this.completeStorageMoveToast();
    } catch (error) {
      console.error("Could not move WeekBox storage", error);
      this.failStorageMoveToast(
        error.message || "Could not move WeekBox files.",
      );
      await Neutralino.os.showMessageBox(
        "Could not move WeekBox files",
        error.message || "An unexpected error occurred while moving files.",
        "OK",
        "ERROR",
      );
    } finally {
      if (button) {
        button.disabled = false;
        button.innerHTML =
          '<i class="fa-solid fa-folder-open"></i> Choose folder';
      }
    }
  },

  async useDefaultStorageLocation() {
    if (FS.hasRunningProcesses() || this.hasActiveDownloads()) {
      await Neutralino.os.showMessageBox(
        "Cannot move WeekBox files",
        "Close all running engines and wait for downloads to finish before changing the storage location.",
        "OK",
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
        "Use the default location?",
        `WeekBox will move all mods, engines, and data to:\n${defaultWeekboxPath}\n\nThis can take a while for large libraries.`,
        "YES_NO",
        "QUESTION",
      );
      if (choice !== "YES") return;

      button.disabled = true;
      chooseButton.disabled = true;
      button.textContent = "Moving filesâ€¦";
      button.textContent = "Use default";
      this.showStorageMoveToast();
      await FS.moveStorageTo(defaultPath, (progress) =>
        this.updateStorageMoveToast(progress),
      );
      appSettings.set("storageParentPath", null);
      this.updateStorageLocationLabel();
      this.completeStorageMoveToast();
    } catch (error) {
      console.error("Could not use the default WeekBox storage", error);
      this.failStorageMoveToast(
        error.message || "Could not move WeekBox files.",
      );
      await Neutralino.os.showMessageBox(
        "Could not move WeekBox files",
        error.message || "An unexpected error occurred while moving files.",
        "OK",
        "ERROR",
      );
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = "Use default";
      }
      if (chooseButton) chooseButton.disabled = false;
    }
  },

  async handleStartupToggle(enabled) {
    if (window.NL_OS !== "Windows") return false;
    try {
      const exePath = `${window.NL_PATH}\\WeekBox.exe`;
      if (enabled) await Neutralino.filesystem.getStats(exePath);
      const command = enabled
        ? `cmd /c reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "WeekBox" /t REG_SZ /d "\\"${exePath}\\"" /f`
        : `cmd /c reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "WeekBox" /f`;
      const result = await Neutralino.os.execCommand(command, {
        background: false,
      });
      if (result.exitCode !== 0) {
        throw new Error(result.stdErr || "Windows Registry command failed");
      }
      return true;
    } catch (error) {
      console.error("Could not configure Windows startup", error);
      return false;
    }
  },

  async open() {
    await this.init();
    const modal = document.getElementById("config-modal");
    if (!modal) return;

    // Carga los valores actuales visualmente
    this.loadSettingsToUI();

    modal.style.display = "flex";
    requestAnimationFrame(() => modal.classList.add("show"));
  },

  close() {
    const modal = document.getElementById("config-modal");
    if (!modal) return;

    modal.classList.remove("show");
    setTimeout(() => {
      modal.style.display = "none";
    }, 300);
  },
};
