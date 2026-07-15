import { FS } from "../../utils/filesystem.js";

export const engineManagerModal = {
  async init() {
    if (!document.getElementById("engine-manager-modal")) {
      const response = await fetch("src/html/engine-manager.html");
      if (!response.ok) return;
      const html = await response.text();
      const wrapper = document.createElement("div");
      wrapper.innerHTML = html;
      document.body.appendChild(wrapper.firstElementChild);

      document
        .getElementById("engine-manager-close-btn")
        .addEventListener("click", () => this.close());
      document
        .getElementById("engine-manager-modal")
        .addEventListener("click", (e) => {
          if (e.target.id === "engine-manager-modal") this.close();
        });
    }
  },

  async open() {
    await this.init();
    if (!FS.isInitialized) await FS.init();
    const modal = document.getElementById("engine-manager-modal");
    if (!modal) return;
    modal.style.display = "flex";
    requestAnimationFrame(() => modal.classList.add("show"));
    await this.loadInstalledEngines();
  },

  close() {
    const modal = document.getElementById("engine-manager-modal");
    if (!modal) return;
    modal.classList.remove("show");
    setTimeout(() => {
      modal.style.display = "none";
    }, 300);
  },

  async loadInstalledEngines() {
    const engines = await FS.getInstalledEngines();
    this.render(engines);
  },

  render(engines) {
    const container = document.getElementById("engine-manager-modal-body");
    if (!container) return;

    container.innerHTML = "";

    if (engines.length === 0) {
      container.innerHTML = `<div class="empty-mods-state">No engines installed yet.</div>`;
      return;
    }

    const gridContainer = document.createElement("div");
    gridContainer.className = "mod-manager-grid";

    engines.forEach((engine) => {
      const card = document.createElement("div");
      card.className = "mod-manager-card";
      card.innerHTML = `
        <div class="mod-manager-info">
          <h3 style="text-transform: capitalize;">${engine.id}</h3>
          <p>Version: ${engine.version}</p>
        </div>
        <button class="mod-manager-delete-btn" data-id="${engine.id}-${engine.version}">
          <i class="fa-solid fa-trash"></i>
        </button>
      `;

      const deleteBtn = card.querySelector(".mod-manager-delete-btn");
      deleteBtn.addEventListener("click", async () => {
        deleteBtn.disabled = true;
        deleteBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i>`;

        const targetPath = `${FS.enginesPath}/${engine.id}/${engine.version}`;
        try {
          if (window.NL_OS === "Windows") {
            await Neutralino.os
              .execCommand(`rmdir /S /Q "${targetPath.replace(/\//g, "\\")}"`, {
                background: true,
              })
              .catch(() => {});
          } else {
            await Neutralino.os
              .execCommand(`rm -rf "${targetPath}"`, { background: true })
              .catch(() => {});
          }
        } catch (e) {}

        await this.loadInstalledEngines();
      });

      gridContainer.appendChild(card);
    });

    container.appendChild(gridContainer);
  },
};
