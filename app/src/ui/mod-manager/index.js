import { FS } from "../../utils/filesystem.js";
import {
  getModFolderName,
  sanitizePathSegment,
} from "../../utils/filesystem/pathUtils.js";
import { gameBananaApi } from "../../api/gamebanana.js";
import { ENGINE_DETAILS } from "../../config/engines.js";

function extractColor(img, card) {
  const processColor = () => {
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = img.naturalWidth || 64;
      canvas.height = img.naturalHeight || 64;
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

      let r = 0,
        g = 0,
        b = 0,
        count = 0;
      for (let i = 0; i < data.length; i += 16) {
        const pr = data[i],
          pg = data[i + 1],
          pb = data[i + 2];
        if (pr > 20 && pr < 240 && pg > 20 && pg < 240 && pb > 20 && pb < 240) {
          r += pr;
          g += pg;
          b += pb;
          count++;
        }
      }
      if (count === 0) {
        for (let i = 0; i < data.length; i += 16) {
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          count++;
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

    const isListView =
      localStorage.getItem("weekbox_mod_manager_view") === "list";
    if (isListView) gridContainer.classList.add("list-view");
    const toggleIcon = document.querySelector("#mod-manager-view-toggle i");
    if (toggleIcon)
      toggleIcon.className = isListView
        ? "fa-solid fa-table-cells-large"
        : "fa-solid fa-list";

    container.appendChild(gridContainer);

    let needsJsonUpdate = false;
    const standaloneModIds = new Set(standaloneMods.map((m) => m.id));
    const installedEngines = await FS.getInstalledEngines();

    const refreshLaunchButtons = () => {
      gridContainer.querySelectorAll(".mod-manager-launch-btn").forEach((button) => {
        if (button.disabled) return;
        const engineIsRunning =
          button.dataset.launchKind === "standalone"
            ? FS.isStandaloneModRunning(button.dataset.modId)
            : FS.isEngineRunning(
                button.dataset.engineId,
                button.dataset.engineVersion,
              );
        const runningModId =
          button.dataset.engineId === "codename"
            ? FS.getRunningEngineMod(
                button.dataset.engineId,
                button.dataset.engineVersion,
              )
            : null;
        const isRunning =
          engineIsRunning &&
          (button.dataset.engineId !== "codename" ||
            String(runningModId) === button.dataset.modId);
        const canSwitchMod =
          engineIsRunning &&
          button.dataset.engineId === "codename" &&
          runningModId !== null &&
          String(runningModId) !== button.dataset.modId;
        button.classList.toggle("is-running", isRunning);
        button.classList.toggle("is-switchable", canSwitchMod);
        button.setAttribute(
          "aria-label",
          `${isRunning ? "Close" : canSwitchMod ? "Switch Mod" : button.dataset.launchLabel} ${button.dataset.modName}`,
        );
        button.innerHTML = isRunning
          ? `<i class="fa-solid fa-play" aria-hidden="true"></i><span class="mod-manager-running-label">Running</span><span class="mod-manager-close-label">Close</span>`
          : canSwitchMod
            ? `<i class="fa-solid fa-right-left" aria-hidden="true"></i><span>Switch Mod</span>`
            : `<i class="fa-solid fa-play" aria-hidden="true"></i><span>${button.dataset.launchLabel}</span>`;
      });
    };

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
      const engine = isExecutable
        ? null
        : installedEngines.find((item) => item.id === mod.engineId);
      let engineBadgeHtml = `<div class="mod-manager-engine-badge"><i class="fa-solid fa-question-circle"></i><span>Unassigned</span></div>`;

      if (isExecutable) {
        engineBadgeHtml = `
          <div class="mod-manager-engine-badge">
            <img src="assets/icons/exe.png" alt="Executable"/>
            <span>Executable</span>
          </div>`;
      } else if (ENGINE_DETAILS[mod.engineId]) {
        const engineInfo = ENGINE_DETAILS[mod.engineId];
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
      card.classList.toggle("is-hidden", Boolean(mod.hidden));
      card.style = isHidden;
      const launchLabel =
        isExecutable || mod.engineId === "codename" ? "Launch Mod" : "Launch Engine";
      // Aplicamos crossOrigin para poder leer el color
      card.innerHTML = `
        <div class="mod-manager-cover-wrap">
          <img class="mod-manager-cover" crossorigin="Anonymous" src="${imageUrl}" alt="Mod Cover" onerror="this.src='https://images.gamebanana.com/img/ss/mods/default.jpg'"/>
          <button class="mod-manager-launch-btn" type="button" data-launch-kind="${isExecutable ? "standalone" : "engine"}" data-mod-id="${mod.id}" data-engine-id="${engine?.id || ""}" data-engine-version="${engine?.version || ""}" data-launch-label="${launchLabel}" data-mod-name="${mod.name}" aria-label="${launchLabel} ${mod.name}" ${mod.hidden ? "disabled" : ""}>
            <i class="fa-solid fa-play" aria-hidden="true"></i><span>${launchLabel}</span>
          </button>
        </div>
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
      const launchBtn = card.querySelector(".mod-manager-launch-btn");
      launchBtn.addEventListener("click", async () => {
        launchBtn.disabled = true;
        try {
          if (isExecutable) {
            if (FS.isStandaloneModRunning(mod.id)) {
              await FS.closeStandaloneMod(mod.id);
            } else {
              await FS.runStandaloneMod(mod.id, refreshLaunchButtons);
            }
          } else {
            if (!engine) throw new Error("Assigned engine is not installed");
            const launchEngine = async () => {
              await FS.injectModIntoEngine(mod.id, engine.id, engine.version);
              const args =
                engine.id === "codename"
                  ? ["-mod", getModFolderName(mod)]
                  : [];
              await FS.runEngine(
                engine.id,
                engine.version,
                refreshLaunchButtons,
                args,
                engine.id === "codename" ? mod.id : null,
              );
            };
            if (!FS.isEngineRunning(engine.id, engine.version)) {
              await launchEngine();
            } else if (
              engine.id === "codename" &&
              FS.getRunningEngineMod(engine.id, engine.version) !== mod.id
            ) {
              if (await FS.closeEngineAndWait(engine.id, engine.version)) {
                await launchEngine();
              }
            } else {
              await FS.closeEngine(engine.id, engine.version);
            }
          }
        } catch (error) {
          console.error("Could not launch mod", error);
        } finally {
          launchBtn.disabled = false;
          refreshLaunchButtons();
        }
      });
      deleteBtn.addEventListener("click", async () => {
        deleteBtn.disabled = true;
        deleteBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i>`;
        try {
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
        } catch (error) {
          console.error("Could not uninstall mod", error);
          deleteBtn.disabled = false;
          deleteBtn.innerHTML = `<i class="fa-solid fa-trash"></i>`;
        }
      });

      const dirBtn = card.querySelector(".mod-manager-dir-btn");
      dirBtn.addEventListener("click", async () => {
        try {
          const modPath = `${FS.modsPath}/${mod.folderName || sanitizePathSegment(mod.name)}`;
          await Neutralino.os.open(modPath);
        } catch (e) {
          console.error("Could not open mod directory", e);
        }
      });

      const visBtn = card.querySelector(".mod-manager-vis-btn");
      visBtn.addEventListener("click", async () => {
        visBtn.disabled = true;
        try {
          const updatedMod = await FS.setModHidden(mod.id, !mod.hidden);
          if (!updatedMod) return;
          mod.hidden = updatedMod.hidden;
          card.classList.toggle("is-hidden", mod.hidden);
          launchBtn.disabled = mod.hidden;
          card.style.opacity = mod.hidden ? "0.5" : "1";
          visBtn.querySelector("i").className = mod.hidden
            ? "fa-solid fa-eye-slash"
            : "fa-solid fa-eye";
          document.dispatchEvent(new CustomEvent("mods-updated"));
        } catch (error) {
          console.error("Could not update mod visibility", error);
        } finally {
          visBtn.disabled = false;
        }
      });

      gridContainer.appendChild(card);
    }

    refreshLaunchButtons();

    if (needsJsonUpdate) {
      const jsonPath = `${FS.dataPath}/installedmods.json`;
      await FS.api.write(jsonPath, JSON.stringify(mods, null, 2));
    }
  },
};
