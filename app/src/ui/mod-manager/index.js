import { FS } from "../../utils/filesystem.js";
import { gameBananaApi } from "../../api/gamebanana.js";

const engineDetails = {
  vslice: { name: "Base Game", icon: "vslice.png" },
  psych: { name: "Psych Engine", icon: "psych.png" },
  codename: { name: "Codename Engine", icon: "codename.png" },
};

function extractColor(img, card) {
  const processColor = () => {
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = img.naturalWidth || 64;
      canvas.height = img.naturalHeight || 64;
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      
      let r = 0, g = 0, b = 0, count = 0;
      for (let i = 0; i < data.length; i += 16) {
        const pr = data[i], pg = data[i+1], pb = data[i+2];
        if (pr > 20 && pr < 240 && pg > 20 && pg < 240 && pb > 20 && pb < 240) {
          r += pr; g += pg; b += pb; count++;
        }
      }
      if (count === 0) {
        for (let i = 0; i < data.length; i += 16) {
           r += data[i]; g += data[i+1]; b += data[i+2]; count++;
        }
      }
      if (count > 0) {
        r = Math.floor(r / count);
        g = Math.floor(g / count);
        b = Math.floor(b / count);
        card.style.setProperty("--card-color", `rgba(${r}, ${g}, ${b}, 0.7)`);
      }
    } catch (e) {
      card.style.setProperty("--card-color", "rgba(255, 255, 255, 0.3)");
    }
  };

  if (img.complete) processColor();
  else img.addEventListener("load", processColor);
}

export const modManagerModal = {
  async init() {
    if (!document.getElementById("mod-manager-modal")) {
      const response = await fetch("src/html/mod-manager.html");
      if (!response.ok) return;
      const html = await response.text();
      const wrapper = document.createElement("div");
      wrapper.innerHTML = html;
      document.body.appendChild(wrapper.firstElementChild);
      
      document.getElementById("mod-manager-close-btn").addEventListener("click", () => this.close());
      document.getElementById("mod-manager-modal").addEventListener("click", (e) => {
        if (e.target.id === "mod-manager-modal") this.close();
      });

      const toggleBtn = document.getElementById("mod-manager-view-toggle");
      toggleBtn.addEventListener("click", () => {
        const grid = document.getElementById("mod-manager-grid-container");
        if (!grid) return;
        const isListView = grid.classList.toggle("list-view");
        localStorage.setItem("weekbox_mod_manager_view", isListView ? "list" : "grid");
        toggleBtn.querySelector("i").className = isListView ? "fa-solid fa-table-cells-large" : "fa-solid fa-list";
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
    await this.loadInstalledMods();
  },

  close() {
    const modal = document.getElementById("mod-manager-modal");
    if (!modal) return;
    modal.classList.remove("show");
    setTimeout(() => {
      modal.style.display = "none";
    }, 300);
  },

  async getBase64FromUrl(url) {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      return null;
    }
  },

  async loadInstalledMods() {
    const mods = await FS.getInstalledMods();
    const standaloneMods = await FS.getStandaloneMods();
    await this.render(mods, standaloneMods);
  },

  async render(mods, standaloneMods) {
    const container = document.getElementById("mod-manager-modal-body");
    if (!container) return;

    container.innerHTML = "";
    if (mods.length === 0) {
      container.innerHTML = `<div class="empty-mods-state">No mods installed yet.</div>`;
      return;
    }

    const gridContainer = document.createElement("div");
    gridContainer.id = "mod-manager-grid-container";
    gridContainer.className = "mod-manager-grid";
    
    const isListView = localStorage.getItem("weekbox_mod_manager_view") === "list";
    if (isListView) gridContainer.classList.add("list-view");
    const toggleIcon = document.querySelector("#mod-manager-view-toggle i");
    if (toggleIcon) toggleIcon.className = isListView ? "fa-solid fa-table-cells-large" : "fa-solid fa-list";

    container.appendChild(gridContainer);

    let needsJsonUpdate = false;
    const standaloneModIds = new Set(standaloneMods.map((m) => m.id));

    for (const mod of mods) {
      let imageUrl = "assets/icons/default-mod.png";

      if (mod.imageBase64) {
        imageUrl = mod.imageBase64;
      } else {
        let remoteUrl = mod.image; 
        if (!remoteUrl) {
          const details = await gameBananaApi.getModDetails(mod.id);
          if (details && details.images && details.images.length > 0) {
            remoteUrl = details.images[0];
          }
        }
        
        if (remoteUrl) {
          const b64 = await this.getBase64FromUrl(remoteUrl);
          if (b64) {
            imageUrl = b64;
            mod.imageBase64 = b64; 
            needsJsonUpdate = true;
          }
        }
      }

      const isExecutable = standaloneModIds.has(mod.id);
      let engineBadgeHtml = `<div class="mod-manager-engine-badge"><i class="fa-solid fa-question-circle"></i><span>Unassigned</span></div>`;
      
      if (isExecutable) {
        engineBadgeHtml = `
          <div class="mod-manager-engine-badge">
            <img src="assets/icons/exe.png" alt="Executable"/>
            <span>Executable</span>
          </div>`;
      } else if (engineDetails[mod.engineId]) {
        const engineInfo = engineDetails[mod.engineId];
        engineBadgeHtml = `
          <div class="mod-manager-engine-badge">
            <img src="assets/icons/${engineInfo.icon}" alt=""/>
            <span>${engineInfo.name}</span>
          </div>`;
      }

      const isHidden = mod.hidden ? "opacity: 0.5;" : "";
      const eyeIcon = mod.hidden ? "fa-eye-slash" : "fa-eye";

      const card = document.createElement("div");
      card.className = "mod-manager-card";
      card.style = isHidden;
      // Aplicamos crossOrigin para poder leer el color
      card.innerHTML = `
        <img class="mod-manager-cover" crossorigin="Anonymous" src="${imageUrl}" alt="Mod Cover" onerror="this.src='https://images.gamebanana.com/img/ss/mods/default.jpg'"/>
        <div class="mod-manager-card-body">
            <div class="mod-manager-info">
              <h3 title="${mod.name}">${mod.name}</h3>
              ${engineBadgeHtml}
            </div>
            <div class="mod-manager-actions">
              <button class="mod-action-btn mod-manager-vis-btn" title="Toggle Visibility">
                <i class="fa-solid ${eyeIcon}"></i>
              </button>
              <button class="mod-action-btn mod-manager-dir-btn" title="Open Directory">
                <i class="fa-solid fa-folder-open"></i>
              </button>
              <button class="mod-action-btn mod-manager-delete-btn" data-id="${mod.id}" title="Delete Mod">
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
        </div>
      `;

      // Extraer color
      const imgEl = card.querySelector(".mod-manager-cover");
      extractColor(imgEl, card);

      const deleteBtn = card.querySelector(".mod-manager-delete-btn");
      deleteBtn.addEventListener("click", async () => {
        deleteBtn.disabled = true;
        deleteBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i>`;
        
        await FS.removeInstalledMod(mod.id);
        
        card.style.transform = "scale(0.8) translateY(10px)";
        card.style.opacity = "0";
        setTimeout(() => {
          card.remove();
          if (gridContainer.children.length === 0) {
            container.innerHTML = `<div class="empty-mods-state">No mods installed yet.</div>`;
          }
        }, 300);

        document.dispatchEvent(new CustomEvent("mods-updated"));
      });

      const dirBtn = card.querySelector(".mod-manager-dir-btn");
      dirBtn.addEventListener("click", async () => {
        try {
          const modPath = `${FS.modsPath}/${mod.folderName || mod.name.replace(/[<>:"/\\|?*]+/g, "").trim()}`;
          await Neutralino.os.open(modPath);
        } catch (e) {
          console.error("Could not open mod directory", e);
        }
      });

      const visBtn = card.querySelector(".mod-manager-vis-btn");
      visBtn.addEventListener("click", async () => {
        const allMods = await FS.getInstalledMods();
        const m = allMods.find((x) => x.id === mod.id);
        if (m) {
          m.hidden = !m.hidden;
          const jsonPath = `${FS.dataPath}/installedmods.json`;
          await FS.api.write(jsonPath, JSON.stringify(allMods, null, 2));
          
          mod.hidden = m.hidden;
          card.style.opacity = mod.hidden ? "0.5" : "1";
          visBtn.querySelector("i").className = mod.hidden ? "fa-solid fa-eye-slash" : "fa-solid fa-eye";

          document.dispatchEvent(new CustomEvent("mods-updated"));
        }
      });

      gridContainer.appendChild(card);
    }

    if (needsJsonUpdate) {
      const jsonPath = `${FS.dataPath}/installedmods.json`;
      await FS.api.write(jsonPath, JSON.stringify(mods, null, 2));
    }
  }
};