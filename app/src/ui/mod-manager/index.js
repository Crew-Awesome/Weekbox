import { FS } from "../../utils/filesystem.js";
import { filterManager } from "./filterManager.js";
import { dependenciesRenderer } from "./dependenciesRenderer.js";
import { cardRenderer } from "./cardRenderer.js";
import { modManagerTemplates } from "../../html/components/mod-manager.js";

export const modManagerModal = {
  engineFilter: "all",
  activeView: "mods",
  cachedMods: null,
  cachedStandaloneMods: null,
  filterDropdownCtrl: null,
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
          "weekbox_mod_manager_view",
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
      const engineFilterElement = document.getElementById("mod-manager-engine-filter");
      this.filterDropdownCtrl = filterManager.setup(engineFilterElement, (newFilter) => {
        this.engineFilter = newFilter;
        this.render(this.cachedMods || [], this.cachedStandaloneMods || []);
      });
    }
  },
  async open() {
    await this.init();
    if (!FS.isInitialized) await FS.init();
    const modal = document.getElementById("mod-manager-modal");
    if (!modal) return;
    modal.style.display = "flex";
    requestAnimationFrame(() => modal.classList.add("show"));
    await this.loadInstalledMods(true);
  },
  close() {
    const modal = document.getElementById("mod-manager-modal");
    if (!modal) return;
    modal.classList.remove("show");
    setTimeout(() => {
      modal.style.display = "none";
    }, 300);
  },
  async loadInstalledMods(force = false) {
    if (force || !this.cachedMods) {
      this.cachedMods = await FS.getInstalledMods();
      this.cachedStandaloneMods = await FS.getStandaloneMods();
    }
    this.render(this.cachedMods, this.cachedStandaloneMods);
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
    this.engineFilter = filterManager.syncEngineFilterOptions(this.engineFilter, playableMods, standaloneMods);
    const standaloneModIds = new Set(standaloneMods.map((m) => m.id));
    const filteredMods = playableMods.filter((mod) => {
      if (this.engineFilter === "all") return true;
      if (this.engineFilter === "executable")
        return standaloneModIds.has(mod.id);
      return (
        !standaloneModIds.has(mod.id) && mod.engineId === this.engineFilter
      );
    });
    container.innerHTML = "";
    if (this.activeView === "dependencies") {
      if (dependencies.length) {
        dependenciesRenderer.render(container, dependencies, mods, (deletedId) => {
          this.cachedMods = this.cachedMods.filter(m => m.id !== deletedId);
          this.cachedStandaloneMods = this.cachedStandaloneMods.filter(m => m.id !== deletedId);
          this.render(this.cachedMods, this.cachedStandaloneMods);
          document.dispatchEvent(new CustomEvent("mods-updated"));
        });
      } else {
        container.innerHTML = modManagerTemplates.emptyState("No dependencies installed yet.");
      }
      return;
    }
    if (filteredMods.length === 0) {
      const message =
        playableMods.length === 0
          ? "No mods installed yet."
          : "No mods match this engine filter.";
      container.innerHTML = modManagerTemplates.emptyState(message);
      return;
    }
    const gridContainer = document.createElement("div");
    gridContainer.id = "mod-manager-grid-container";
    gridContainer.className = "mod-manager-grid";
    const isListView = localStorage.getItem("weekbox_mod_manager_view") === "list";
    if (isListView) gridContainer.classList.add("list-view");
    const toggleIcon = document.querySelector("#mod-manager-view-toggle i");
    if (toggleIcon)
      toggleIcon.className = isListView
        ? "fa-solid fa-table-cells-large"
        : "fa-solid fa-list";
    container.appendChild(gridContainer);
    const installedEngines = await FS.getInstalledEngines();
    await cardRenderer.renderCards(
      gridContainer,
      filteredMods,
      mods,
      standaloneMods,
      installedEngines,
      (deletedId) => {
        this.cachedMods = this.cachedMods.filter(m => m.id !== deletedId);
        this.cachedStandaloneMods = this.cachedStandaloneMods.filter(m => m.id !== deletedId);
      },
      () => {
        this.loadInstalledMods(true);
      }
    );
  }
};