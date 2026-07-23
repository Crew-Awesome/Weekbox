import { FS } from "../../../utils/filesystem.js";
import { dependenciesRenderer } from "./dependenciesRenderer.js";
import { cardRenderer } from "./cardRenderer.js";
import { modSettingsModal } from "./modSettingsModal.js";
import { localModImportModal } from "./localModImportModal.js";
import { modManagerTemplates } from "../../html/components/mod-manager.js";
import { openFilterSortModal } from "./filterSortModal.js";

export const modManagerModal = {
  typeFilter: "all",
  sortMode: "added-desc",
  searchQuery: "",
  activeView: "mods",
  cachedMods: null,
  cachedStandaloneMods: null,
  cachedInstalledEngines: null,
  cachedViews: { mods: null, dependencies: null },
  eventBound: false,
  loadRequestId: 0,
  preloadPromise: null,
  preloaded: false,
  pendingInstalls: new Map(),

  async init() {
    if (!document.getElementById("mod-manager-modal")) {
      const wrapper = document.createElement("div");
      wrapper.innerHTML = modManagerTemplates.mainModal();
      document.body.appendChild(wrapper.firstElementChild);

      document
        .getElementById("mod-manager-close-btn")
        .addEventListener("click", () => this.close());
      document
        .getElementById("mod-manager-modal")
        .addEventListener("click", (e) => {
          if (e.target.id === "mod-manager-modal") this.close();
        });

      const toggleBtn = document.getElementById("mod-manager-view-toggle");
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
        toggleBtn.querySelector("i").className = isListView
          ? "fa-solid fa-table-cells-large"
          : "fa-solid fa-list";
      });

      document
        .getElementById("mod-manager-dependencies-toggle")
        .addEventListener("click", () => {
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

      document
        .getElementById("mod-manager-search-input")
        .addEventListener("input", (event) => {
          this.searchQuery = event.target.value.trim().toLocaleLowerCase();
          this.applySearchFilter();
        });

      document
        .getElementById("mod-manager-filter-toggle")
        .addEventListener("click", () => {
          openFilterSortModal({
            filter: this.typeFilter,
            sort: this.sortMode,
            engineIds: [
              ...new Set(
                (this.cachedMods || [])
                  .filter((mod) => mod.kind !== "dependency" && mod.engineId)
                  .map((mod) => mod.engineId),
              ),
            ],
            onApply: ({ filter, sort }) => {
              this.typeFilter = filter;
              this.sortMode = sort;
              this.render(
                this.cachedMods || [],
                this.cachedStandaloneMods || [],
              );
            },
          });
        });

      // FIX: Escuchar eventos globales de actualización para refrescar automáticamente
      // si la ventana está abierta y una descarga termina.
      if (!this.eventBound) {
        document.addEventListener("mods-updated", () => {
          if (
            document
              .getElementById("mod-manager-modal")
              ?.classList.contains("show")
          ) {
            this.loadInstalledMods(true);
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

    modal.style.display = "flex";
    requestAnimationFrame(() => modal.classList.add("show"));
    this.renderPendingInstallCards();

    if (!this.preloaded) {
      const container = document.getElementById("mod-manager-modal-body");
      if (container && !container.children.length) {
        container.innerHTML = modManagerTemplates.emptyState(
          '<i class="fa-solid fa-spinner fa-spin" style="margin-right: 8px;"></i> Loading mods...',
        );
      }
      await this.preload();
    } else {
      await this.loadInstalledMods(true);
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
    modSettingsModal.close();
    const modal = document.getElementById("mod-manager-modal");
    if (!modal) return;
    modal.classList.remove("show");
    setTimeout(() => {
      modal.style.display = "none";
    }, 300);
  },

  async loadInstalledMods(force = false) {
    const requestId = ++this.loadRequestId;
    try {
      let mods = this.cachedMods;
      let standaloneMods = this.cachedStandaloneMods;
      let installedEngines = this.cachedInstalledEngines;
      if (force || !this.cachedMods || !this.cachedInstalledEngines) {
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
          '<i class="fa-solid fa-triangle-exclamation"></i> Error loading your mods.',
        );
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
      const currentLabel = isModsView ? "Mods" : "Dependencies";
      const nextLabel = isModsView ? "Dependencies" : "Mods";
      const label = dependenciesToggle.querySelector("span");
      label.textContent = currentLabel;
      label.dataset.hoverLabel = nextLabel;
      dependenciesToggle.setAttribute("aria-label", `Show ${nextLabel}`);
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
      const addLocalCard = grid.querySelector(".mod-manager-add-local-card");
      grid.insertBefore(card, addLocalCard || null);
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
    const playableMods = mods.filter((mod) => mod.kind !== "dependency");

    this.syncActiveView();
    const standaloneModIds = new Set(standaloneMods.map((m) => String(m.id)));
    const modOrder = new Map(
      playableMods.map((mod, index) => [String(mod.id), index]),
    );
    const filteredMods = playableMods
      .filter((mod) => {
        const isExecutable = standaloneModIds.has(String(mod.id));
        if (
          this.typeFilter.startsWith("engine:") &&
          mod.engineId !== this.typeFilter.slice("engine:".length)
        )
          return false;
        if (this.typeFilter === "executable" && !isExecutable) return false;
        if (this.typeFilter === "unassigned" && (mod.engineId || isExecutable))
          return false;
        return true;
      })
      .sort((left, right) => {
        if (this.sortMode === "name-asc")
          return String(left.name || "").localeCompare(
            String(right.name || ""),
          );
        if (this.sortMode === "name-desc")
          return String(right.name || "").localeCompare(
            String(left.name || ""),
          );
        if (this.sortMode === "engine-asc")
          return String(left.engineId || "").localeCompare(
            String(right.engineId || ""),
          );
        if (this.sortMode === "engine-desc")
          return String(right.engineId || "").localeCompare(
            String(left.engineId || ""),
          );
        const difference =
          modOrder.get(String(left.id)) - modOrder.get(String(right.id));
        return this.sortMode === "added-asc" ? difference : -difference;
      });

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
            this.cachedMods = this.cachedMods.filter((m) => m.id !== deletedId);
            this.cachedStandaloneMods = this.cachedStandaloneMods.filter(
              (m) => m.id !== deletedId,
            );
            this.render(this.cachedMods, this.cachedStandaloneMods);
            document.dispatchEvent(new CustomEvent("mods-updated"));
          },
          () => this.loadInstalledMods(true),
        );
        this.cachedViews.dependencies = container.firstElementChild;
      } else {
        container.innerHTML = modManagerTemplates.emptyState(
          "No dependencies installed yet.",
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
          this.cachedMods = this.cachedMods.filter((m) => m.id !== deletedId);
          this.cachedStandaloneMods = this.cachedStandaloneMods.filter(
            (m) => m.id !== deletedId,
          );
        },
        () => {
          this.loadInstalledMods(true);
        },
      );
      this.applySearchFilter();
      this.renderPendingInstallCards();
      const addLocalCard = document.createElement("div");
      addLocalCard.innerHTML = modManagerTemplates.addLocalModCard();
      const addLocalButton = addLocalCard.firstElementChild;
      addLocalButton.addEventListener("click", async () => {
        if (addLocalButton.disabled) return;
        addLocalButton.disabled = true;
        try {
          await localModImportModal.open({
            onImported: () => this.loadInstalledMods(true),
          });
        } finally {
          addLocalButton.disabled = false;
        }
      });
      gridContainer.appendChild(addLocalButton);
      this.cachedViews.mods = gridContainer;
      container.scrollTop = savedScrollTop;
      requestAnimationFrame(() => {
        container.scrollTop = savedScrollTop;
      });
    } catch (err) {
      console.error(err);
      container.innerHTML = modManagerTemplates.emptyState(
        '<i class="fa-solid fa-triangle-exclamation"></i> Error rendering cards.',
      );
    }
  },
};
