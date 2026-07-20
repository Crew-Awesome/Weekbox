import { FS } from "../../utils/filesystem.js";
import { filterManager } from "./filterManager.js";
import { dependenciesRenderer } from "./dependenciesRenderer.js";
import { cardRenderer } from "./cardRenderer.js";
import { modSettingsModal } from "./modSettingsModal.js";
import { localModImportModal } from "./localModImportModal.js";
import { modManagerTemplates } from "../../html/components/mod-manager.js";

export const modManagerModal = {
  engineFilter: "all",
  activeView: "mods",
  cachedMods: null,
  cachedStandaloneMods: null,
  filterDropdownCtrl: null,
  eventBound: false,
  loadRequestId: 0,
  preloadPromise: null,
  preloaded: false,

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

      document.querySelectorAll("[data-mod-manager-view]").forEach((button) =>
        button.addEventListener("click", () => {
          const view = button.dataset.modManagerView;
          if (view === this.activeView) return;
          this.activeView = view;
          this.render(this.cachedMods || [], this.cachedStandaloneMods || []);
        }),
      );

      const engineFilterElement = document.getElementById(
        "mod-manager-engine-filter",
      );
      this.filterDropdownCtrl = filterManager.setup(
        engineFilterElement,
        (newFilter) => {
          this.engineFilter = newFilter;
          this.render(this.cachedMods || [], this.cachedStandaloneMods || []);
        },
      );

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
          }
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

    if (!this.preloaded) {
      const container = document.getElementById("mod-manager-modal-body");
      if (container && !container.children.length) {
        container.innerHTML = modManagerTemplates.emptyState(
          '<i class="fa-solid fa-spinner fa-spin" style="margin-right: 8px;"></i> Loading mods...',
        );
      }
      await this.preload();
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
      if (force || !this.cachedMods) {
        [mods, standaloneMods] = await Promise.all([
          FS.getInstalledMods(),
          FS.getStandaloneMods(),
        ]);
      }
      if (requestId !== this.loadRequestId) return;

      this.cachedMods = mods;
      this.cachedStandaloneMods = standaloneMods;
      await this.render(mods, standaloneMods);
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
    document.querySelectorAll("[data-mod-manager-view]").forEach((button) => {
      const isActive = button.dataset.modManagerView === this.activeView;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
    document
      .querySelector(".mod-manager-header-actions")
      ?.classList.toggle("dependencies-view", !isModsView);
  },

  async render(mods, standaloneMods) {
    const container = document.getElementById("mod-manager-modal-body");
    if (!container) return;

    const dependencies = mods.filter((mod) => mod.kind === "dependency");
    const playableMods = mods.filter((mod) => mod.kind !== "dependency");

    this.syncActiveView();
    this.engineFilter = filterManager.syncEngineFilterOptions(
      this.engineFilter,
      playableMods,
      standaloneMods,
    );

    const standaloneModIds = new Set(standaloneMods.map((m) => String(m.id)));
    const filteredMods = playableMods.filter((mod) => {
      if (this.engineFilter === "all") return true;
      if (this.engineFilter === "executable")
        return standaloneModIds.has(String(mod.id));
      return (
        !standaloneModIds.has(String(mod.id)) &&
        mod.engineId === this.engineFilter
      );
    });

    container.innerHTML = "";

    if (this.activeView === "dependencies") {
      if (dependencies.length) {
        const installedEngines = await FS.getInstalledEngines();
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
      } else {
        container.innerHTML = modManagerTemplates.emptyState(
          "No dependencies installed yet.",
        );
      }
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
    const installedEngines = await FS.getInstalledEngines();

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
    } catch (err) {
      console.error(err);
      container.innerHTML = modManagerTemplates.emptyState(
        '<i class="fa-solid fa-triangle-exclamation"></i> Error rendering cards.',
      );
    }
  },
};
