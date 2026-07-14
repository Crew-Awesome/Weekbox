import { appEvents } from "../../core/events.js";
import { FS } from "../../utils/filesystem.js";

export const modManagerView = {
  async init() {
    if (!FS.isInitialized) await FS.init();
    this.container = document.getElementById("mod-manager-modal-content") || document.querySelector(".home-content");
    await this.loadInstalledMods();
  },

  async loadInstalledMods() {
    const mods = await FS.getInstalledMods();
    this.render(mods);
  },

  render(mods) {
    if (!this.container) return;
    
    let gridContainer = this.container.querySelector(".mod-manager-grid");
    if (!gridContainer) {
      gridContainer = document.createElement("div");
      gridContainer.className = "mod-manager-grid";
      this.container.appendChild(gridContainer);
    }
    
    gridContainer.innerHTML = "";

    if (mods.length === 0) {
      gridContainer.innerHTML = `<div class="empty-mods-state">No mods installed yet.</div>`;
      return;
    }

    mods.forEach(mod => {
      const card = document.createElement("div");
      card.className = "mod-manager-card";
      card.innerHTML = `
        <div class="mod-manager-info">
          <h3>${mod.name}</h3>
          <p>Engine: ${mod.engineId || "Unassigned"}</p>
        </div>
        <button class="mod-manager-delete-btn" data-id="${mod.id}">
          <i class="fa-solid fa-trash"></i>
        </button>
      `;

      const deleteBtn = card.querySelector(".mod-manager-delete-btn");
      deleteBtn.addEventListener("click", async () => {
        deleteBtn.disabled = true;
        deleteBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i>`;
        await FS.removeInstalledMod(mod.id);
        await this.loadInstalledMods();
      });

      gridContainer.appendChild(card);
    });
  },

  destroy() {
    if (this.container) {
      const gridContainer = this.container.querySelector(".mod-manager-grid");
      if (gridContainer) gridContainer.innerHTML = "";
    }
    this.container = null;
  }
};

export function registerModManagerView() {
  appEvents.addEventListener("view:loaded", (event) => {
    if (event.detail === "mods" || event.detail === "mod-manager") {
      modManagerView.init();
    } else {
      modManagerView.destroy();
    }
  });
}