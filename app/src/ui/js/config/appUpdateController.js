import { localizeProgressStatus, t } from "../i18n/index.js";

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

  async updateVersionLabel() {
    const label = document.getElementById("weekbox-app-version");
    if (!label) return;
    try {
      label.textContent = `WeekBox ${await this.appUpdater.getCurrentVersion()}`;
    } catch {
      label.textContent = t("updates.versionUnavailable");
    }
  }

  showAvailable(update) {
    const button = document.getElementById("check-app-update");
    const status = document.getElementById("app-update-status");
    if (!button || !status || !update?.latestVersion) return;
    this.pendingUpdate = update;
    status.textContent = t("updates.readyToInstall", {
      version: update.latestVersion,
    });
    button.textContent = t("updates.installAndRestart");
    button.disabled = false;
  }

  async check() {
    const button = document.getElementById("check-app-update");
    const status = document.getElementById("app-update-status");
    if (!button || !status) return;
    button.disabled = true;
    this.pendingUpdate = null;
    status.textContent = t("settings.checkingForUpdates");
    try {
      const update = await this.appUpdater.check();
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
      this.showAvailable(update);
    } catch (error) {
      status.textContent = t("updates.checkFailed");
      button.textContent = t("updates.tryAgain");
      button.disabled = false;
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
