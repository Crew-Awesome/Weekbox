import { router } from "../../backend/core/routing/router.service.js";
import {
  getSelectedEngine,
  setSelectedEngine,
} from "../../backend/core/state/state.service.js";
import { getEngineReleaseVersions } from "../../backend/providers/github/github-release.provider.js";
import { modManagerModal } from "./mod-manager/index.js";
import { engineManagerModal } from "./engine-manager/index.js";
import { engineUpdateService } from "./engines/engineUpdateService.js";
import { FS } from "../../backend/services/filesystem.js";
import { configModal } from "./config/index.js";
import { networkStatus } from "../../backend/core/system/network-status.service.js";
import { appEvents } from "../../backend/core/routing/events.service.js";
import { getEngineLabel, getEngineLabelKey, t } from "./i18n/index.js";
import { ENGINE_DETAILS } from "../../backend/config/engines.config.js";

const SIDEBAR_WIDTH_KEY = "weekbox_sidebar_width";
const SIDEBAR_COLLAPSED_KEY = "weekbox_sidebar_collapsed";
const MIN_SIDEBAR_WIDTH = 200;
const MAX_SIDEBAR_WIDTH = 500;

export const sidebar = {
  updateEngineMarquee(button) {
    const container = button.querySelector(".sidebar__marquee-container");
    const label = button.querySelector(".sidebar__marquee-text");
    if (!container || !label) return;
    requestAnimationFrame(() => {
      const distance = Math.max(0, label.scrollWidth - container.clientWidth);
      label.classList.toggle(
        "sidebar__marquee-text--overflowing",
        distance > 1,
      );
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
    this.collapseBtn = document.getElementById("sidebar-collapse-btn");
    this.sidebarNav = document.querySelector(".sidebar__nav");
    this.tabButtons = document.querySelectorAll(".sidebar__btn[data-tab]");
    this.modManagerBtn = document.getElementById("mod-manager-btn");
    this.engineManagerBtn = document.getElementById("engine-manager-btn");
    this.configBtn = document.getElementById("config-btn");
    this.brandBtn = document.getElementById("sidebar-brand-btn");
    this.isResizing = false;
    if (!this.sidebar) return;
    this.applySavedWidth();
    this.setupCollapse();
    this.setupCollapsibleSections();
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
    const stopResizing = () => {
      if (!this.isResizing) return;
      this.isResizing = false;
      document.body.style.cursor = "";
      this.sidebar.classList.remove("sidebar--resizing");
      this.resizer.classList.remove("sidebar__resizer--resizing");
    };
    this.resizer.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      this.isResizing = true;
      document.body.style.cursor = "ew-resize";
      this.sidebar.classList.add("sidebar--resizing");
      this.resizer.classList.add("sidebar__resizer--resizing");
      this.resizer.setPointerCapture?.(event.pointerId);
    });
    document.addEventListener("pointermove", (event) => {
      if (!this.isResizing) return;
      this.setWidth(event.clientX);
    });
    document.addEventListener("pointerup", stopResizing);
    document.addEventListener("pointercancel", stopResizing);
    this.resizer.addEventListener("dblclick", () => this.setWidth(280));
    this.resizer.addEventListener("keydown", (event) => {
      const step = event.shiftKey ? 40 : 16;
      if (event.key === "ArrowLeft") this.setWidth(this.getWidth() - step);
      else if (event.key === "ArrowRight")
        this.setWidth(this.getWidth() + step);
      else if (event.key === "Home") this.setWidth(MIN_SIDEBAR_WIDTH);
      else if (event.key === "End") this.setWidth(MAX_SIDEBAR_WIDTH);
      else return;
      event.preventDefault();
    });
  },
  getWidth() {
    return this.sidebar.getBoundingClientRect().width;
  },
  setWidth(width) {
    const newWidth = Math.min(
      MAX_SIDEBAR_WIDTH,
      Math.max(MIN_SIDEBAR_WIDTH, Math.round(width)),
    );
    this.sidebar.style.width = `${newWidth}px`;
    this.resizer?.setAttribute("aria-valuenow", String(newWidth));
    try {
      localStorage.setItem(SIDEBAR_WIDTH_KEY, String(newWidth));
    } catch {}
    this.refreshEngineMarquees();
  },
  applySavedWidth() {
    let savedWidth = 280;
    try {
      savedWidth =
        Number(localStorage.getItem(SIDEBAR_WIDTH_KEY)) || savedWidth;
    } catch {}
    this.setWidth(savedWidth);
  },
  setupCollapse() {
    if (!this.collapseBtn) return;
    let collapsed = false;
    try {
      collapsed = localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
    } catch {}
    this.setCollapsed(collapsed);
    this.collapseBtn.addEventListener("click", () =>
      this.setCollapsed(!this.sidebar.classList.contains("sidebar--collapsed")),
    );
  },
  setCollapsed(collapsed) {
    this.sidebar.classList.toggle("sidebar--collapsed", collapsed);
    this.collapseBtn?.setAttribute("aria-expanded", String(!collapsed));
    if (this.collapseBtn) {
      const label = t(collapsed ? "sidebar.expand" : "sidebar.collapse");
      this.collapseBtn.setAttribute("aria-label", label);
      this.collapseBtn.title = label;
      this.collapseBtn.innerHTML = `<i class="fa-solid fa-angles-${collapsed ? "right" : "left"}" aria-hidden="true"></i>`;
    }
    this.updateCollapsedTooltips();
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
    } catch {}
  },
  updateCollapsedTooltips() {
    if (!this.sidebar) return;
    const collapsed = this.sidebar.classList.contains("sidebar--collapsed");
    this.sidebar.querySelectorAll(".sidebar__btn").forEach((button) => {
      if (button.dataset.defaultTitle === undefined) {
        button.dataset.defaultTitle = button.title;
      }
      if (!collapsed) {
        button.title = button.dataset.defaultTitle;
        return;
      }
      const label =
        button.querySelector(".sidebar__marquee-text")?.textContent?.trim() ||
        button.querySelector(":scope > span")?.textContent?.trim();
      if (label) button.title = label;
    });
  },
  setupCollapsibleSections(root = this.sidebar) {
    const sections = [];
    if (root?.matches?.(".sidebar__section[data-section-key]")) {
      sections.push(root);
    }
    root
      ?.querySelectorAll?.(".sidebar__section[data-section-key]")
      .forEach((section) => sections.push(section));
    sections.forEach((section) => {
      if (section.dataset.sectionReady) return;
      section.dataset.sectionReady = "true";
      const key = `weekbox_sidebar_section_${section.dataset.sectionKey}`;
      try {
        const saved = localStorage.getItem(key);
        if (saved !== null) section.open = saved === "true";
      } catch {}
      section.addEventListener("toggle", () => {
        try {
          localStorage.setItem(key, String(section.open));
        } catch {}
      });
    });
  },
  setupSectionResizer(handle) {
    if (!handle || handle.dataset.sectionResizerReady) return;
    const before = document.getElementById(handle.dataset.before);
    const after = document.getElementById(handle.dataset.after);
    if (!before || !after) return;
    handle.dataset.sectionResizerReady = "true";
    const storageKey = `weekbox_sidebar_section_height_${before.id}`;
    try {
      const savedHeight = Number(localStorage.getItem(storageKey));
      if (savedHeight > 0) before.style.flex = `0 0 ${savedHeight}px`;
    } catch {}
    const syncAvailability = () => {
      const disabled = !before.open || !after.open;
      const availableHeight =
        before.getBoundingClientRect().height +
        after.getBoundingClientRect().height;
      handle.classList.toggle("is-disabled", disabled);
      handle.setAttribute("aria-disabled", String(disabled));
      handle.setAttribute(
        "aria-valuemax",
        String(Math.max(96, Math.round(availableHeight - 96))),
      );
      handle.setAttribute(
        "aria-valuenow",
        String(Math.round(before.getBoundingClientRect().height)),
      );
    };
    before.addEventListener("toggle", syncAvailability);
    after.addEventListener("toggle", syncAvailability);
    syncAvailability();
    handle.addEventListener("pointerdown", (event) => {
      if (handle.classList.contains("is-disabled") || event.button !== 0)
        return;
      event.preventDefault();
      this.sectionResize = {
        after,
        before,
        handle,
        startHeight: before.getBoundingClientRect().height,
        startY: event.clientY,
      };
      handle.classList.add("sidebar__section-resizer--resizing");
      document.body.style.cursor = "ns-resize";
      handle.setPointerCapture?.(event.pointerId);
    });
    const stopSectionResize = () => {
      if (!this.sectionResize) return;
      this.sectionResize.handle.classList.remove(
        "sidebar__section-resizer--resizing",
      );
      this.sectionResize = null;
      document.body.style.cursor = "";
    };
    document.addEventListener("pointermove", (event) => {
      const resize = this.sectionResize;
      if (!resize) return;
      const available =
        resize.before.getBoundingClientRect().height +
        resize.after.getBoundingClientRect().height;
      const minHeight = 96;
      const height = Math.min(
        available - minHeight,
        Math.max(minHeight, resize.startHeight + event.clientY - resize.startY),
      );
      resize.before.style.flex = `0 0 ${height}px`;
      resize.handle.setAttribute("aria-valuenow", String(Math.round(height)));
      try {
        localStorage.setItem(storageKey, String(Math.round(height)));
      } catch {}
      this.refreshEngineMarquees();
    });
    document.addEventListener("pointerup", stopSectionResize);
    document.addEventListener("pointercancel", stopSectionResize);
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
      const button = [
        ...document.querySelectorAll(".sidebar__engine-btn"),
      ].find(
        (candidate) =>
          candidate.dataset.engineId === String(selected?.id || ""),
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
      networkStatus.online ? t("network.online") : t("network.offline"),
    );
    networkIndicator?.setAttribute(
      "title",
      networkStatus.online ? t("network.online") : t("network.offline"),
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
        const details = ENGINE_DETAILS[engineDef.versions] || {};
        const displayName = getEngineLabel(
          engineDef.versions,
          details.name || engineDef.versions,
        );
        const labelKey = getEngineLabelKey(engineDef.versions);
        const iconSrc = details.icon ? `assets/icons/${details.icon}` : "";
        const btn = document.createElement("button");
        btn.className = "sidebar__btn sidebar__engine-btn";
        btn.dataset.engineId = engineDef.versions;
        btn.disabled = !networkStatus.online;
        btn.title = networkStatus.online
          ? ""
          : t("network.connectToBrowseEngines");
        btn.innerHTML = `
          <img src="${iconSrc}" class="sidebar__engine-icon" onerror="this.onerror=null; this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 512 512\\'><path fill=\\'%23888\\' d=\\'M448 32H64C28.65 32 0 60.65 0 96v320c0 35.35 28.65 64 64 64h384c35.35 0 64-28.65 64-64V96C512 60.65 483.3 32 448 32zM212.7 222.7L132.7 302.7C126.4 308.9 118.2 312 110.1 312s-16.38-3.125-22.62-9.375c-12.5-12.5-12.5-32.75 0-45.25L155.3 189.3l-67.88-67.88c-12.5-12.5-12.5-32.75 0-45.25s32.75-12.5 45.25 0l102.6 102.6C247.7 191.3 247.7 210.2 212.7 222.7zM384 320c-17.67 0-32-14.33-32-32s14.33-32 32-32h32c17.67 0 32 14.33 32 32s-14.33 32-32 32H384z\\'/></svg>'">
          <div class="sidebar__marquee-container"><span class="sidebar__marquee-text"${labelKey ? ` data-i18n="${labelKey}"` : ""}>${displayName}</span></div>
        `;
        btn.addEventListener("click", async () => {
          this.setActive(btn);
          try {
            const label = btn.querySelector(".sidebar__marquee-text");
            const container = btn.querySelector(".sidebar__marquee-container");
            const originalText = label.textContent;
            container.innerHTML = `<i class="fa-solid fa-spinner fa-spin" style="margin-right:4px;"></i> ${t("common.loading")}`;
            const releaseVersions = await getEngineReleaseVersions(
              engineDef.versions,
            );
            if (releaseVersions.length === 0)
              throw new Error(t("network.noCompatibleReleases"));
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
              meta: { name: displayName, icon: details.icon },
              versions: processedVersionsData,
            });
            router.navigate("engines");
          } catch (err) {
            console.error(err);
            btn.querySelector(".sidebar__marquee-container").innerHTML =
              `<span class="sidebar__marquee-text">${displayName}</span>`;
            alert(t("network.loadVersionFailed", { name: displayName }));
          }
        });
        wrapper.appendChild(btn);
        this.updateEngineMarquee(btn);
        this.updateCollapsedTooltips();
      }
    } catch (error) {
      console.error(error);
      wrapper.innerHTML = `<p style="color:red; padding:8px; font-size:12px;">${t("network.engineRouterFailed")}</p>`;
    }
  },
  async loadStandaloneMods() {
    if (!FS.isInitialized) return;
    const existingContainer = document.getElementById(
      "standalone-mods-container",
    );
    if (existingContainer) existingContainer.remove();
    document.getElementById("standalone-mods-resizer")?.remove();
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
    const container = document.createElement("details");
    container.className = "sidebar__section sidebar__list";
    container.id = "standalone-mods-container";
    container.dataset.sectionKey = "standalone-mods";
    container.open = true;
    const divider = document.createElement("div");
    divider.className = "sidebar__divider";
    container.appendChild(divider);
    const sectionToggle = document.createElement("summary");
    sectionToggle.className = "sidebar__section-toggle";
    sectionToggle.innerHTML = `
      <span><i class="fa-solid fa-puzzle-piece" aria-hidden="true"></i><span>${t("sidebar.standaloneMods")}</span></span>
      <i class="fa-solid fa-chevron-down" aria-hidden="true"></i>
    `;
    container.appendChild(sectionToggle);
    const wrapper = document.createElement("div");
    wrapper.className = "sidebar__wrapper";
    wrapper.id = "standalone-mods-wrapper";
    container.appendChild(wrapper);
    const sectionResizer = document.createElement("div");
    sectionResizer.className = "sidebar__section-resizer";
    sectionResizer.id = "standalone-mods-resizer";
    sectionResizer.dataset.before = "engines-container";
    sectionResizer.dataset.after = "standalone-mods-container";
    sectionResizer.setAttribute("role", "separator");
    sectionResizer.setAttribute("aria-orientation", "horizontal");
    sectionResizer.setAttribute("aria-valuemin", "96");
    sectionResizer.setAttribute("aria-label", t("sidebar.resize"));
    sectionResizer.title = t("sidebar.resize");
    sidebarNav.appendChild(sectionResizer);
    sidebarNav.appendChild(container);
    this.setupCollapsibleSections(container);
    this.setupSectionResizer(sectionResizer);
    for (const mod of standaloneMods) {
      const btn = document.createElement("button");
      btn.className =
        "sidebar__btn sidebar__engine-btn sidebar__standalone-btn";
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
              `<i class="fa-solid fa-spinner fa-spin" style="margin-right:4px;"></i> ${t("engines.closing")}`;
            Neutralino.os
              .updateSpawnedProcess(process.id, "exit")
              .catch(() => {});
          }
          return;
        }
        this.setActive(btn);
        const originalText = btn.querySelector(
          ".sidebar__marquee-text",
        ).textContent;
        btn.querySelector(".sidebar__marquee-container").innerHTML = `
          <div style="display: flex; align-items: center; gap: 8px;">
            <i class="fa-solid fa-stop" style="color: #ff4a4a;" title="${t("sidebar.stop")}"></i>
            <span>${t("engines.launched")}</span>
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
      this.updateCollapsedTooltips();
    }
  },
};
