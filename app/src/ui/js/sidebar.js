import { router } from "../../backend/core/routing/router.service.js";
import {
  getSelectedEngine,
  setSelectedEngine,
} from "../../backend/core/state/state.service.js";
import { getEngineReleaseVersions } from "../../backend/providers/github/github-release.provider.js";
import { modManagerModal } from "./mod-manager/index.js";
import { engineManagerModal } from "./engine-manager/index.js";
import { engineUpdateService } from "./engines/engineUpdateService.js";
import { FS } from "../utils/index-utils.js";
import { configModal } from "./config/index.js";
import { networkStatus } from "../../backend/core/system/network-status.service.js";
import { appEvents } from "../../backend/core/routing/events.service.js";

export const sidebar = {
  updateEngineMarquee(button) {
    const container = button.querySelector(".sidebar__marquee-container");
    const label = button.querySelector(".sidebar__marquee-text");
    if (!container || !label) return;
    requestAnimationFrame(() => {
      const distance = Math.max(0, label.scrollWidth - container.clientWidth);
      label.classList.toggle("sidebar__marquee-text--overflowing", distance > 1);
      label.style.setProperty("--marquee-distance", `${distance}px`);
      label.title = distance > 1 ? label.textContent : "";
    });
  },
  refreshEngineMarquees() {
    document
      .querySelectorAll(".sidebar__engine-btn")
      .forEach((button) => this.updateEngineMarquee(button));
  },
  async init() {
    this.sidebar = document.getElementById("sidebar");
    this.resizer = document.getElementById("sidebar-resizer");
    this.tabButtons = document.querySelectorAll(".sidebar__btn[data-tab]");
    this.modManagerBtn = document.getElementById("mod-manager-btn");
    this.engineManagerBtn = document.getElementById("engine-manager-btn");
    this.configBtn = document.getElementById("config-btn");
    this.brandBtn = document.getElementById("sidebar-brand-btn");
    this.isResizing = false;
    if (!this.sidebar) return;
    this.setupResizer();
    this.setupNavigation();
    this.viewChangeListener = (event) => this.syncActive(event.detail);
    appEvents.addEventListener("view:loaded", this.viewChangeListener);
    this.setupBrandButton();
    this.networkStatusListener = () => {
      void this.refreshNetworkFeatures();
    };
    networkStatus.addEventListener("change", this.networkStatusListener);
    await this.refreshNetworkFeatures();
  },
  setupResizer() {
    if (!this.resizer) return;
    this.resizer.addEventListener("mousedown", () => {
      this.isResizing = true;
      document.body.style.cursor = "ew-resize";
      this.resizer.classList.add("sidebar__resizer--resizing");
    });
    document.addEventListener("mousemove", (e) => {
      if (!this.isResizing) return;
      let newWidth = e.clientX;
      if (newWidth < 200) newWidth = 200;
      if (newWidth > 500) newWidth = 500;
      this.sidebar.style.width = `${newWidth}px`;
      this.refreshEngineMarquees();
    });
    document.addEventListener("mouseup", () => {
      if (this.isResizing) {
        this.isResizing = false;
        document.body.style.cursor = "default";
        this.resizer.classList.remove("sidebar__resizer--resizing");
      }
    });
  },
  setActive(button) {
    const buttons = [
      ...this.tabButtons,
      this.modManagerBtn,
      this.engineManagerBtn,
      this.configBtn,
      ...document.querySelectorAll(".sidebar__engine-btn"),
    ].filter(Boolean);
    buttons.forEach((candidate) => {
      candidate.classList.remove("sidebar__btn--active");
      candidate.classList.toggle("active", candidate === button);
    });
  },
  syncActive(viewId = router.currentViewId) {
    if (viewId === "engines") {
      const selected = getSelectedEngine();
      const button = [...document.querySelectorAll(".sidebar__engine-btn")].find(
        (candidate) => candidate.dataset.engineId === String(selected?.id || ""),
      );
      if (button) this.setActive(button);
      return;
    }
    if (viewId !== "home" && viewId !== "news") return;
    const button = [...this.tabButtons].find(
      (candidate) => candidate.dataset.tab === viewId,
    );
    if (button) this.setActive(button);
  },
  setupNavigation() {
    this.tabButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        this.setActive(btn);
        const viewToLoad = btn.getAttribute("data-tab");
        void router.navigate(viewToLoad);
      });
    });
    if (this.modManagerBtn) {
      this.modManagerBtn.addEventListener("click", () => {
        this.setActive(this.modManagerBtn);
        void modManagerModal.open();
      });
    }
    if (this.engineManagerBtn) {
      this.engineManagerBtn.addEventListener("click", () => {
        this.setActive(this.engineManagerBtn);
        void engineManagerModal.open();
      });
    }
    if (this.configBtn) {
      this.configBtn.addEventListener("click", () => {
        this.setActive(this.configBtn);
        void configModal.open();
      });
    }
  },
  setupBrandButton() {
    if (!this.brandBtn) return;
    const brandIcon = this.brandBtn.querySelector(".sidebar__brand-icon");
    if (!brandIcon) return;
    this.brandBtn.addEventListener("click", () => {
      brandIcon.animate(
        [{ transform: "rotate(0deg)" }, { transform: "rotate(360deg)" }],
        {
          duration: 420,
          easing: "linear",
          composite: "add",
          fill: "forwards",
        },
      );
    });
  },
  async refreshNetworkFeatures() {
    const enginesContainer = document.getElementById("engines-container");
    enginesContainer?.classList.toggle("is-offline", !networkStatus.online);
    enginesContainer?.setAttribute(
      "aria-disabled",
      String(!networkStatus.online),
    );
    const networkIndicator = document.getElementById("sidebar-network-status");
    networkIndicator?.classList.toggle("is-online", networkStatus.online);
    networkIndicator?.classList.toggle("is-offline", !networkStatus.online);
    networkIndicator?.setAttribute(
      "aria-label",
      networkStatus.online ? "Online" : "Offline",
    );
    networkIndicator?.setAttribute(
      "title",
      networkStatus.online ? "Online" : "Offline",
    );
    await this.loadEngines();
    await this.loadStandaloneMods();
    if (networkStatus.online) engineUpdateService.startScheduledChecks();
    if (!networkStatus.online && router.currentViewId === "engines") {
      await router.navigate("home");
    }
  },
  openEngine(engineId) {
    const button = document.querySelector(
      `.sidebar__engine-btn[data-engine-id="${engineId}"]`,
    );
    if (!button) return false;
    button.click();
    return true;
  },
  extractVersionFromUrl(url) {
    if (!url) return "Unknown";
    const githubMatch = url.match(/\/download\/(v?([^\/]+))\//);
    if (githubMatch && githubMatch[2]) return githubMatch[2];
    const genericMatch = url.match(/(?:v|-)?(\d+\.\d+(?:\.\d+)?)/i);
    if (genericMatch && genericMatch[1]) return genericMatch[1];
    return "Unknown";
  },
  async loadEngines() {
    const wrapper = document.getElementById("engines-wrapper");
    if (!wrapper) return;
    try {
      const response = await fetch("src/backend/data/engines-router.json");
      if (!response.ok) throw new Error("Failed to load engines-router.json");
      const enginesRouter = await response.json();
      wrapper.innerHTML = "";
      for (const engineDef of enginesRouter) {
        const displayName = engineDef.name;
        const iconSrc = engineDef.icon ? `assets/icons/${engineDef.icon}` : "";
        const btn = document.createElement("button");
        btn.className = "sidebar__btn sidebar__engine-btn";
        btn.dataset.engineId = engineDef.versions;
        btn.disabled = !networkStatus.online;
        btn.title = networkStatus.online
          ? ""
          : "Connect to the internet to browse engine releases";
        btn.innerHTML = `
          <img src="${iconSrc}" class="sidebar__engine-icon" onerror="this.onerror=null; this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 512 512\\'><path fill=\\'%23888\\' d=\\'M448 32H64C28.65 32 0 60.65 0 96v320c0 35.35 28.65 64 64 64h384c35.35 0 64-28.65 64-64V96C512 60.65 483.3 32 448 32zM212.7 222.7L132.7 302.7C126.4 308.9 118.2 312 110.1 312s-16.38-3.125-22.62-9.375c-12.5-12.5-12.5-32.75 0-45.25L155.3 189.3l-67.88-67.88c-12.5-12.5-12.5-32.75 0-45.25s32.75-12.5 45.25 0l102.6 102.6C247.7 191.3 247.7 210.2 212.7 222.7zM384 320c-17.67 0-32-14.33-32-32s14.33-32 32-32h32c17.67 0 32 14.33 32 32s-14.33 32-32 32H384z\\'/></svg>'">
          <div class="sidebar__marquee-container"><span class="sidebar__marquee-text">${displayName}</span></div>
        `;
        btn.addEventListener("click", async () => {
          this.setActive(btn);
          try {
            const label = btn.querySelector(".sidebar__marquee-text");
            const container = btn.querySelector(".sidebar__marquee-container");
            const originalText = label.textContent;
            container.innerHTML =
              `<i class="fa-solid fa-spinner fa-spin" style="margin-right:4px;"></i> Loading...`;
            const releaseVersions = await getEngineReleaseVersions(
              engineDef.versions,
            );
            if (releaseVersions.length === 0)
              throw new Error("No compatible releases available");
            const processedVersionsData = releaseVersions.map((item) => {
              const sampleLink =
                item.win ||
                item.win64 ||
                item.win32 ||
                item.lin ||
                item.mac ||
                item.mac64 ||
                item.macarm ||
                "";
              return {
                ...item,
                version: item.version || this.extractVersionFromUrl(sampleLink),
              };
            });
            processedVersionsData.sort((a, b) => {
              if (a.isNightly) return -1;
              if (b.isNightly) return 1;
              return b.version.localeCompare(a.version, undefined, {
                numeric: true,
                sensitivity: "base",
              });
            });
            container.innerHTML = `<span class="sidebar__marquee-text">${originalText}</span>`;
            setSelectedEngine({
              id: engineDef.versions,
              meta: { name: engineDef.name, icon: engineDef.icon },
              versions: processedVersionsData,
            });
            router.navigate("engines");
          } catch (err) {
            console.error(err);
            btn.querySelector(".sidebar__marquee-container").innerHTML =
              `<span class="sidebar__marquee-text">${displayName}</span>`;
            alert(`Could not load version information for ${displayName}`);
          }
        });
        wrapper.appendChild(btn);
        this.updateEngineMarquee(btn);
      }
    } catch (error) {
      console.error(error);
      wrapper.innerHTML = `<p style="color:red; padding:8px; font-size:12px;">Failed to load engine router</p>`;
    }
  },
  async loadStandaloneMods() {
    if (!FS.isInitialized) return;
    const existingContainer = document.getElementById(
      "standalone-mods-container",
    );
    if (existingContainer) existingContainer.remove();
    const existingWrapper = document.getElementById("standalone-mods-wrapper");
    const existingDivider = document.getElementById("standalone-mods-divider");
    const existingTitle = document.getElementById("standalone-mods-title");
    if (existingWrapper) existingWrapper.remove();
    if (existingDivider) existingDivider.remove();
    if (existingTitle) existingTitle.remove();
    const allStandaloneMods = await FS.getStandaloneMods();
    const standaloneMods = allStandaloneMods.filter((mod) => !mod.hidden);
    if (standaloneMods.length === 0) return;
    const sidebarNav = document.querySelector(".sidebar__nav");
    if (!sidebarNav) return;
    const container = document.createElement("div");
    container.className = "sidebar__list";
    container.id = "standalone-mods-container";
    const divider = document.createElement("div");
    divider.className = "sidebar__divider";
    container.appendChild(divider);
    const sectionTitle = document.createElement("p");
    sectionTitle.className = "sidebar__title";
    sectionTitle.textContent = "Standalone Mods";
    container.appendChild(sectionTitle);
    const wrapper = document.createElement("div");
    wrapper.className = "sidebar__wrapper";
    wrapper.id = "standalone-mods-wrapper";
    container.appendChild(wrapper);
    sidebarNav.appendChild(container);
    for (const mod of standaloneMods) {
      const btn = document.createElement("button");
      btn.className = "sidebar__btn sidebar__engine-btn sidebar__standalone-btn";
      const iconSrc =
        mod.icoPath ||
        "data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 512 512\\'><path fill=\\'%23888\\' d=\\'M448 32H64C28.65 32 0 60.65 0 96v320c0 35.35 28.65 64 64 64h384c35.35 0 64-28.65 64-64V96C512 60.65 483.3 32 448 32zM212.7 222.7L132.7 302.7C126.4 308.9 118.2 312 110.1 312s-16.38-3.125-22.62-9.375c-12.5-12.5-12.5-32.75 0-45.25L155.3 189.3l-67.88-67.88c-12.5-12.5-12.5-32.75 0-45.25s32.75-12.5 45.25 0l102.6 102.6C247.7 191.3 247.7 210.2 212.7 222.7zM384 320c-17.67 0-32-14.33-32-32s14.33-32 32-32h32c17.67 0 32 14.33 32 32s-14.33 32-32 32H384z\\'/></svg>";
      btn.innerHTML = `
        <img src="${iconSrc}" class="sidebar__engine-icon" onerror="this.onerror=null; this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 512 512\\'><path fill=\\'%23888\\' d=\\'M448 32H64C28.65 32 0 60.65 0 96v320c0 35.35 28.65 64 64 64h384c35.35 0 64-28.65 64-64V96C512 60.65 483.3 32 448 32zM212.7 222.7L132.7 302.7C126.4 308.9 118.2 312 110.1 312s-16.38-3.125-22.62-9.375c-12.5-12.5-12.5-32.75 0-45.25L155.3 189.3l-67.88-67.88c-12.5-12.5-12.5-32.75 0-45.25s32.75-32.75 45.25 0l102.6 102.6C247.7 191.3 247.7 210.2 212.7 222.7zM384 320c-17.67 0-32-14.33-32-32s14.33-32 32-32h32c17.67 0 32 14.33 32 32s-14.33 32-32 32H384z\\'/></svg>'">
        <div class="sidebar__marquee-container"><span class="sidebar__marquee-text">${mod.name}</span></div>
      `;
      btn.addEventListener("click", async () => {
        if (btn.classList.contains("running")) {
          const process = FS.activeEngineProcesses.get(`standalone:${mod.id}`);
          if (process) {
            btn.querySelector(".sidebar__marquee-container").innerHTML =
              `<i class="fa-solid fa-spinner fa-spin" style="margin-right:4px;"></i> Closing...`;
            Neutralino.os
              .updateSpawnedProcess(process.id, "exit")
              .catch(() => {});
          }
          return;
        }
        this.setActive(btn);
        const originalText = btn.querySelector(".sidebar__marquee-text").textContent;
        btn.querySelector(".sidebar__marquee-container").innerHTML = `
          <div style="display: flex; align-items: center; gap: 8px;">
            <i class="fa-solid fa-stop" style="color: #ff4a4a;" title="Stop"></i>
            <span>Launched</span>
          </div>
        `;
        btn.classList.add("running");
        await FS.runStandaloneMod(mod.id, () => {
          btn.querySelector(".sidebar__marquee-container").innerHTML =
            `<span class="sidebar__marquee-text">${originalText}</span>`;
          this.updateEngineMarquee(btn);
          btn.classList.remove("running");
          this.syncActive();
        });
      });
      wrapper.appendChild(btn);
      this.updateEngineMarquee(btn);
    }
  },
};
