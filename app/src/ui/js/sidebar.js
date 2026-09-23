import { router } from "../../backend/core/routing/router.service.js";
import { modManagerModal } from "./mod-manager/index.js";
import { engineManagerModal } from "./engine-manager/index.js";
import { engineUpdateService } from "./engines/engineUpdateService.js";
import { FS } from "../../backend/services/filesystem.js";
import { configModal } from "./config/index.js";
import { networkStatus } from "../../backend/core/system/network-status.service.js";
import { appEvents } from "../../backend/core/routing/events.service.js";
import { t } from "./i18n/index.js";
import { escapeHtml } from "./mod-manager/modSettingsTemplates.js";
import { appSettings } from "../../backend/core/system/settings.service.js";

const SIDEBAR_WIDTH_KEY = "weekbox_sidebar_width";
const SIDEBAR_COLLAPSED_KEY = "weekbox_sidebar_collapsed";
const MIN_SIDEBAR_WIDTH = 200;
const MAX_SIDEBAR_WIDTH = 500;
const RESPONSIVE_BREAKPOINT = MAX_SIDEBAR_WIDTH * 1.55;

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
    this.viewChangeListener = (event) => {
      this.syncActive(event.detail);
      if (event.detail === "home")
        appEvents.dispatchEvent(new CustomEvent("news:refresh-badge"));
    };
    appEvents.addEventListener("view:loaded", this.viewChangeListener);
    this.modsUpdatedListener = () => {
      void this.loadStandaloneMods();
      void this.loadRecentlyPlayedMods();
    };
    document.addEventListener("mods-updated", this.modsUpdatedListener);
    document.addEventListener(
      "recently-played-mods-updated",
      this.modsUpdatedListener,
    );
    this.setupBrandButton();
    this.networkStatusListener = () => {
      void this.refreshNetworkFeatures();
    };
    networkStatus.addEventListener("change", this.networkStatusListener);
    void this.refreshNetworkFeatures();
    void this.loadRecentlyPlayedMods();
    this.setupResponsiveCollapse();
  },
  setupResponsiveCollapse() {
    const updateCollapse = () => {
      const windowWidth = window.innerWidth;
      const shouldCollapse = windowWidth <= RESPONSIVE_BREAKPOINT;
      const isCollapsed = this.sidebar.classList.contains("sidebar--collapsed");
      if (shouldCollapse && !isCollapsed) {
        this.setCollapsed(true);
      }
      if (this.collapseBtn) {
        this.collapseBtn.style.display = shouldCollapse ? "none" : "";
      }
    };
    updateCollapse();
    window.addEventListener("resize", updateCollapse);
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
      section.addEventListener(
        "wheel",
        (e) => {
          const wrapper = section.querySelector(".sidebar__wrapper");
          if (wrapper && !wrapper.contains(e.target)) {
            wrapper.scrollTop += e.deltaY;
          }
        },
        { passive: true },
      );
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
    void this.loadStandaloneMods().catch((e) =>
      console.warn("Could not load standalone mods", e),
    );
    if (networkStatus.online) engineUpdateService.startScheduledChecks();
  },
  async loadStandaloneMods() {
    const container = document.getElementById("standalone-mods-container");
    const wrapper = document.getElementById("standalone-mods-wrapper");
    if (!container || !wrapper) return;
    if (!FS.isInitialized) {
      container.style.display = "none";
      return;
    }

    wrapper.innerHTML = "";
    const allStandaloneMods = await FS.getStandaloneMods();
    const standaloneMods = allStandaloneMods.filter((mod) => !mod.hidden);

    if (standaloneMods.length === 0) {
      container.style.display = "none";
      return;
    }

    container.style.display = "";
    this.setupCollapsibleSections(container);

    for (const mod of standaloneMods) {
      const btn = document.createElement("button");
      btn.className =
        "sidebar__btn sidebar__engine-btn sidebar__standalone-btn";
      let iconSrc =
        mod.icoPath ||
        "data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 512 512\\'><path fill=\\'%23888\\' d=\\'M448 32H64C28.65 32 0 60.65 0 96v320c0 35.35 28.65 64 64 64h384c35.35 0 64-28.65 64-64V96C512 60.65 483.3 32 448 32zM212.7 222.7L132.7 302.7C126.4 308.9 118.2 312 110.1 312s-16.38-3.125-22.62-9.375c-12.5-12.5-12.5-32.75 0-45.25L155.3 189.3l-67.88-67.88c-12.5-12.5-12.5-32.75 0-45.25s32.75-32.75 45.25 0l102.6 102.6C247.7 191.3 247.7 210.2 212.7 222.7zM384 320c-17.67 0-32-14.33-32-32s14.33-32 32-32h32c17.67 0 32 14.33 32 32s-14.33 32-32 32H384z\\'/></svg>";
      iconSrc = escapeHtml(iconSrc);
      btn.innerHTML = `
        <img src="${iconSrc}" class="sidebar__engine-icon" onerror="this.onerror=null; this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 512 512\\'><path fill=\\'%23888\\' d=\\'M448 32H64C28.65 32 0 60.65 0 96v320c0 35.35 28.65 64 64 64h384c35.35 0 64-28.65 64-64V96C512 60.65 483.3 32 448 32zM212.7 222.7L132.7 302.7C126.4 308.9 118.2 312 110.1 312s-16.38-3.125-22.62-9.375c-12.5-12.5-12.5-32.75 0-45.25L155.3 189.3l-67.88-67.88c-12.5-12.5-12.5-32.75 0-45.25s32.75-32.75 45.25 0l102.6 102.6C247.7 191.3 247.7 210.2 212.7 222.7zM384 320c-17.67 0-32-14.33-32-32s14.33-32 32-32h32c17.67 0 32 14.33 32 32s-14.33 32-32 32H384z\\'/></svg>'">
        <div class="sidebar__marquee-container"><span class="sidebar__marquee-text">${escapeHtml(mod.name)}</span></div>
      `;
      btn.addEventListener("click", async () => {
        if (btn.classList.contains("running")) {
          const process = FS.activeEngineProcesses.get(`standalone:${mod.id}`);
          if (process) {
            btn.querySelector(".sidebar__marquee-container").innerHTML =
              `<l-hourglass class="weekbox-hourglass" size="16" color="currentColor" speed="1.75" bg-opacity="0.12" aria-hidden="true"></l-hourglass> ${t("engines.closing")}`;
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
        if (appSettings.get("hideOnLaunch")) Neutralino.window.hide();
        await FS.runStandaloneMod(mod.id, () => {
          if (appSettings.get("hideOnLaunch")) {
            Neutralino.window.show();
            Neutralino.window.focus();
          }
          btn.querySelector(".sidebar__marquee-container").innerHTML =
            `<span class="sidebar__marquee-text">${escapeHtml(originalText)}</span>`;
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
  async loadRecentlyPlayedMods() {
    const container = document.getElementById("recently-played-container");
    const wrapper = document.getElementById("recently-played-wrapper");
    if (!container || !wrapper) return;
    if (!FS.isInitialized) {
      container.hidden = true;
      return;
    }

    const recentMods = await FS.getRecentlyPlayedMods();
    wrapper.replaceChildren();
    container.hidden = recentMods.length === 0;
    if (!recentMods.length) return;

    this.setupCollapsibleSections(container);
    for (const mod of recentMods) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className =
        "sidebar__btn sidebar__engine-btn sidebar__recent-mod-btn";
      btn.title = mod.name;
      const iconBox = document.createElement("span");
      iconBox.className = "sidebar__recent-mod-icon";
      const customIcon = await FS.getModIcon(mod.id).catch(() => null);
      const engineIcon = mod.engineId
        ? FS.getEngineIconSource(mod.engineId)
        : "assets/icons/exe.png";
      const renderIcon = (running) => {
        const icon = document.createElement("i");
        icon.className = running
          ? "fa-solid fa-square sidebar__recent-mod-stop"
          : "fa-solid fa-gamepad";
        icon.setAttribute("aria-hidden", "true");
        if (running) {
          iconBox.replaceChildren(icon);
          return;
        }
        if (customIcon) {
          const image = document.createElement("img");
          image.className = "sidebar__engine-icon";
          image.src = customIcon;
          image.alt = "";
          image.onerror = () => {
            image.replaceWith(icon);
          };
          iconBox.replaceChildren(image);
          return;
        }
        if (mod.engineId) {
          const image = document.createElement("img");
          image.className = "sidebar__engine-icon";
          image.src = engineIcon;
          image.alt = "";
          image.onerror = () => image.replaceWith(icon);
          iconBox.replaceChildren(image);
          return;
        }
        iconBox.replaceChildren(icon);
      };
      const text = document.createElement("span");
      text.className = "sidebar__marquee-text";
      text.textContent = mod.name;
      const marquee = document.createElement("span");
      marquee.className = "sidebar__marquee-container";
      marquee.appendChild(text);
      btn.append(iconBox, marquee);

      const setRunning = (running) => {
        btn.classList.toggle("running", running);
        renderIcon(running);
        this.updateEngineMarquee(btn);
      };
      const onStateChange = (state) => {
        if (state === "running" || state === "launched") setRunning(true);
        if (["completed", "closing", "error", "not_found"].includes(state))
          setRunning(false);
      };
      setRunning(FS.isModRunning(mod.id));
      btn.addEventListener("click", async () => {
        this.setActive(btn);
        const wasRunning = btn.classList.contains("running");
        setRunning(!wasRunning);
        if (appSettings.get("hideOnLaunch")) Neutralino.window.hide();
        await FS.launchRecentlyPlayedMod(mod.id, onStateChange).catch(() => {});
        if (appSettings.get("hideOnLaunch")) {
          Neutralino.window.show();
          Neutralino.window.focus();
        }
        setRunning(FS.isModRunning(mod.id));
      });
      wrapper.appendChild(btn);
      this.updateEngineMarquee(btn);
      this.updateCollapsedTooltips();
    }
  },
};
