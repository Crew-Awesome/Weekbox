import { appEvents } from "../../../backend/core/routing/events.service.js";
import { getSelectedEngine } from "../../../backend/core/state/state.service.js";
import { engineDropdown } from "./dropdown.js";
import { getTargetLink, getTargetSize } from "./utils.js";
import { FS } from "../../../backend/services/filesystem.js";
import { downloadEngine } from "./downloadEngine.js";
import { modsMaster } from "./modsMasterClass.js";
import { rememberInstalledEngineBuild } from "./engineUpdateService.js";
import { engineInstallToast } from "./engineInstallToast.js";
import { appSettings } from "../../../backend/core/system/settings.service.js";
import { i18n, localizeProgressStatus, t } from "../i18n/index.js";

export const enginesView = {
  async init() {
    this.isVisible = true;
    const engine = getSelectedEngine();
    if (!engine) return;
    this.currentEngine = engine;
    const displayTitle = document.getElementById("engine-display-title");
    if (displayTitle) displayTitle.textContent = engine.meta.name;
    const bottomIcon = document.getElementById("engine-bottom-icon");
    if (bottomIcon) {
      if (engine.meta.icon) {
        bottomIcon.src = `assets/icons/${engine.meta.icon}`;
        bottomIcon.style.display = "block";
      } else {
        bottomIcon.style.display = "none";
      }
    }
    if (!FS.isInitialized) await FS.init();
    engineDropdown.setup(engine, (version) => {
      this.currentVersion = version;
      this.updateButtonState();
    });
  },
  destroy() {
    this.isVisible = false;
    if (this.activeInstall) {
      const task = downloadEngine.getActiveTask(
        this.activeInstall.engineId,
        this.activeInstall.version,
      );
      if (task)
        engineInstallToast.update(this.activeInstall, task.progressInfo);
    }
    engineDropdown.destroy();
  },
  async updateButtonState() {
    const launchBtn = document.getElementById("launch-engine-btn");
    const dlUI = document.getElementById("download-ui");
    const dlText = document.getElementById("dl-text");
    const dlTextSizer = document.getElementById("dl-text-sizer");
    const dlTrackTextSizer = document.getElementById("dl-track-text-sizer");
    const dlActiveLayer = document.getElementById("dl-active-layer");
    const downloadActions = document.getElementById("engine-download-actions");
    if (!launchBtn) return;
    const activeTask = downloadEngine.getActiveTask(
      this.currentEngine.id,
      this.currentVersion,
    );
    if (activeTask) {
      this.activeInstall = {
        engineId: this.currentEngine.id,
        version: this.currentVersion,
        name: this.currentEngine.meta.name,
      };
      launchBtn.disabled = true;
      this.setupDownloadActions(launchBtn, downloadActions);
      if (activeTask.state === "installing")
        launchBtn.textContent = t("downloads.installing");
      this.renderDownloadProgress(activeTask.progressInfo);
      engineInstallToast.hide(this.activeInstall);
      return;
    }
    this.activeInstall = null;
    if (downloadActions) downloadActions.hidden = true;
    const versionData = this.currentEngine.versions.find(
      (v) => v.version === this.currentVersion,
    );
    if (!versionData) {
      launchBtn.textContent = t("engines.unavailable");
      launchBtn.disabled = true;
      if (dlUI) dlUI.style.display = "none";
      return;
    }
    const isInstalled = await FS.isEngineInstalled(
      this.currentEngine.id,
      this.currentVersion,
    );
    /**
     * @fix 2026-08-05T04:31:52.365Z - Fix TypeError Cannot read properties of null (reading 'replaceChild') in updateButtonState
     */
    const currentBtn = document.getElementById("launch-engine-btn");
    if (!currentBtn || !currentBtn.parentNode) return;
    const newBtn = currentBtn.cloneNode(true);
    currentBtn.parentNode.replaceChild(newBtn, currentBtn);
    const activeBtn = newBtn;

    if (isInstalled) {
      activeBtn.textContent = t("engines.launch");
      activeBtn.disabled = false;
      if (dlUI) dlUI.style.display = "none";
      let isLaunched = FS.isEngineRunning(
        this.currentEngine.id,
        this.currentVersion,
      );
      const showLaunched = () => {
        isLaunched = true;
        activeBtn.disabled = false;
        activeBtn.classList.add("engine-running");
        const tpl = document.getElementById("tpl-engine-launch-running");
        if (tpl) {
          activeBtn.replaceChildren(tpl.content.cloneNode(true));
          i18n.apply(activeBtn);
        } else {
          const launchSpan = document.createElement("span");
          launchSpan.className = "engine-launch-label";
          launchSpan.textContent = t("engines.launched");
          const closeSpan = document.createElement("span");
          closeSpan.className = "engine-close-label";
          closeSpan.textContent = t("common.close");
          activeBtn.replaceChildren(launchSpan, closeSpan);
        }
      };
      if (isLaunched) showLaunched();
      activeBtn.addEventListener("click", async () => {
        if (isLaunched) {
          activeBtn.disabled = true;
          activeBtn.classList.remove("engine-running");
          activeBtn.textContent = t("engines.closing");
          await FS.closeEngine(
            this.currentEngine.id,
            this.currentVersion,
            (state) => {
              if (state === "error") {
                showLaunched();
              }
            },
          );
          return;
        }

        activeBtn.disabled = true;
        activeBtn.textContent = t("engines.running");
        await modsMaster.injectBeforeLaunch(
          this.currentEngine.id,
          this.currentVersion,
        );

        // Settings: Hide on launch
        if (appSettings.get("hideOnLaunch")) {
          Neutralino.window.hide();
        }

        await FS.runEngine(
          this.currentEngine.id,
          this.currentVersion,
          async (state) => {
            if (state === "launched" || state === "already_running") {
              showLaunched();
            } else if (
              state === "completed" ||
              state === "error" ||
              state === "not_found"
            ) {
              // Settings: Show back when closed
              if (appSettings.get("hideOnLaunch")) {
                Neutralino.window.show();
                Neutralino.window.focus();
              }

              isLaunched = false;
              activeBtn.classList.remove("engine-running");
              activeBtn.disabled = false;
              activeBtn.textContent = t("engines.launch");
              await modsMaster.cleanupAfterExit(
                this.currentEngine.id,
                this.currentVersion,
              );
            }
          },
        );
      });
    } else {
      const downloadUrl = getTargetLink(versionData);
      if (!downloadUrl) {
        activeBtn.textContent = t("engines.unsupportedOs");
        activeBtn.disabled = true;
        if (dlUI) dlUI.style.display = "none";
        return;
      }
      activeBtn.textContent = t("common.download");
      activeBtn.disabled = false;
      activeBtn.addEventListener("click", async () => {
        activeBtn.disabled = true;
        this.activeInstall = {
          engineId: this.currentEngine.id,
          version: this.currentVersion,
          name: this.currentEngine.meta.name,
        };
        const install = this.activeInstall;
        const installKey = `${install.engineId}:${install.version}`;
        this.setupDownloadActions(activeBtn, downloadActions);
        this.renderDownloadProgress({
          progress: 0,
          status: t("engines.startingDownload"),
        });
        const success = await downloadEngine.install(
          this.currentEngine.id,
          this.currentVersion,
          downloadUrl,
          (progressInfo) => {
            const progress = Math.min(
              100,
              Math.max(0, Number(progressInfo?.progress) || 0),
            );
            const status = String(progressInfo?.status || t("engines.working"));
            this.downloadProgress = progress;
            this.renderDownloadProgress({ progress, status });
            if (!this.isVisible)
              engineInstallToast.update(install, {
                progress,
                status,
              });
          },
          (state) => this.updateInstallState(state),
          { expectedSize: getTargetSize(versionData) },
        );
        const wasCancelled = this.cancelledInstall === installKey;
        if (wasCancelled && this.rollbackPromise) await this.rollbackPromise;
        const finishedInstall = install;
        this.activeInstall = null;
        if (downloadActions) downloadActions.hidden = true;
        if (wasCancelled) {
          engineInstallToast.hide(finishedInstall);
          this.cancelledInstall = null;
          if (dlUI) dlUI.style.display = "none";
          this.updateButtonState();
          return;
        }
        if (success) {
          if (!this.isVisible) engineInstallToast.complete(finishedInstall);
          await rememberInstalledEngineBuild(
            this.currentEngine.id,
            versionData,
          );
          if (dlUI) dlUI.style.display = "none";
          await this.updateButtonState(); // Actualiza a "Launch"

          document.dispatchEvent(new CustomEvent("mods-updated"));

          // Settings: Autostart Engine after download!
          if (appSettings.get("autoStartAfterDownload")) {
            setTimeout(() => {
              const freshBtn = document.getElementById("launch-engine-btn");
              if (
                freshBtn &&
                !freshBtn.disabled &&
                freshBtn.textContent === t("engines.launch")
              ) {
                freshBtn.click();
              }
            }, 500); // Pequeño retraso para evitar bugs de la UI
          }
        } else {
          if (!this.isVisible)
            engineInstallToast.error(
              finishedInstall,
              t("engines.installationFailed"),
            );
          if (dlText)
            dlText.textContent = `0% - ${t("engines.downloadFailed")}`;
          if (dlTextSizer)
            dlTextSizer.textContent = `0% - ${t("engines.downloadFailed")}`;
          if (dlTrackTextSizer)
            dlTrackTextSizer.textContent = `0% - ${t("engines.downloadFailed")}`;
          activeBtn.disabled = false;
          activeBtn.textContent = t("engines.retryDownload");
        }
      });
    }
  },
  renderDownloadProgress(progressInfo) {
    const dlUI = document.getElementById("download-ui");
    const dlText = document.getElementById("dl-text");
    const dlTextSizer = document.getElementById("dl-text-sizer");
    const dlTrackTextSizer = document.getElementById("dl-track-text-sizer");
    const dlActiveLayer = document.getElementById("dl-active-layer");
    const progress = Math.min(
      100,
      Math.max(0, Number(progressInfo?.progress) || 0),
    );
    const status = localizeProgressStatus(
      progressInfo?.status || t("engines.working"),
    );
    const progressText = `${Math.floor(progress)}% - ${status}`;
    if (dlUI) dlUI.style.display = "block";
    if (dlText) dlText.textContent = progressText;
    if (dlTextSizer) dlTextSizer.textContent = progressText;
    if (dlTrackTextSizer) dlTrackTextSizer.textContent = progressText;
    if (dlActiveLayer)
      dlActiveLayer.style.clipPath = `inset(0 ${100 - progress}% 0 0)`;
  },
  setupDownloadActions(activeBtn, downloadActions) {
    if (!downloadActions || !this.activeInstall) return;
    downloadActions.hidden = false;
    const cancelBtn = document.getElementById("cancel-engine-download-btn");
    const { engineId, version } = this.activeInstall;
    if (!cancelBtn) {
      activeBtn.textContent = t("downloads.downloading");
      return;
    }
    cancelBtn.onclick = async () => {
      cancelBtn.disabled = true;
      this.cancelledInstall = `${engineId}:${version}`;
      this.rollbackPromise = this.animateRollback();
      await downloadEngine.cancel(engineId, version);
    };
    activeBtn.textContent = t("downloads.downloading");
  },
  updateInstallState(state) {
    const activeBtn = document.getElementById("launch-engine-btn");
    const cancelBtn = document.getElementById("cancel-engine-download-btn");
    if (!activeBtn) return;
    if (state === "downloading") {
      activeBtn.textContent = t("downloads.downloading");
    } else if (state === "installing") {
      activeBtn.textContent = t("downloads.installing");
    } else if (state === "cancelled") {
      activeBtn.textContent = t("engines.cancelled");
      if (cancelBtn) cancelBtn.disabled = true;
    }
  },
  animateRollback() {
    const dlText = document.getElementById("dl-text");
    const dlTextSizer = document.getElementById("dl-text-sizer");
    const dlTrackTextSizer = document.getElementById("dl-track-text-sizer");
    const dlActiveLayer = document.getElementById("dl-active-layer");
    let progress = Math.max(0, this.downloadProgress || 0);
    return new Promise((resolve) => {
      const rollback = () => {
        progress = Math.max(0, progress - Math.max(2, progress / 12));
        const message = `${Math.ceil(progress)}% - ${t("engines.rollingBack")}`;
        if (dlText) dlText.textContent = message;
        if (dlTextSizer) dlTextSizer.textContent = message;
        if (dlTrackTextSizer) dlTrackTextSizer.textContent = message;
        if (dlActiveLayer)
          dlActiveLayer.style.clipPath = `inset(0 ${100 - progress}% 0 0)`;
        if (progress > 0) {
          setTimeout(rollback, 35);
        } else {
          resolve();
        }
      };
      rollback();
    });
  },
};

export function registerEnginesView() {
  appEvents.addEventListener("view:loaded", (event) => {
    if (event.detail === "engines") enginesView.init();
    else enginesView.destroy();
  });
}
