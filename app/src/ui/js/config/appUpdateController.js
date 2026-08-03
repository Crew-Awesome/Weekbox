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
      label.textContent = "WeekBox version unavailable";
    }
  }

  showAvailable(update) {
    const button = document.getElementById("check-app-update");
    const status = document.getElementById("app-update-status");
    if (!button || !status || !update?.latestVersion) return;
    this.pendingUpdate = update;
    status.textContent = `WeekBox ${update.latestVersion} is ready to install.`;
    button.textContent = "Install and restart";
    button.disabled = false;
  }

  async check() {
    const button = document.getElementById("check-app-update");
    const status = document.getElementById("app-update-status");
    if (!button || !status) return;
    button.disabled = true;
    this.pendingUpdate = null;
    status.textContent = "Checking for updates…";
    try {
      const update = await this.appUpdater.check();
      if (update.status === "current") {
        sessionStorage.removeItem("weekbox_available_app_update");
        status.textContent = `WeekBox ${update.currentVersion} is up to date.`;
        button.textContent = "Up to date";
        button.disabled = false;
        return;
      }
      if (update.status === "unsupported") {
        status.textContent = update.message;
        button.textContent = "Unavailable";
        button.disabled = false;
        return;
      }
      this.showAvailable(update);
    } catch (error) {
      status.textContent = error.message || "Could not check for updates.";
      button.textContent = "Try again";
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
        status.textContent = message;
      });
    } catch (error) {
      status.textContent = error.message || "Could not install the update.";
      button.textContent = "Try again";
      this.pendingUpdate = null;
      button.disabled = false;
    }
  }
}
