import { FS } from "../../utils/filesystem.js";
import { ENGINE_DETAILS } from "../../config/engines.js";
import { engineUpdateService } from "../engines/engineUpdateService.js";
import { engineUpdateToast } from "../engines/engineUpdateToast.js";
import { applyDominantColor } from "../../utils/extractColor.js";
import { networkStatus } from "../../core/networkStatus.js";

export const engineManagerModal = {
  currentIndex: 0,
  resizeObserver: null,
  async init() {
    if (!document.getElementById("engine-manager-modal")) {
      const response = await fetch("src/html/sections/engine-manager.html");
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
      networkStatus.addEventListener("change", () => {
        if (
          document
            .getElementById("engine-manager-modal")
            ?.classList.contains("show")
        ) {
          void this.loadInstalledEngines();
        }
      });
      document.addEventListener("weekbox-process-exit", () => {
        if (
          document
            .getElementById("engine-manager-modal")
            ?.classList.contains("show")
        ) {
          void this.loadInstalledEngines();
        }
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
      if (this.resizeObserver) {
        this.resizeObserver.disconnect();
        this.resizeObserver = null;
      }
    }, 300);
  },
  async loadInstalledEngines() {
    const engines = await FS.getInstalledEngines();
    this.render(engines);
  },
  render(engines) {
    const container = document.getElementById("engine-manager-modal-body");
    if (!container) return;
    // Limpieza de renderizado previo
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    container.innerHTML = "";
    if (engines.length === 0) {
      container.innerHTML = `<div class="empty-mods-state" style="margin: auto;">No engines installed yet.</div>`;
      return;
    }
    // 1. Agrupar los engines por ID
    const groupedEngines = {};
    engines.forEach((engine) => {
      if (!groupedEngines[engine.id]) {
        groupedEngines[engine.id] = [];
      }
      groupedEngines[engine.id].push(engine.version);
    });
    // 2. Ordenar bas ndonos en el orden exacto del aside
    const ENGINE_ORDER = [
      "vslice",
      "codename",
      "psych",
      "pslice",
      "fpsplus",
      "psychonline",
      "executable",
    ];
    const sortedEngineEntries = Object.entries(groupedEngines).sort((a, b) => {
      const indexA = ENGINE_ORDER.indexOf(a[0]);
      const indexB = ENGINE_ORDER.indexOf(b[0]);
      const posA = indexA === -1 ? 999 : indexA;
      const posB = indexB === -1 ? 999 : indexB;
      return posA - posB;
    });
    // Ajustar el índice por si se borró el último elemento
    if (this.currentIndex >= sortedEngineEntries.length) {
      this.currentIndex = Math.max(0, sortedEngineEntries.length - 1);
    }
    // 3. Crear elementos del layout del carrusel
    const viewport = document.createElement("div");
    viewport.className = "em-carousel-viewport";
    const track = document.createElement("div");
    track.className = "em-carousel-track";
    const btnPrev = document.createElement("button");
    btnPrev.className = "em-nav-btn left";
    btnPrev.innerHTML = '<i class="fa-solid fa-chevron-left"></i>';
    const btnNext = document.createElement("button");
    btnNext.className = "em-nav-btn right";
    btnNext.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
    const indexContainer = document.createElement("div");
    indexContainer.className = "em-carousel-index";
    viewport.appendChild(track);
    viewport.appendChild(btnPrev);
    viewport.appendChild(btnNext);
    container.appendChild(viewport);
    container.appendChild(indexContainer);

    // 4. Generar las tarjetas y los iconos del índice
    sortedEngineEntries.forEach(([engineId, versions], idx) => {
      const details = ENGINE_DETAILS[engineId] || {
        name: engineId,
        icon: "exe.png",
      };
      const card = document.createElement("div");
      card.className = "engine-column";
      card.addEventListener("click", () => {
        if (this.currentIndex !== idx) {
          this.currentIndex = idx;
          updateCarousel();
        }
      });
      const header = document.createElement("div");
      header.className = "engine-column-header";
      header.innerHTML = `
        <img src="assets/icons/${details.icon}" alt="${details.name}" class="engine-col-icon" crossorigin="Anonymous" onerror="this.src='assets/icons/exe.png'"/>
        <span class="engine-col-name">${details.name}</span>
      `;
      card.appendChild(header);

      // Aplicar color extraído con la nueva utilidad y opciones personalizadas
      const imgEl = header.querySelector(".engine-col-icon");
      applyDominantColor(imgEl, card, {
        cssVar: "--engine-color",
        alpha: 0.25,
        fallback: "rgba(255, 255, 255, 0.1)",
      });

      const versionsList = document.createElement("div");
      versionsList.className = "engine-versions-list";
      versions.forEach((version) => {
        const item = document.createElement("div");
        item.className = "version-item";
        const updateDisabled = !networkStatus.online;
        const running = FS.isEngineRunning(engineId, version);
        item.innerHTML = `
          <span class="version-text">${version}</span>
          <div class="version-actions">
            ${
              (engineId === "codename" && version === "Nightly") ||
              (engineId === "psychonline" && version === "Latest")
                ? `
              <button class="engine-action-btn engine-update-btn" title="${updateDisabled ? "Connect to the internet to check for updates" : "Check for updates"}" aria-label="Check ${details.name} for updates" ${updateDisabled ? "disabled" : ""}>
                <i class="fa-solid fa-rotate"></i>
              </button>`
                : ""
            }
            <button class="engine-action-btn engine-dir-btn" title="Open Directory">
              <i class="fa-solid fa-folder-open"></i>
            </button>
            <button class="engine-action-btn engine-delete-btn" title="${running ? "Close the engine before uninstalling" : "Uninstall Version"}" aria-label="${running ? "Close the engine before uninstalling" : "Uninstall Version"}" ${running ? "disabled" : ""}>
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        `;
        const updateBtn = item.querySelector(".engine-update-btn");
        updateBtn?.addEventListener("click", async (e) => {
          e.stopPropagation();
          updateBtn.disabled = true;
          updateBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
          const result = await engineUpdateService.checkEngineUpdate(
            engineId,
            version,
          );
          if (result.status === "current") {
            engineUpdateToast.info(
              engineId,
              details.name,
              "Already up to date",
            );
          } else if (result.status === "skipped") {
            engineUpdateToast.info(
              engineId,
              details.name,
              "This update is skipped",
            );
          } else if (result.status === "pinned") {
            engineUpdateToast.info(
              engineId,
              details.name,
              "This version is pinned",
            );
          } else if (result.status === "unavailable") {
            engineUpdateToast.info(
              engineId,
              details.name,
              "Could not check for updates",
            );
          } else if (result.status === "running") {
            engineUpdateToast.info(
              engineId,
              details.name,
              "Close the engine before updating",
            );
          } else if (result.status === "offline") {
            engineUpdateToast.info(
              engineId,
              details.name,
              "Connect to the internet to check for updates",
            );
          }
          updateBtn.disabled = false;
          updateBtn.innerHTML = '<i class="fa-solid fa-rotate"></i>';
        });
        item
          .querySelector(".engine-dir-btn")
          .addEventListener("click", async (e) => {
            e.stopPropagation();
            const targetPath = `${FS.enginesPath}/${engineId}/${version}`;
            try {
              await Neutralino.os.open(targetPath);
            } catch (e) {}
          });
        const deleteBtn = item.querySelector(".engine-delete-btn");
        deleteBtn.addEventListener("click", async (e) => {
          e.stopPropagation();
          if (FS.isEngineRunning(engineId, version)) return;
          deleteBtn.disabled = true;
          deleteBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i>`;
          const targetPath = `${FS.enginesPath}/${engineId}/${version}`;
          try {
            if (window.NL_OS === "Windows") {
              await Neutralino.os
                .execCommand(
                  `rmdir /S /Q "${targetPath.replace(/\//g, "\\")}"`,
                  { background: false },
                )
                .catch(() => {});
            } else {
              await Neutralino.os
                .execCommand(`rm -rf "${targetPath}"`, { background: false })
                .catch(() => {});
            }
          } catch (e) {}
          await this.loadInstalledEngines(); // Recarga automatica
        });
        versionsList.appendChild(item);
      });
      card.appendChild(versionsList);
      track.appendChild(card);
      // -- Icono del  ndice Inferior (Pastilla) --
      const indexIcon = document.createElement("img");
      indexIcon.className = "em-index-icon";
      indexIcon.src = `assets/icons/${details.icon}`;
      indexIcon.onerror = () => (indexIcon.src = "assets/icons/exe.png");
      indexIcon.title = details.name;
      indexIcon.addEventListener("click", () => {
        this.currentIndex = idx;
        updateCarousel();
      });
      indexContainer.appendChild(indexIcon);
    });
    // 5. L gica de c lculo y actualizaci n del Carrusel
    const updateCarousel = () => {
      const vw = viewport.clientWidth;
      if (vw === 0) return;
      const cardWidth = 300;
      const gap = 30;
      const offset =
        vw / 2 - cardWidth / 2 - this.currentIndex * (cardWidth + gap);
      track.style.transform = `translateX(${offset}px)`;
      Array.from(track.children).forEach((col, idx) => {
        col.classList.toggle("active", idx === this.currentIndex);
      });
      Array.from(indexContainer.children).forEach((icon, idx) => {
        icon.classList.toggle("active", idx === this.currentIndex);
      });
      btnPrev.style.display = this.currentIndex === 0 ? "none" : "flex";
      btnNext.style.display =
        this.currentIndex === sortedEngineEntries.length - 1 ? "none" : "flex";
    };
    btnPrev.addEventListener("click", () => {
      if (this.currentIndex > 0) {
        this.currentIndex--;
        updateCarousel();
      }
    });
    btnNext.addEventListener("click", () => {
      if (this.currentIndex < sortedEngineEntries.length - 1) {
        this.currentIndex++;
        updateCarousel();
      }
    });
    this.resizeObserver = new ResizeObserver(() => updateCarousel());
    this.resizeObserver.observe(viewport);
    requestAnimationFrame(updateCarousel);
  },
};
