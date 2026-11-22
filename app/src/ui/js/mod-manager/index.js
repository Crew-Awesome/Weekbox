import { FS } from "../../../backend/services/filesystem/index.js";
import { dependenciesRenderer } from "./dependenciesRenderer.js";
import { cardRenderer } from "./cardRenderer.js";
import { modSettingsModal } from "./modSettingsModal.js";
import { modManagerTemplates } from "./templates.js";
import { sidebar } from "../sidebar.js";
import { t } from "../i18n/index.js";
import {
  activateCheckoutDialog,
  deactivateCheckoutDialog,
} from "../home/modal/dialogFocus.js";
import { createLoadingState } from "../hourglass.js";
import {
  filterModsBySearch,
  getFilteredMods,
} from "./modManagerIndex.util.mjs";
import {
  disposeStaleRenderer,
  prepareModManagerRenderer,
} from "./modManagerRendererLifecycle.util.mjs";
import { setupModManagerModal } from "./modalSetup.js";

const MODAL_OPEN_GUARD_MS = 350;

function sameId(left, right) {
  return String(left) === String(right);
}

export const modManagerModal = {
  typeFilters: { include: [], exclude: [] },
  sortMode: "added-desc",
  searchQuery: "",
  searchFilterFrame: 0,
  searchTagCounts: null,
  activeView: "mods",
  cachedMods: null,
  cachedStandaloneMods: null,
  cachedInstalledEngines: null,
  cachedViews: { mods: null, dependencies: null },
  eventBound: false,
  loadRequestId: 0,
  renderGeneration: 0,
  loadPromise: null,
  queuedRefresh: false,
  preloadPromise: null,
  preloaded: false,
  pendingInstalls: new Map(),
  engineTooltip: null,
  openingGuardUntil: 0,
  closeTimer: 0,
  gridRenderer: null,
  dependenciesRenderer: null,

  async init() {
    setupModManagerModal(this);
  },
  async open() {
    await this.init();
    if (!FS.isInitialized) await FS.init();

    const modal = document.getElementById("mod-manager-modal");
    if (!modal) return;

    if (this.closeTimer) {
      clearTimeout(this.closeTimer);
      this.closeTimer = 0;
    }
    sidebar.setActive(sidebar.modManagerBtn);
    this.openingGuardUntil = performance.now() + MODAL_OPEN_GUARD_MS;
    modal.style.display = "flex";
    activateCheckoutDialog(
      modal,
      modal.querySelector(".mod-manager-content"),
      modal.querySelector("#mod-manager-search-input"),
      () => this.close(),
    );
    requestAnimationFrame(() => modal.classList.add("show"));
    this.renderPendingInstallCards();

    if (!this.preloaded) {
      const container = document.getElementById("mod-manager-modal-body");
      if (container && !container.children.length) {
        container.replaceChildren(
          createLoadingState(
            t("modManager.loadingMods"),
            28,
            "mod-manager-loading",
          ),
        );
      }
      await this.preload();
      if (this.cachedMods) this.showCachedView();
      else await this.loadInstalledMods();
    } else if (!this.showCachedView()) {
      await this.loadInstalledMods();
    }
  },

  async preload() {
    if (this.preloadPromise) return this.preloadPromise;

    this.preloadPromise = (async () => {
      await this.init();
      await this.loadInstalledMods(true);
      this.preloaded = true;
    })().catch((error) => {
      this.preloadPromise = null;
      throw error;
    });

    return this.preloadPromise;
  },

  close() {
    this.loadRequestId += 1;
    this.renderGeneration += 1;
    if (this.loadPromise) {
      this.cachedMods = null;
      this.searchTagCounts = null;
      this.cachedStandaloneMods = null;
      this.cachedInstalledEngines = null;
      this.cachedViews = { mods: null, dependencies: null };
    }
    modSettingsModal.close();
    const modal = document.getElementById("mod-manager-modal");
    if (!modal) return;
    this.gridRenderer?.setActive(false);
    this.dependenciesRenderer?.setActive(false);
    this.engineTooltip?.classList.remove("is-visible");
    sidebar.syncActive();
    deactivateCheckoutDialog(modal);
    modal.classList.remove("show");
    if (this.closeTimer) clearTimeout(this.closeTimer);
    this.closeTimer = setTimeout(() => {
      this.closeTimer = 0;
      if (!modal.classList.contains("show")) modal.style.display = "none";
    }, 260);
  },

  async loadInstalledMods(force = false) {
    if (this.loadPromise) {
      if (force) this.queuedRefresh = true;
      return this.loadPromise;
    }

    const requestId = ++this.loadRequestId;
    const needsScan = force || !this.cachedMods || !this.cachedInstalledEngines;
    this.loadPromise = (async () => {
      try {
        let mods = this.cachedMods;
        let standaloneMods = this.cachedStandaloneMods;
        let installedEngines = this.cachedInstalledEngines;
        if (needsScan) {
          mods = await FS.getInstalledMods();
          [standaloneMods, installedEngines] = await Promise.all([
            FS.getStandaloneMods({ mods }),
            FS.getInstalledEngines(),
          ]);
        }
        if (requestId !== this.loadRequestId) return;

        const standaloneIds = new Set(
          (standaloneMods || []).map((mod) => String(mod.id)),
        );
        mods = (mods || []).map((mod) =>
          standaloneIds.has(String(mod.id))
            ? {
                ...mod,
                engineId: "executable",
                engineVersion: null,
                engineLocked: false,
                kind: "mod",
              }
            : mod,
        );

        this.cachedMods = mods;
        this.searchTagCounts = null;
        this.cachedStandaloneMods = standaloneMods;
        this.cachedInstalledEngines = installedEngines;
        await this.render(mods, standaloneMods, installedEngines);
      } catch (error) {
        if (requestId !== this.loadRequestId) return;
        console.error("Error loading mods in Mod Manager:", error);
        const container = document.getElementById("mod-manager-modal-body");
        if (container) {
          container.innerHTML = modManagerTemplates.emptyState(
            `<i class="fa-solid fa-triangle-exclamation"></i> ${t("modManager.errorLoadingMods")}`,
          );
        }
      }
    })();
    try {
      await this.loadPromise;
    } finally {
      const refreshAgain = this.queuedRefresh;
      this.queuedRefresh = false;
      this.loadPromise = null;
      if (
        refreshAgain &&
        document.getElementById("mod-manager-modal")?.classList.contains("show")
      ) {
        void this.loadInstalledMods(true);
      }
    }
  },

  syncActiveView() {
    const isModsView = this.activeView === "mods";
    const dependenciesToggle = document.getElementById(
      "mod-manager-dependencies-toggle",
    );
    if (dependenciesToggle) {
      dependenciesToggle.setAttribute("aria-pressed", String(!isModsView));
      const currentLabel = isModsView
        ? t("common.mods")
        : t("modManager.dependencies");
      const nextLabel = isModsView
        ? t("modManager.dependencies")
        : t("common.mods");
      const label = dependenciesToggle.querySelector("span");
      label.textContent = currentLabel;
      label.dataset.hoverLabel = nextLabel;
      dependenciesToggle.setAttribute(
        "aria-label",
        t("modManager.showView", { view: nextLabel }),
      );
    }
    document
      .querySelector(".mod-manager-header-actions")
      ?.classList.toggle("dependencies-view", !isModsView);
    document
      .querySelector(".mod-manager-search")
      ?.classList.toggle("is-hidden", !isModsView);
  },

  syncViewToggleIcon() {
    const grid = document.getElementById("mod-manager-grid-container");
    const toggleIcon = document.querySelector("#mod-manager-view-toggle i");
    if (!grid || !toggleIcon) return;
    toggleIcon.className = grid.classList.contains("list-view")
      ? "fa-solid fa-table-cells-large"
      : "fa-solid fa-list";
  },

  showCachedView() {
    const view = this.cachedViews[this.activeView];
    const container = document.getElementById("mod-manager-modal-body");
    if (!view || !container) return false;

    container.replaceChildren(view);
    this.gridRenderer?.setActive(view === this.cachedViews.mods);
    this.dependenciesRenderer?.setActive(
      view === this.cachedViews.dependencies,
    );
    this.syncActiveView();
    this.syncViewToggleIcon();
    this.applySearchFilter();
    this.renderPendingInstallCards();
    return true;
  },

  applySearchFilter() {
    const grid = document.getElementById("mod-manager-grid-container");
    if (!grid || this.activeView !== "mods") return;
    if (this.gridRenderer) {
      this.gridRenderer.setItems(
        filterModsBySearch(
          getFilteredMods(
            this.cachedMods || [],
            this.cachedStandaloneMods || [],
            this.typeFilters,
            this.sortMode,
          ),
          this.searchQuery,
        ),
      );
    }
    this.updateSearchSuggestions();
  },

  syncModGrid() {
    if (this.activeView !== "mods") return false;
    const grid = document.getElementById("mod-manager-grid-container");
    if (!grid || !this.cachedMods) return false;

    const filteredMods = getFilteredMods(
      this.cachedMods,
      this.cachedStandaloneMods || [],
      this.typeFilters,
      this.sortMode,
    );
    this.gridRenderer?.setItems(
      filterModsBySearch(filteredMods, this.searchQuery),
    );
    this.renderActiveFilters();
    this.updateSearchSuggestions();
    return true;
  },

  hideSearchSuggestions() {
    const input = document.getElementById("mod-manager-search-input");
    const suggestions = document.getElementById(
      "mod-manager-search-suggestions",
    );
    if (!suggestions) return;
    suggestions.hidden = true;
    input?.setAttribute("aria-expanded", "false");
  },

  updateSearchSuggestions() {
    const input = document.getElementById("mod-manager-search-input");
    const suggestions = document.getElementById(
      "mod-manager-search-suggestions",
    );
    if (!input || !suggestions) return;

    const query = input.value.trim().toLocaleLowerCase().replace(/^#+/, "");
    if (!this.searchTagCounts) {
      this.searchTagCounts = new Map();
      (this.cachedMods || []).forEach((mod) => {
        (Array.isArray(mod.tags) ? mod.tags : []).forEach((tag) => {
          const normalized = String(tag || "")
            .trim()
            .replace(/^#+/, "")
            .toLocaleLowerCase();
          if (normalized) {
            this.searchTagCounts.set(
              normalized,
              (this.searchTagCounts.get(normalized) || 0) + 1,
            );
          }
        });
      });
    }

    const matches = [...this.searchTagCounts.entries()]
      .filter(([tag]) => !query || tag.includes(query))
      .sort(
        ([tagA, countA], [tagB, countB]) =>
          countB - countA || tagA.localeCompare(tagB),
      )
      .slice(0, 8);
    suggestions.replaceChildren(
      ...matches.map(([tag]) => {
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.tag = `#${tag}`;
        button.setAttribute("role", "option");
        button.innerHTML =
          '<i class="fa-solid fa-hashtag" aria-hidden="true"></i>';
        const label = document.createElement("span");
        label.textContent = `#${tag}`;
        button.append(label);
        return button;
      }),
    );
    const visible = document.activeElement === input && matches.length > 0;
    suggestions.hidden = !visible;
    input.setAttribute("aria-expanded", String(visible));
  },

  renderActiveFilters() {
    const container = document.getElementById("mod-manager-active-filters");
    if (!container) return;
    container.replaceChildren();
    const filters = this.typeFilters || { include: [], exclude: [] };
    [
      ["include", filters.include || []],
      ["exclude", filters.exclude || []],
    ].forEach(([mode, values]) =>
      values.forEach((value) => {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = `mod-manager-filter-chip ${mode === "exclude" ? "is-exclude" : ""}`;
        chip.textContent = `${mode === "exclude" ? "− " : ""}${value.replace(/^kind:/, "")}`;
        chip.title = t("modManager.removeFilter");
        chip.addEventListener("click", () => {
          this.typeFilters[mode] = this.typeFilters[mode].filter(
            (item) => item !== value,
          );
          if (!this.syncModGrid()) {
            void this.render(
              this.cachedMods || [],
              this.cachedStandaloneMods || [],
              this.cachedInstalledEngines || [],
            );
          }
        });
        container.append(chip);
      }),
    );
  },

  updatePendingInstallCard(install) {
    const modal = document.getElementById("mod-manager-modal");
    const grid = document.getElementById("mod-manager-grid-container");
    if (
      !modal?.classList.contains("show") ||
      !grid ||
      this.activeView !== "mods"
    ) {
      return;
    }

    let card = Array.from(
      grid.querySelectorAll(".mod-manager-installing-card"),
    ).find((item) => item.dataset.modId === String(install.modId));
    if (!card) {
      card = document.createElement("article");
      card.className = "mod-manager-card mod-manager-installing-card";
      card.dataset.modId = install.modId;
      card.setAttribute("aria-live", "polite");
      card.innerHTML = `
        <div class="mod-manager-cover-wrap">
          <div class="mod-manager-installing-cover">
            <img class="mod-manager-installing-image" alt="" hidden>
            <div class="mod-manager-installing-overlay"><i class="fa-solid fa-download" aria-hidden="true"></i></div>
          </div>
        </div>
        <div class="mod-manager-card-body mod-info">
          <div class="mod-manager-info">
            <h3 class="mod-title"></h3>
            <p class="mod-manager-installing-status"></p>
          </div>
        </div>`;
      grid.appendChild(card);
    }

    card.querySelector(".mod-title").textContent = install.modName;
    card.querySelector(".mod-manager-installing-status").textContent =
      `${install.status} ${Math.round(install.progress || 0)}%`;

    const image = card.querySelector(".mod-manager-installing-image");
    if (install.coverUrl && card.dataset.coverUrl !== install.coverUrl) {
      card.dataset.coverUrl = install.coverUrl;
      const preload = new Image();
      preload.addEventListener("load", () => {
        if (!card.isConnected) return;
        image.src = install.coverUrl;
        image.hidden = false;
        requestAnimationFrame(() => card.classList.add("has-install-cover"));
      });
      preload.src = install.coverUrl;
    }
  },

  renderPendingInstallCards() {
    this.pendingInstalls.forEach((install) =>
      this.updatePendingInstallCard(install),
    );
  },

  async render(
    mods,
    standaloneMods,
    installedEngines = this.cachedInstalledEngines || [],
    { preserveOtherView = false } = {},
  ) {
    const renderGeneration = ++this.renderGeneration;
    const container = document.getElementById("mod-manager-modal-body");
    if (!container) return;

    const savedScrollTop = container.scrollTop;

    const dependencies = mods.filter((mod) => mod.kind === "dependency");
    const selectedFilters = this.typeFilters || { include: [], exclude: [] };
    const playableMods = mods;

    this.syncActiveView();
    const filteredMods = filterModsBySearch(
      getFilteredMods(
        playableMods,
        standaloneMods,
        selectedFilters,
        this.sortMode,
      ),
      this.searchQuery,
    );

    this.renderActiveFilters();

    if (!preserveOtherView) {
      this.cachedViews = { mods: null, dependencies: null };
    }
    prepareModManagerRenderer(this, preserveOtherView);
    container.innerHTML = "";

    if (this.activeView === "dependencies") {
      await this.renderDependenciesView({
        container,
        dependencies,
        mods,
        installedEngines,
        renderGeneration,
        savedScrollTop,
      });
      return;
    }

    await this.renderModsView({
      container,
      mods,
      filteredMods,
      standaloneMods,
      installedEngines,
      renderGeneration,
      savedScrollTop,
    });
  },

  async renderDependenciesView({
    container,
    dependencies,
    mods,
    installedEngines,
    renderGeneration,
    savedScrollTop,
  }) {
    if (!dependencies.length) {
      container.innerHTML = modManagerTemplates.emptyState(
        t("modManager.noDependencies"),
      );
      this.cachedViews.dependencies = container.firstElementChild;
      container.scrollTop = savedScrollTop;
      return;
    }
    const isListView =
      localStorage.getItem("weekbox_dependency_view") !== "grid";
    const toggleIcon = document.querySelector("#mod-manager-view-toggle i");
    if (toggleIcon)
      toggleIcon.className = isListView
        ? "fa-solid fa-table-cells-large"
        : "fa-solid fa-list";
    const renderer = await dependenciesRenderer.render(
      container,
      dependencies,
      mods,
      installedEngines,
      isListView,
      (deletedId) => {
        this.cachedMods = this.cachedMods.filter(
          (mod) => !sameId(mod.id, deletedId),
        );
        this.searchTagCounts = null;
        this.cachedStandaloneMods = this.cachedStandaloneMods.filter(
          (mod) => !sameId(mod.id, deletedId),
        );
        void this.render(this.cachedMods, this.cachedStandaloneMods);
        document.dispatchEvent(
          new CustomEvent("mods-updated", {
            detail: {
              source: "mod-manager",
              action: "deleted",
              modId: deletedId,
            },
          }),
        );
      },
      () => this.loadInstalledMods(true),
    );
    if (renderGeneration !== this.renderGeneration) {
      disposeStaleRenderer(renderer);
      return;
    }
    this.dependenciesRenderer = renderer;
    this.cachedViews.dependencies = container.firstElementChild;
    container.scrollTop = savedScrollTop;
  },

  async renderModsView({
    container,
    mods,
    filteredMods,
    standaloneMods,
    installedEngines,
    renderGeneration,
    savedScrollTop,
  }) {
    const gridContainer = document.createElement("div");
    gridContainer.id = "mod-manager-grid-container";
    gridContainer.className = "mod-manager-grid";
    const isListView =
      localStorage.getItem("weekbox_mod_manager_view") === "list";
    if (isListView) gridContainer.classList.add("list-view");

    const toggleIcon = document.querySelector("#mod-manager-view-toggle i");
    if (toggleIcon)
      toggleIcon.className = isListView
        ? "fa-solid fa-table-cells-large"
        : "fa-solid fa-list";

    container.appendChild(gridContainer);
    try {
      const renderer = await cardRenderer.renderCards(
        gridContainer,
        filteredMods,
        mods,
        standaloneMods,
        installedEngines,
        (deletedId) => {
          this.cachedMods = this.cachedMods.filter(
            (mod) => !sameId(mod.id, deletedId),
          );
          this.searchTagCounts = null;
          this.cachedStandaloneMods = this.cachedStandaloneMods.filter(
            (mod) => !sameId(mod.id, deletedId),
          );
          this.gridRenderer?.setAllMods(this.cachedMods);
          this.gridRenderer?.setItems(
            filterModsBySearch(
              getFilteredMods(
                this.cachedMods,
                this.cachedStandaloneMods,
                this.typeFilters,
                this.sortMode,
              ),
              this.searchQuery,
            ),
          );
        },
        () => {
          this.loadInstalledMods(true);
        },
      );
      if (renderGeneration !== this.renderGeneration) {
        disposeStaleRenderer(renderer, gridContainer);
        return;
      }
      this.gridRenderer = renderer;
      this.applySearchFilter();
      this.renderPendingInstallCards();
      this.cachedViews.mods = gridContainer;
      container.scrollTop = savedScrollTop;
      requestAnimationFrame(() => {
        container.scrollTop = savedScrollTop;
      });
    } catch (err) {
      if (renderGeneration !== this.renderGeneration) return;
      console.error(err);
      container.innerHTML = modManagerTemplates.emptyState(
        `<i class="fa-solid fa-triangle-exclamation"></i> ${t("modManager.errorRenderingCards")}`,
      );
    }
  },
};
