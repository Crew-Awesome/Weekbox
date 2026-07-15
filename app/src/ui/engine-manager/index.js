import { FS } from "../../utils/filesystem.js";
import { ENGINE_DETAILS } from "../../config/engines.js";

// Función para extraer el color predominante del icono
function extractColor(img, targetElement) {
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
        const pr = data[i], pg = data[i + 1], pb = data[i + 2];
        if (pr > 20 && pr < 240 && pg > 20 && pg < 240 && pb > 20 && pb < 240) {
          r += pr; g += pg; b += pb; count++;
        }
      }
      if (count === 0) {
        for (let i = 0; i < data.length; i += 16) {
          r += data[i]; g += data[i + 1]; b += data[i + 2]; count++;
        }
      }
      if (count > 0) {
        r = Math.floor(r / count);
        g = Math.floor(g / count);
        b = Math.floor(b / count);
        // Asignamos el color predominante como variable CSS en la columna
        targetElement.style.setProperty("--engine-color", `rgba(${r}, ${g}, ${b}, 0.25)`);
      }
    } catch (e) {
      targetElement.style.setProperty("--engine-color", "rgba(255, 255, 255, 0.1)");
    }
  };
  
  if (img.complete) processColor();
  else img.addEventListener("load", processColor);
}

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

    // 1. Agrupar los engines por ID
    const groupedEngines = {};
    engines.forEach(engine => {
      if (!groupedEngines[engine.id]) {
        groupedEngines[engine.id] = [];
      }
      groupedEngines[engine.id].push(engine.version);
    });

    // 2. Ordenar basándonos en el orden exacto del aside
    const ENGINE_ORDER = ["vslice", "codename", "psych", "pslice", "alepsych", "fpsplus", "psychonline", "executable"];
    
    const sortedEngineEntries = Object.entries(groupedEngines).sort((a, b) => {
      const indexA = ENGINE_ORDER.indexOf(a[0]);
      const indexB = ENGINE_ORDER.indexOf(b[0]);
      // Si un engine no está en la lista (raro, pero seguro), se va al final
      const posA = indexA === -1 ? 999 : indexA;
      const posB = indexB === -1 ? 999 : indexB;
      return posA - posB;
    });

    // 3. Crear el contenedor de columnas (Estilo Carrusel)
    const columnsContainer = document.createElement("div");
    columnsContainer.className = "engine-columns-container";

    // 4. Generar una columna por cada Engine respetando el orden
    for (const [engineId, versions] of sortedEngineEntries) {
      const details = ENGINE_DETAILS[engineId] || { name: engineId, icon: "exe.png" };
      
      const column = document.createElement("div");
      column.className = "engine-column";

      // Cabecera de la columna (Fija)
      const header = document.createElement("div");
      header.className = "engine-column-header";
      header.innerHTML = `
        <img src="assets/icons/${details.icon}" alt="${details.name}" class="engine-col-icon" crossorigin="Anonymous" onerror="this.src='assets/icons/exe.png'"/>
        <span class="engine-col-name">${details.name}</span>
      `;
      column.appendChild(header);

      // Extraer el color cuando la imagen esté lista
      const imgEl = header.querySelector(".engine-col-icon");
      extractColor(imgEl, column);

      // Lista de versiones (Con Scroll Y, transparente, y líneas arriba/abajo)
      const versionsList = document.createElement("div");
      versionsList.className = "engine-versions-list";

      versions.forEach((version) => {
        const item = document.createElement("div");
        item.className = "version-item";

        item.innerHTML = `
          <span class="version-text">${version}</span>
          <div class="version-actions">
            <button class="engine-action-btn engine-dir-btn" title="Open Directory">
              <i class="fa-solid fa-folder-open"></i>
            </button>
            <button class="engine-action-btn engine-delete-btn" title="Uninstall Engine">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        `;

        // Eventos de los botones
        const dirBtn = item.querySelector(".engine-dir-btn");
        dirBtn.addEventListener("click", async () => {
          const targetPath = `${FS.enginesPath}/${engineId}/${version}`;
          try {
            await Neutralino.os.open(targetPath);
          } catch (e) {
            console.error("Could not open engine directory", e);
          }
        });

        const deleteBtn = item.querySelector(".engine-delete-btn");
        deleteBtn.addEventListener("click", async () => {
          if (!confirm(`Are you sure you want to uninstall ${details.name} (Version: ${version})?`)) return;

          deleteBtn.disabled = true;
          deleteBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i>`;
          const targetPath = `${FS.enginesPath}/${engineId}/${version}`;
          
          try {
            if (window.NL_OS === "Windows") {
              await Neutralino.os.execCommand(`rmdir /S /Q "${targetPath.replace(/\//g, "\\")}"`, { background: true }).catch(() => {});
            } else {
              await Neutralino.os.execCommand(`rm -rf "${targetPath}"`, { background: true }).catch(() => {});
            }
          } catch (e) {
            console.error("Failed to delete engine", e);
          }
          
          await this.loadInstalledEngines();
        });

        versionsList.appendChild(item);
      });

      column.appendChild(versionsList);
      columnsContainer.appendChild(column);
    }

    container.appendChild(columnsContainer);
  },
};