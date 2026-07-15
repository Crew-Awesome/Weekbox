import { appEvents } from "../../core/events.js";
import { getSelectedEngine } from "../../core/state.js";
import { engineDropdown } from "./dropdown.js";
import { getTargetLink } from "./utils.js";
import { FS } from "../../utils/filesystem.js";
import { downloadEngine } from "./downloadEngine.js";
import { modsMaster } from "./modsMasterClass.js";
import { rememberInstalledEngineBuild } from "./engineUpdateService.js";

export const enginesView = {
  async init() {
    const engine = getSelectedEngine();
    if (!engine) return;
    this.currentEngine = engine;
    document.getElementById("engine-display-title").textContent =
      engine.meta.name;
    const bottomIcon = document.getElementById("engine-bottom-icon");
    if (engine.meta.icon) {
      bottomIcon.src = `assets/icons/${engine.meta.icon}`;
      bottomIcon.style.display = "block";
    } else {
      bottomIcon.style.display = "none";
    }
    if (!FS.isInitialized) await FS.init();
    engineDropdown.setup(engine, (version) => {
      this.currentVersion = version;
      this.updateButtonState();
    });
  },
  destroy() {
    engineDropdown.destroy();
  },
  async updateButtonState() {
    const launchBtn = document.getElementById("launch-engine-btn");
    const dlUI = document.getElementById("download-ui");
    const dlText = document.getElementById("dl-text");
    const dlTextSizer = document.getElementById("dl-text-sizer");
    const dlActiveLayer = document.getElementById("dl-active-layer");
    const downloadActions = document.getElementById("engine-download-actions");

    if (!launchBtn) return;
    if (this.activeInstall) {
      launchBtn.disabled = true;
      return;
    }
    if (downloadActions) downloadActions.hidden = true;

    const versionData = this.currentEngine.versions.find(
      (v) => v.version === this.currentVersion,
    );

    if (!versionData) {
      launchBtn.textContent = "Unavailable";
      launchBtn.disabled = true;
      if (dlUI) dlUI.style.display = "none";
      return;
    }

    const isInstalled = await FS.isEngineInstalled(
      this.currentEngine.id,
      this.currentVersion,
    );

    const newBtn = launchBtn.cloneNode(true);
    launchBtn.parentNode.replaceChild(newBtn, launchBtn);
    const activeBtn = document.getElementById("launch-engine-btn");

    if (isInstalled) {
      activeBtn.textContent = "Launch";
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
        activeBtn.innerHTML =
          '<span class="engine-launch-label">Launched</span><span class="engine-close-label">Close</span>';
      };

      if (isLaunched) showLaunched();

      activeBtn.addEventListener("click", async () => {
        if (isLaunched) {
          activeBtn.disabled = true;
          activeBtn.classList.remove("engine-running");
          activeBtn.textContent = "Closing...";
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
        activeBtn.textContent = "Running...";
        await modsMaster.injectBeforeLaunch(
          this.currentEngine.id,
          this.currentVersion,
        );
        await FS.runEngine(
          this.currentEngine.id,
          this.currentVersion,
          async (state) => {
            if (state === "launched") {
              showLaunched();
            } else if (state === "already_running") {
              showLaunched();
            } else if (
              state === "completed" ||
              state === "error" ||
              state === "not_found"
            ) {
              isLaunched = false;
              activeBtn.classList.remove("engine-running");
              activeBtn.disabled = false;
              activeBtn.textContent = "Launch";
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
        activeBtn.textContent = "Unsupported OS";
        activeBtn.disabled = true;
        if (dlUI) dlUI.style.display = "none";
        return;
      }
      activeBtn.textContent = "Download";
      activeBtn.disabled = false;
      activeBtn.addEventListener("click", async () => {
        activeBtn.disabled = true;
        this.activeInstall = {
          engineId: this.currentEngine.id,
          version: this.currentVersion,
        };
        const installKey = `${this.activeInstall.engineId}:${this.activeInstall.version}`;
        this.setupDownloadActions(activeBtn, downloadActions);
        if (dlUI) {
          dlUI.style.display = "block";
          const initialText = "0% - Starting download...";
          if (dlText) dlText.textContent = initialText;
          if (dlTextSizer) dlTextSizer.textContent = initialText;
          if (dlActiveLayer) dlActiveLayer.style.clipPath = `inset(0 100% 0 0)`;
        }
        const success = await downloadEngine.install(
          this.currentEngine.id,
          this.currentVersion,
          downloadUrl,
          (progressInfo) => {
            const progress = Math.min(
              100,
              Math.max(0, Number(progressInfo?.progress) || 0),
            );
            const status = String(progressInfo?.status || "Working...");
            this.downloadProgress = progress;
            const p = Math.floor(progress);
            const progressText = status.startsWith("Extracting:")
              ? "Installing files..."
              : `${p}% - ${status}`;
            if (dlText) dlText.textContent = progressText;
            if (dlTextSizer) dlTextSizer.textContent = progressText;
            if (dlActiveLayer) {
              dlActiveLayer.style.clipPath = `inset(0 ${100 - progress}% 0 0)`;
            }
          },
          (state) => this.updateInstallState(state, activeBtn),
        );
        const wasCancelled = this.cancelledInstall === installKey;
        if (wasCancelled && this.rollbackPromise) await this.rollbackPromise;
        this.activeInstall = null;
        if (downloadActions) downloadActions.hidden = true;
        if (wasCancelled) {
          this.cancelledInstall = null;
          if (dlUI) dlUI.style.display = "none";
          this.updateButtonState();
          return;
        }
        if (success) {
          rememberInstalledEngineBuild(this.currentEngine.id, versionData);
          if (dlUI) dlUI.style.display = "none";
          this.updateButtonState();
        } else {
          if (dlText) dlText.textContent = "0% - Download failed";
          if (dlTextSizer) dlTextSizer.textContent = "0% - Download failed";
          activeBtn.disabled = false;
          activeBtn.textContent = "Retry Download";
        }
      });
    }
  },
  setupDownloadActions(activeBtn, downloadActions) {
    if (!downloadActions || !this.activeInstall) return;
    downloadActions.hidden = false;
    const cancelBtn = document.getElementById("cancel-engine-download-btn");
    const { engineId, version } = this.activeInstall;
    cancelBtn.onclick = async () => {
      cancelBtn.disabled = true;
      this.cancelledInstall = `${engineId}:${version}`;
      this.rollbackPromise = this.animateRollback();
      await downloadEngine.cancel(engineId, version);
    };
    activeBtn.textContent = "Downloading...";
  },
  updateInstallState(state, activeBtn) {
    const cancelBtn = document.getElementById("cancel-engine-download-btn");
    if (state === "downloading") {
      activeBtn.textContent = "Downloading...";
    } else if (state === "installing") {
      activeBtn.textContent = "Installing...";
    } else if (state === "cancelled") {
      activeBtn.textContent = "Cancelled";
      if (cancelBtn) cancelBtn.disabled = true;
    }
  },
  animateRollback() {
    const dlText = document.getElementById("dl-text");
    const dlTextSizer = document.getElementById("dl-text-sizer");
    const dlActiveLayer = document.getElementById("dl-active-layer");
    let progress = Math.max(0, this.downloadProgress || 0);
    return new Promise((resolve) => {
      const rollback = () => {
        progress = Math.max(0, progress - Math.max(2, progress / 12));
        const message = `${Math.ceil(progress)}% - Rolling back...`;
        if (dlText) dlText.textContent = message;
        if (dlTextSizer) dlTextSizer.textContent = message;
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
