import { router } from "../../backend/core/routing/router.service.js";
import { modManagerModal } from "./mod-manager/index.js";
import { engineManagerModal } from "./engine-manager/index.js";
import { engineUpdateService } from "./engines/engineUpdateService.js";
import { configModal } from "./config/index.js";
import { networkStatus } from "../../backend/core/system/network-status.service.js";
import { appEvents } from "../../backend/core/routing/events.service.js";
import { t } from "./i18n/index.js";
import { homeView } from "./home/index.js";
import { eventsView } from "./events/index.js";

const SIDEBAR_WIDTH_KEY = "weekbox_sidebar_width";
const SIDEBAR_COLLAPSED_KEY = "weekbox_sidebar_collapsed";
const MIN_SIDEBAR_WIDTH = 200;
const MAX_SIDEBAR_WIDTH = 500;
const RESPONSIVE_BREAKPOINT = MAX_SIDEBAR_WIDTH * 1.55;

export const sidebar = {
  initialized: false,
  async init() {
    if (this.initialized) return;
    this.sidebar = document.getElementById("sidebar");
    this.resizer = document.getElementById("sidebar-resizer");
    this.collapseBtn = document.getElementById("sidebar-collapse-btn");
    this.tabButtons = document.querySelectorAll(".sidebar__btn[data-tab]");
    this.modManagerBtn = document.getElementById("mod-manager-btn");
    this.engineManagerBtn = document.getElementById("engine-manager-btn");
    this.configBtn = document.getElementById("config-btn");
    this.brandBtn = document.getElementById("sidebar-brand-btn");
    this.isResizing = false;
    if (!this.sidebar) return;
    this.initialized = true;
    this.applySavedWidth();
    this.setupCollapse();
    this.setupResizer();
    this.setupNavigation();
    this.viewChangeListener = (event) => {
      this.syncActive(event.detail);
    };
    appEvents.addEventListener("view:loaded", this.viewChangeListener);
    this.setupBrandButton();
    this.networkStatusListener = () => {
      void this.refreshNetworkFeatures();
    };
    networkStatus.addEventListener("change", this.networkStatusListener);
    this.processExitListener = () => {
      if (
        !["mod-manager-modal", "engine-manager-modal", "config-modal"].some(
          (id) => document.getElementById(id)?.classList.contains("show"),
        )
      ) {
        this.syncActive();
      }
    };
    document.addEventListener(
      "weekbox-process-exit",
      this.processExitListener,
    );
    void this.refreshNetworkFeatures();
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
        button.dataset.defaultTitle?.trim() ||
        button.querySelector(":scope > span")?.textContent?.trim();
      if (label) button.title = label;
    });
  },
  setActive(button) {
    const buttons = [
      ...this.tabButtons,
      this.modManagerBtn,
      this.engineManagerBtn,
      this.configBtn,
    ].filter(Boolean);
    buttons.forEach((candidate) => {
      candidate.classList.remove("sidebar__btn--active");
      candidate.classList.toggle("active", candidate === button);
    });
  },
  syncActive(viewId = router.currentViewId) {
    if (!["home", "news", "events"].includes(viewId)) return;
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
        if (viewToLoad === "home") {
          void (async () => {
            await router.navigate(viewToLoad);
            await homeView.ready;
            await homeView.returnToTop();
          })();
          return;
        }
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
    if (networkStatus.online) engineUpdateService.startScheduledChecks();
  },

};
