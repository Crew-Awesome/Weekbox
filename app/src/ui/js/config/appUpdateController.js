import { localizeProgressStatus, t } from "../i18n/index.js";

const UPDATE_CHECK_TIMEOUT = 10000;

function localizeUpdateStatus(message) {
  const value = String(message || "");
  if (value.startsWith("Verifying update")) return t("updates.verifying");
  if (value.startsWith("Closing WeekBox")) return t("updates.closing");
  if (value.startsWith("Installing update")) return t("updates.installing");
  if (value.startsWith("Restarting WeekBox")) return t("updates.restarting");
  return localizeProgressStatus(value) || t("updates.updating");
}

export class AppUpdateController {
  constructor(appUpdater) {
    this.appUpdater = appUpdater;
    this.pendingUpdate = null;
  }

  showAvailable(update) {
    const button = document.getElementById("check-app-update");
    const status = document.getElementById("app-update-status");
    if (!button || !status || !update?.latestVersion) return false;
    this.pendingUpdate = update;
    status.textContent = t("updates.readyToInstall", {
      version: update.latestVersion,
    });
    button.textContent = t("updates.installAndRestart");
    button.disabled = false;
    return true;
  }

  async check() {
    const button = document.getElementById("check-app-update");
    const status = document.getElementById("app-update-status");
    if (!button || !status) return;
    button.disabled = true;
    this.pendingUpdate = null;
    status.textContent = t("settings.checkingForUpdates");
    let timeoutHandle;
    try {
      const update = await Promise.race([
        this.appUpdater.check(),
        new Promise((_, reject) => {
          timeoutHandle = setTimeout(
            () => reject(new Error("Update check timeout")),
            UPDATE_CHECK_TIMEOUT,
          );
        }),
      ]);
      if (update.status === "current") {
        sessionStorage.removeItem("weekbox_available_app_update");
        status.textContent = t("updates.upToDate", {
          version: update.currentVersion,
        });
        button.textContent = t("updates.upToDateButton");
        button.disabled = false;
        return;
      }
      if (update.status === "unsupported") {
        status.textContent = t("updates.unavailable");
        button.textContent = t("engines.unavailable");
        button.disabled = false;
        return;
      }
      if (update.status === "available" && this.showAvailable(update)) return;
      throw new Error("WeekBox returned an incomplete update result.");
    } catch (error) {
      status.textContent = t("updates.checkFailed");
      button.textContent = t("updates.tryAgain");
      button.disabled = false;
    } finally {
      if (timeoutHandle) clearTimeout(timeoutHandle);
    }
  }

  async install() {
    const button = document.getElementById("check-app-update");
    const status = document.getElementById("app-update-status");
    if (!button || !status || !this.pendingUpdate) return;
    button.disabled = true;
    try {
      await this.appUpdater.install(this.pendingUpdate, (message) => {
        status.textContent = localizeUpdateStatus(message);
      });
    } catch (error) {
      status.textContent = t("updates.installFailed");
      button.textContent = t("updates.tryAgain");
      this.pendingUpdate = null;
      button.disabled = false;
    }
  }
}
