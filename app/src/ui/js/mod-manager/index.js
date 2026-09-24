import { FS } from "../../../backend/services/filesystem.js";
import { dependenciesRenderer } from "./dependenciesRenderer.js";
import { cardRenderer } from "./cardRenderer.js";
import { modSettingsModal } from "./modSettingsModal.js";
import { localModImportModal } from "./localModImportModal.js";
import { modManagerTemplates } from "./templates.js";
import { openFilterSortModal } from "./filterSortModal.js";
import { sidebar } from "../sidebar.js";
import { i18n, t } from "../i18n/index.js";
import {
  activateCheckoutDialog,
  deactivateCheckoutDialog,
} from "../home/modal/dialogFocus.js";
import { createLoadingState } from "../hourglass.js";

function sameId(left, right) {
  return String(left) === String(right);
}

function getFilteredMods(mods, standaloneMods, filters, sortMode) {
  const standaloneIds = new Set(
    (Array.isArray(standaloneMods) ? standaloneMods : []).map((mod) =>
      String(mod.id),
    ),
  );
  const order = new Map(
    (Array.isArray(mods) ? mods : []).map((mod, index) => [
      String(mod.id),
      index,
    ]),
  );
  const filterMatches = (mod, filter) => {
    const isExecutable = standaloneIds.has(String(mod.id));
    if (filter.startsWith("engine:"))
      return mod.engineId === filter.slice("engine:".length);
    if (filter === "kind:mod")
      return !["dependency", "addon"].includes(mod.kind) && !isExecutable;
    if (filter === "kind:dependency") return mod.kind === "dependency";
    if (filter === "kind:addon") return mod.kind === "addon";
    if (filter === "executable") return isExecutable;
    if (filter === "unassigned") return !mod.engineId && !isExecutable;
    return false;
  };
  const included = filters?.include || [];
  const excluded = filters?.exclude || [];
  return (Array.isArray(mods) ? mods : [])
    .filter(
      (mod) =>
        !excluded.some((filter) => filterMatches(mod, filter)) &&
        (!included.length ||
          included.some((filter) => filterMatches(mod, filter))),
    )
    .sort((left, right) => {
      if (sortMode === "name-asc")
        return String(left.name || "").localeCompare(String(right.name || ""));
      if (sortMode === "name-desc")
        return String(right.name || "").localeCompare(String(left.name || ""));
      if (sortMode === "engine-asc")
        return String(left.engineId || "").localeCompare(
          String(right.engineId || ""),
        );
      if (sortMode === "engine-desc")
        return String(right.engineId || "").localeCompare(
          String(left.engineId || ""),
        );
      const difference =
        order.get(String(left.id)) - order.get(String(right.id));
      return sortMode === "added-asc" ? difference : -difference;
    });
}

export const modManagerModal = {
  typeFilters: { include: [], exclude: [] },
  sortMode: "added-desc",
  searchQuery: "",
  activeView: "mods",
  cachedMods: null,
  cachedStandaloneMods: null,
  cachedInstalledEngines: null,
  cachedViews: { mods: null, dependencies: null },
  eventBound: false,
  loadRequestId: 0,
  loadPromise: null,
  queuedRefresh: false,
  preloadPromise: null,
  preloaded: false,
  pendingInstalls: new Map(),
  engineTooltip: null,

  async init() {
    if (!document.getElementById("mod-manager-modal")) {
      const wrapper = document.createElement("div");
      wrapper.innerHTML = modManagerTemplates.mainModal();
      const modalElement = wrapper.firstElementChild;
      if (!modalElement)
        throw new Error("WeekBox mod manager template is unavailable.");
      document.body.appendChild(modalElement);
      i18n.apply(document.getElementById("mod-manager-modal"));

      const modal = document.getElementById("mod-manager-modal");
      this.engineTooltip = document.createElement("div");
      this.engineTooltip.className = "mod-manager-engine-tooltip";
      this.engineTooltip.setAttribute("role", "tooltip");
      document.body.appendChild(this.engineTooltip);
      modal?.addEventListener("pointerover", (event) => {
        const indicator = event.target.closest(".mod-manager-engine-indicator");
        if (!indicator || !this.engineTooltip) return;
        this.engineTooltip.textContent = indicator.dataset.label || "";
        const rect = indicator.getBoundingClientRect();
        const halfWidth = this.engineTooltip.offsetWidth / 2;
        const left = Math.min(
          Math.max(rect.left + rect.width / 2, halfWidth + 8),
          window.innerWidth - halfWidth - 8,
        );
        const belowTop = rect.bottom + 8;
        const top =
          belowTop + this.engineTooltip.offsetHeight <= window.innerHeight - 8
            ? belowTop
            : rect.top - this.engineTooltip.offsetHeight - 8;
        this.engineTooltip.style.left = `${left}px`;
        this.engineTooltip.style.top = `${Math.max(8, top)}px`;
        this.engineTooltip.classList.toggle("is-above", top < rect.top);
        this.engineTooltip.classList.add("is-visible");
      });
      modal?.addEventListener("pointerout", (event) => {
        const indicator = event.target.closest(".mod-manager-engine-indicator");
        if (
          indicator &&
          !(
            event.relatedTarget instanceof Node &&
            indicator.contains(event.relatedTarget)
          )
        ) {
          this.engineTooltip?.classList.remove("is-visible");
        }
      });

      document
        .getElementById("mod-manager-close-btn")
        ?.addEventListener("click", () => this.close());
      document
        .getElementById("mod-manager-modal")
        ?.addEventListener("click", (e) => {
          if (e.target.id === "mod-manager-modal") this.close();
        });

      const toggleBtn = document.getElementById("mod-manager-view-toggle");
      if (toggleBtn) {
        toggleBtn.addEventListener("click", () => {
          const grid = document.getElementById("mod-manager-grid-container");
          if (!grid) return;
          const isListView = grid.classList.toggle("list-view");
          localStorage.setItem(
            this.activeView === "dependencies"
              ? "weekbox_dependency_view"
              : "weekbox_mod_manager_view",
            isListView ? "list" : "grid",
          );
          const icon = toggleBtn.querySelector("i");
          if (icon) {
            icon.className = isListView
              ? "fa-solid fa-table-cells-large"
              : "fa-solid fa-list";
          }
        });
      }

      const depToggle = document.getElementById(
        "mod-manager-dependencies-toggle",
      );
      if (depToggle) {
        depToggle.addEventListener("click", () => {
          this.activeView =
            this.activeView === "mods" ? "dependencies" : "mods";
          if (!this.showCachedView()) {
            this.render(
              this.cachedMods || [],
              this.cachedStandaloneMods || [],
              this.cachedInstalledEngines || [],
              { preserveOtherView: true },
            );
          }
        });
      }

      const searchInput = document.getElementById("mod-manager-search-input");
      const searchSuggestions = document.getElementById(
        "mod-manager-search-suggestions",
      );
      if (searchInput) {
        searchInput.setAttribute("aria-autocomplete", "list");
        searchInput.setAttribute(
          "aria-controls",
          "mod-manager-search-suggestions",
        );
        searchInput.setAttribute("aria-expanded", "false");
        searchInput.addEventListener("input", (event) => {
          this.searchQuery = event.target.value.trim().toLocaleLowerCase();
          this.applySearchFilter();
        });
        searchInput.addEventListener("focus", () =>
          this.updateSearchSuggestions(),
        );
        searchInput.addEventListener("keydown", (event) => {
          if (event.key === "Escape") {
            this.hideSearchSuggestions();
            return;
          }
          if (event.key !== "ArrowDown") return;
          const firstSuggestion = searchSuggestions?.querySelector("button");
          if (!firstSuggestion) return;
          event.preventDefault();
          firstSuggestion.focus();
        });
        searchInput.addEventListener("focusout", () => {
          setTimeout(() => {
            if (!searchSuggestions?.contains(document.activeElement))
              this.hideSearchSuggestions();
          }, 0);
        });
      }
      if (searchSuggestions && searchInput) {
        searchSuggestions.setAttribute("role", "listbox");
        searchSuggestions.addEventListener("mousedown", (event) => {
          if (event.target.closest("button[data-tag]")) event.preventDefault();
        });
        searchSuggestions.addEventListener("click", (event) => {
          const button = event.target.closest("button[data-tag]");
          if (!button) return;
          searchInput.value = button.dataset.tag || "";
          this.searchQuery = searchInput.value.toLocaleLowerCase();
          this.applySearchFilter();
          this.hideSearchSuggestions();
          searchInput.focus();
        });
        searchSuggestions.addEventListener("keydown", (event) => {
          const buttons = [
            ...searchSuggestions.querySelectorAll("button[data-tag]"),
          ];
          const currentIndex = buttons.indexOf(document.activeElement);
          if (event.key === "Escape") {
            this.hideSearchSuggestions();
            searchInput.focus();
          } else if (event.key === "ArrowDown" && buttons.length) {
            event.preventDefault();
            buttons[(currentIndex + 1) % buttons.length].focus();
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            if (currentIndex <= 0) searchInput.focus();
            else buttons[currentIndex - 1].focus();
          }
        });
      }

      const filterToggle = document.getElementById("mod-manager-filter-toggle");
      if (filterToggle) {
        filterToggle.addEventListener("click", () => {
          openFilterSortModal({
            filters: this.typeFilters,
            sort: this.sortMode,
            engineIds: [
              ...new Set(
                (this.cachedMods || [])
                  .filter(
                    (mod) => mod.engineId && mod.engineId !== "executable",
                  )
                  .map((mod) => mod.engineId),
              ),
            ],
            hasMods: (this.cachedMods || []).some(
              (mod) =>
                !["dependency", "addon"].includes(mod.kind) &&
                !(this.cachedStandaloneMods || []).some(
                  (standalone) => String(standalone.id) === String(mod.id),
                ),
            ),
            hasDependencies: (this.cachedMods || []).some(
              (mod) => mod.kind === "dependency",
            ),
            hasAddons: (this.cachedMods || []).some(
              (mod) => mod.kind === "addon",
            ),
            hasExecutables: (this.cachedStandaloneMods || []).length > 0,
            hasUnassigned: (this.cachedMods || []).some((mod) => !mod.engineId),
            onApply: ({ filters, sort }) => {
              this.typeFilters = filters;
              this.sortMode = sort;
              if (!this.syncModGrid()) {
                void this.render(
                  this.cachedMods || [],
                  this.cachedStandaloneMods || [],
                );
              }
            },
          });
        });
      }

      const addLocalBtn = document.getElementById("mod-manager-add-local-btn");
      if (addLocalBtn) {
        addLocalBtn.addEventListener("click", async () => {
          if (addLocalBtn.disabled) return;
          addLocalBtn.disabled = true;
          try {
            await localModImportModal.open({
              onImported: () => this.loadInstalledMods(true),
            });
          } finally {
            addLocalBtn.disabled = false;
          }
        });
      }

      if (!this.eventBound) {
        document.addEventListener("mods-updated", (event) => {
          if (
            document
              .getElementById("mod-manager-modal")
              ?.classList.contains("show")
          ) {
            if (event.detail?.source === "mod-manager") return;
            void this.loadInstalledMods(true);
          } else {
            this.cachedMods = null;
            this.cachedStandaloneMods = null;
            this.cachedInstalledEngines = null;
            this.cachedViews = { mods: null, dependencies: null };
            this.preloaded = false;
            this.preloadPromise = null;
          }
        });
        document.addEventListener("mod-install-progress", (event) => {
          const install = event.detail;
          if (!install?.modId) return;
          if (install.status === "complete" || install.status === "cancelled") {
            this.pendingInstalls.delete(String(install.modId));
            document
              .querySelectorAll(".mod-manager-installing-card")
              .forEach((card) => {
                if (card.dataset.modId === String(install.modId)) card.remove();
              });
            return;
          }
          this.pendingInstalls.set(String(install.modId), install);
          this.updatePendingInstallCard(install);
        });
        this.eventBound = true;
      }
    }
  },

  async open() {
    await this.init();
    if (!FS.isInitialized) await FS.init();

    const modal = document.getElementById("mod-manager-modal");
    if (!modal) return;

    sidebar.setActive(sidebar.modManagerBtn);
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
    if (this.loadPromise) {
      this.cachedMods = null;
      this.cachedStandaloneMods = null;
      this.cachedInstalledEngines = null;
      this.cachedViews = { mods: null, dependencies: null };
    }
    modSettingsModal.close();
    const modal = document.getElementById("mod-manager-modal");
    if (!modal) return;
    this.engineTooltip?.classList.remove("is-visible");
    sidebar.syncActive();
    deactivateCheckoutDialog(modal);
    modal.classList.remove("show");
    setTimeout(() => {
      modal.style.display = "none";
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
          [mods, standaloneMods, installedEngines] = await Promise.all([
            FS.getInstalledMods(),
            FS.getStandaloneMods(),
            FS.getInstalledEngines(),
          ]);
        }
        if (requestId !== this.loadRequestId) return;

        this.cachedMods = mods;
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
    this.syncActiveView();
    this.syncViewToggleIcon();
    this.applySearchFilter();
    this.renderPendingInstallCards();
    return true;
  },

  applySearchFilter() {
    const grid = document.getElementById("mod-manager-grid-container");
    if (!grid || this.activeView !== "mods") return;
    grid.querySelectorAll(".mod-manager-card").forEach((card) => {
      if (card.classList.contains("mod-manager-installing-card")) return;
      card.classList.toggle(
        "is-search-hidden",
        Boolean(this.searchQuery) &&
          !card.dataset.modSearch.includes(this.searchQuery),
      );
    });
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
    const visibleIds = new Set(filteredMods.map((mod) => String(mod.id)));
    const cards = new Map(
      [
        ...grid.querySelectorAll(
          ".mod-manager-card:not(.mod-manager-installing-card)",
        ),
      ].map((card) => [card.dataset.modId, card]),
    );
    cards.forEach((card, modId) =>
      card.classList.toggle("is-filter-hidden", !visibleIds.has(modId)),
    );
    filteredMods.forEach((mod) => {
      const card = cards.get(String(mod.id));
      if (card) grid.appendChild(card);
    });
    this.renderActiveFilters();
    this.applySearchFilter();
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
    const tagCounts = new Map();
    (this.cachedMods || []).forEach((mod) => {
      (Array.isArray(mod.tags) ? mod.tags : []).forEach((tag) => {
        const normalized = String(tag || "")
          .trim()
          .replace(/^#+/, "")
          .toLocaleLowerCase();
        if (normalized)
          tagCounts.set(normalized, (tagCounts.get(normalized) || 0) + 1);
      });
    });

    const matches = [...tagCounts.entries()]
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
    const container = document.getElementById("mod-manager-modal-body");
    if (!container) return;

    const savedScrollTop = container.scrollTop;

    const dependencies = mods.filter((mod) => mod.kind === "dependency");
    const selectedFilters = this.typeFilters || { include: [], exclude: [] };
    const playableMods = mods;

    this.syncActiveView();
    const filteredMods = getFilteredMods(
      playableMods,
      standaloneMods,
      selectedFilters,
      this.sortMode,
    );

    this.renderActiveFilters();

    if (!preserveOtherView) {
      this.cachedViews = { mods: null, dependencies: null };
    }
    container.innerHTML = "";

    if (this.activeView === "dependencies") {
      if (dependencies.length) {
        const isListView =
          localStorage.getItem("weekbox_dependency_view") !== "grid";
        const toggleIcon = document.querySelector("#mod-manager-view-toggle i");
        if (toggleIcon)
          toggleIcon.className = isListView
            ? "fa-solid fa-table-cells-large"
            : "fa-solid fa-list";
        await dependenciesRenderer.render(
          container,
          dependencies,
          mods,
          installedEngines,
          isListView,
          (deletedId) => {
            this.cachedMods = this.cachedMods.filter(
              (mod) => !sameId(mod.id, deletedId),
            );
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
        this.cachedViews.dependencies = container.firstElementChild;
      } else {
        container.innerHTML = modManagerTemplates.emptyState(
          t("modManager.noDependencies"),
        );
        this.cachedViews.dependencies = container.firstElementChild;
      }
      container.scrollTop = savedScrollTop;
      return;
    }

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
      await cardRenderer.renderCards(
        gridContainer,
        filteredMods,
        mods,
        standaloneMods,
        installedEngines,
        (deletedId) => {
          this.cachedMods = this.cachedMods.filter(
            (mod) => !sameId(mod.id, deletedId),
          );
          this.cachedStandaloneMods = this.cachedStandaloneMods.filter(
            (mod) => !sameId(mod.id, deletedId),
          );
        },
        () => {
          this.loadInstalledMods(true);
        },
      );
      this.applySearchFilter();
      this.renderPendingInstallCards();
      this.cachedViews.mods = gridContainer;
      container.scrollTop = savedScrollTop;
      requestAnimationFrame(() => {
        container.scrollTop = savedScrollTop;
      });
    } catch (err) {
      console.error(err);
      container.innerHTML = modManagerTemplates.emptyState(
        `<i class="fa-solid fa-triangle-exclamation"></i> ${t("modManager.errorRenderingCards")}`,
      );
    }
  },
};
