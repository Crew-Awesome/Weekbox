import { FS } from "../../utils/filesystem.js";
import { sanitizePathSegment } from "../../utils/filesystem/pathUtils.js";
import { gameBananaApi } from "../../api/gamebanana.js";
import {
  ENGINE_DETAILS,
  getEngineLaunchBehavior,
} from "../../config/engines.js";

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
  versionPickerOutsideHandler: null,
  engineFilter: "all",

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

      const engineFilter = document.getElementById("mod-manager-engine-filter");
      const engineFilterTrigger = engineFilter.querySelector(
        ".mod-manager-filter-trigger",
      );
      const engineFilterMenu = engineFilter.querySelector(
        ".mod-manager-filter-menu",
      );
      engineFilterTrigger.addEventListener("click", (event) => {
        event.stopPropagation();
        const isOpen = engineFilterMenu.hidden;
        engineFilterMenu.hidden = !isOpen;
        engineFilterTrigger.setAttribute("aria-expanded", String(isOpen));
        engineFilter.classList.toggle("open", isOpen);
      });
      engineFilterMenu.addEventListener("click", (event) => {
        const option = event.target.closest("button[data-engine-filter]");
        if (!option) return;
        this.engineFilter = option.dataset.engineFilter;
        engineFilterMenu.hidden = true;
        engineFilterTrigger.setAttribute("aria-expanded", "false");
        engineFilter.classList.remove("open");
        this.loadInstalledMods();
      });
      document.addEventListener("click", (event) => {
        if (engineFilter.contains(event.target)) return;
        engineFilterMenu.hidden = true;
        engineFilterTrigger.setAttribute("aria-expanded", "false");
        engineFilter.classList.remove("open");
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
    document.removeEventListener("click", this.versionPickerOutsideHandler);
    this.versionPickerOutsideHandler = null;
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

  syncEngineFilterOptions(mods, standaloneMods) {
    const filter = document.getElementById("mod-manager-engine-filter");
    if (!filter) return;
    const triggerLabel = filter.querySelector(".mod-manager-filter-label");
    const triggerIcon = filter.querySelector(".mod-manager-filter-icon");
    const menu = filter.querySelector(".mod-manager-filter-menu");
    const standaloneIds = new Set(standaloneMods.map((mod) => mod.id));
    const engineIds = [
      ...new Set(
        mods
          .filter((mod) => !standaloneIds.has(mod.id) && mod.engineId)
          .map((mod) => mod.engineId),
      ),
    ];
    const supportedFilters = new Set([
      "all",
      "executable",
      ...engineIds,
    ]);
    if (!supportedFilters.has(this.engineFilter)) this.engineFilter = "all";

    const options = [
      { value: "all", label: "All mods", iconClass: "fa-layer-group" },
      ...(standaloneIds.size
        ? [
            {
              value: "executable",
              label: "Executables",
              iconPath: "assets/icons/exe.png",
            },
          ]
        : []),
      ...engineIds.map((engineId) => ({
        value: engineId,
        label: ENGINE_DETAILS[engineId]?.name || engineId,
        iconPath: ENGINE_DETAILS[engineId]
          ? `assets/icons/${ENGINE_DETAILS[engineId].icon}`
          : null,
        iconClass: "fa-microchip",
      })),
    ];
    const selected = options.find((option) => option.value === this.engineFilter);
    if (triggerLabel) triggerLabel.textContent = selected?.label || "All mods";
    if (triggerIcon) {
      triggerIcon.replaceChildren();
      const icon = selected?.iconPath
        ? Object.assign(document.createElement("img"), {
            src: selected.iconPath,
            alt: "",
          })
        : document.createElement("i");
      if (!selected?.iconPath) {
        icon.className = `fa-solid ${selected?.iconClass || "fa-layer-group"}`;
      }
      triggerIcon.append(icon);
    }
    menu.replaceChildren(
      ...options.map((option) => {
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.engineFilter = option.value;
        button.setAttribute("role", "menuitem");
        button.classList.toggle("selected", option.value === this.engineFilter);
        const icon = option.iconPath
          ? Object.assign(document.createElement("img"), {
              src: option.iconPath,
              alt: "",
            })
          : document.createElement("i");
        if (!option.iconPath) {
          icon.className = `fa-solid ${option.iconClass || "fa-microchip"}`;
          icon.setAttribute("aria-hidden", "true");
        }
        const label = document.createElement("span");
        label.textContent = option.label;
        button.append(icon, label);
        return button;
      }),
    );
  },

  async render(mods, standaloneMods) {
    const container = document.getElementById("mod-manager-modal-body");
    if (!container) return;

    document.removeEventListener("click", this.versionPickerOutsideHandler);
    this.versionPickerOutsideHandler = null;
    this.syncEngineFilterOptions(mods, standaloneMods);
    const standaloneModIds = new Set(standaloneMods.map((m) => m.id));
    const filteredMods = mods.filter((mod) => {
      if (this.engineFilter === "all") return true;
      if (this.engineFilter === "executable")
        return standaloneModIds.has(mod.id);
      return !standaloneModIds.has(mod.id) && mod.engineId === this.engineFilter;
    });

    container.innerHTML = "";
    if (filteredMods.length === 0) {
      const message =
        mods.length === 0
          ? "No mods installed yet."
          : "No mods match this engine filter.";
      container.innerHTML = `<div class="empty-mods-state">${message}</div>`;
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

    const closeCompatibilityPickers = async () => {
      const changes = [];
      gridContainer
        .querySelectorAll(".mod-manager-engine-compatibility-picker")
        .forEach((picker) => {
          picker
            .querySelectorAll(
              ".mod-manager-engine-menu, .mod-manager-version-menu",
            )
            .forEach((menu) => (menu.hidden = true));
          picker
            .querySelectorAll(
              ".mod-manager-engine-pill, .mod-manager-version-pill",
            )
            .forEach((pill) => pill.setAttribute("aria-expanded", "false"));
          picker
            .closest(".mod-manager-card")
            .classList.remove("version-menu-open");
          if (
            picker.dataset.pendingEngineId !== picker.dataset.savedEngineId ||
            picker.dataset.pendingVersion !== picker.dataset.savedVersion
          ) {
            changes.push({
              modId: picker.dataset.modId,
              engineId: picker.dataset.pendingEngineId || null,
              engineVersion: picker.dataset.pendingVersion || null,
            });
          }
        });
      if (!changes.length) return;
      await Promise.all(
        changes.map(({ modId, engineId, engineVersion }) =>
          FS.setModEngineCompatibility(modId, engineId, engineVersion),
        ),
      );
      await this.loadInstalledMods();
    };
    this.versionPickerOutsideHandler = (event) => {
      if (!event.target.closest(".mod-manager-engine-compatibility-picker")) {
        closeCompatibilityPickers().catch((error) =>
          console.error("Could not save mod engine compatibility", error),
        );
      }
    };
    document.addEventListener("click", this.versionPickerOutsideHandler);

    let needsJsonUpdate = false;
    const installedEngines = await FS.getInstalledEngines();

    const refreshLaunchButtons = () => {
      gridContainer
        .querySelectorAll(".mod-manager-launch-btn")
        .forEach((button) => {
          if (button.disabled) return;
          const isStandalone = button.dataset.launchKind === "standalone";
          const engine = isStandalone
            ? null
            : {
                id: button.dataset.engineId,
                version: button.dataset.engineVersion,
              };
          const state = FS.getModLaunchState(
            { id: button.dataset.modId },
            engine,
            isStandalone,
          );
          const isRunning = state === "running";
          const canSwitchMod = state === "switch";
          button.classList.toggle("is-running", isRunning);
          button.classList.toggle("is-switchable", canSwitchMod);
          button.setAttribute(
            "aria-label",
            `${isRunning ? "Close" : canSwitchMod ? "Switch Mod" : button.dataset.launchLabel} ${button.dataset.modName}`,
          );
          button.innerHTML = isRunning
            ? `<i class="fa-solid fa-play mod-manager-running-icon" aria-hidden="true"></i><span class="mod-manager-running-label">Running</span><span class="mod-manager-close-label"><i class="fa-solid fa-xmark" aria-hidden="true"></i><span>Click to Close</span></span>`
            : canSwitchMod
              ? `<i class="fa-solid fa-right-left" aria-hidden="true"></i><span>Switch Mod</span>`
              : `<i class="fa-solid fa-play" aria-hidden="true"></i><span>${button.dataset.launchLabel}</span>`;
        });
    };

    for (const mod of filteredMods) {
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
        : installedEngines.find(
            (item) =>
              item.id === mod.engineId &&
              (!mod.engineVersion || item.version === mod.engineVersion),
          );
      let engineBadgeHtml = `<div class="mod-manager-engine-badge"><i class="fa-solid fa-question-circle"></i><span>Unassigned</span></div>`;

      if (isExecutable) {
        engineBadgeHtml = `
          <div class="mod-manager-engine-badge">
            <img src="assets/icons/exe.png" alt="Executable"/>
            <span>Executable</span>
          </div>`;
      } else {
        const engineOptions = [
          ...new Map(
            installedEngines
              .filter((item) => ENGINE_DETAILS[item.id])
              .map((item) => [item.id, ENGINE_DETAILS[item.id]]),
          ).entries(),
        ].map(([id, info]) => ({ id, ...info }));
        const engineInfo = ENGINE_DETAILS[mod.engineId];
        const versionOptions = [
          "Any version",
          ...installedEngines
            .filter((item) => item.id === mod.engineId)
            .map((item) => item.version),
        ];
        const selectedVersion = mod.engineVersion || "Any version";
        const selectedEngineName = engineInfo?.name || "Unassigned";
        const selectedEngineIcon = engineInfo?.icon;
        engineBadgeHtml = `
          <div class="mod-manager-engine-compatibility-picker" data-mod-id="${mod.id}" data-saved-engine-id="${mod.engineId || ""}" data-pending-engine-id="${mod.engineId || ""}" data-saved-version="${mod.engineVersion || ""}" data-pending-version="${mod.engineVersion || ""}">
            <div class="mod-manager-engine-picker">
              <button class="mod-manager-engine-pill" type="button" aria-expanded="false">
                ${selectedEngineIcon ? `<img src="assets/icons/${selectedEngineIcon}" alt=""/>` : `<i class="fa-solid fa-question-circle" aria-hidden="true"></i>`}
                <span>${selectedEngineName}</span><i class="fa-solid fa-chevron-down" aria-hidden="true"></i>
              </button>
              <div class="mod-manager-engine-menu" hidden>
                <button type="button" data-engine-id="" class="${!mod.engineId ? "selected" : ""}"><i class="fa-solid fa-question-circle" aria-hidden="true"></i>Unassigned</button>
                ${engineOptions
                  .map(
                    (option) =>
                      `<button type="button" data-engine-id="${option.id}" data-engine-name="${option.name}" data-engine-icon="${option.icon}" class="${option.id === mod.engineId ? "selected" : ""}"><img src="assets/icons/${option.icon}" alt=""/>${option.name}</button>`,
                  )
                  .join("")}
              </div>
            </div>
            <div class="mod-manager-version-picker">
              <button class="mod-manager-version-pill" type="button" aria-expanded="false">
                <span>${selectedVersion}</span><i class="fa-solid fa-chevron-down" aria-hidden="true"></i>
              </button>
              <div class="mod-manager-version-menu" hidden>
                ${versionOptions
                  .map(
                    (version) =>
                      `<button type="button" data-version="${version === "Any version" ? "" : version}" class="${version === selectedVersion ? "selected" : ""}">${version}</button>`,
                  )
                  .join("")}
              </div>
            </div>
          </div>`;
      }

      const isHidden = mod.hidden ? "opacity: 0.5;" : "";
      const eyeIcon = mod.hidden ? "fa-eye-slash" : "fa-eye";

      const card = document.createElement("div");
      card.className = "mod-manager-card";
      card.classList.toggle("is-hidden", Boolean(mod.hidden));
      card.style = isHidden;
      const launchLabel =
        isExecutable ||
        getEngineLaunchBehavior(mod.engineId).scope === "exclusive-mod"
          ? "Launch Mod"
          : "Launch Engine";
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
      const versionPill = card.querySelector(".mod-manager-version-pill");
      const versionMenu = card.querySelector(".mod-manager-version-menu");
      const enginePill = card.querySelector(".mod-manager-engine-pill");
      const engineMenu = card.querySelector(".mod-manager-engine-menu");
      const compatibilityPicker = card.querySelector(
        ".mod-manager-engine-compatibility-picker",
      );
      const closeOtherMenu = (menu, pill) => {
        [engineMenu, versionMenu].forEach((otherMenu) => {
          if (otherMenu && otherMenu !== menu) otherMenu.hidden = true;
        });
        [enginePill, versionPill].forEach((otherPill) => {
          if (otherPill && otherPill !== pill)
            otherPill.setAttribute("aria-expanded", "false");
        });
      };
      enginePill?.addEventListener("click", (event) => {
        event.stopPropagation();
        const open = engineMenu.hidden;
        closeOtherMenu(engineMenu, enginePill);
        engineMenu.hidden = !open;
        enginePill.setAttribute("aria-expanded", String(open));
        card.classList.toggle("version-menu-open", open);
      });
      engineMenu?.addEventListener("click", (event) => {
        const option = event.target.closest("button[data-engine-id]");
        if (!option) return;
        event.stopPropagation();
        const engineId = option.dataset.engineId;
        compatibilityPicker.dataset.pendingEngineId = engineId;
        compatibilityPicker.dataset.pendingVersion = "";
        enginePill.querySelector("span").textContent =
          option.dataset.engineName || "Unassigned";
        enginePill.querySelector("img, .fa-question-circle")?.remove();
        enginePill.insertAdjacentHTML(
          "afterbegin",
          engineId
            ? `<img src="assets/icons/${option.dataset.engineIcon}" alt=""/>`
            : `<i class="fa-solid fa-question-circle" aria-hidden="true"></i>`,
        );
        versionPill.querySelector("span").textContent = "Any version";
        versionMenu.innerHTML = [
          `<button type="button" data-version="" class="selected">Any version</button>`,
          ...installedEngines
            .filter((item) => item.id === engineId)
            .map(
              (item) =>
                `<button type="button" data-version="${item.version}">${item.version}</button>`,
            ),
        ].join("");
        engineMenu
          .querySelectorAll("button[data-engine-id]")
          .forEach((button) =>
            button.classList.toggle(
              "selected",
              button.dataset.engineId === engineId,
            ),
          );
      });
      versionPill?.addEventListener("click", (event) => {
        event.stopPropagation();
        const open = versionMenu.hidden;
        if (!open) {
          closeCompatibilityPickers().catch((error) =>
            console.error("Could not save mod engine compatibility", error),
          );
          return;
        }
        closeOtherMenu(versionMenu, versionPill);
        versionMenu.hidden = !open;
        versionPill.setAttribute("aria-expanded", String(open));
        card.classList.toggle("version-menu-open", open);
      });
      versionMenu?.addEventListener("click", (event) => {
        const option = event.target.closest("button[data-version]");
        if (!option) return;
        event.stopPropagation();
        const selectedVersion = option.dataset.version;
        compatibilityPicker.dataset.pendingVersion = selectedVersion;
        versionPill.querySelector("span").textContent =
          selectedVersion || "Any version";
        versionMenu
          .querySelectorAll("button[data-version]")
          .forEach((button) =>
            button.classList.toggle(
              "selected",
              button.dataset.version === selectedVersion,
            ),
          );
      });
      launchBtn.addEventListener("click", async () => {
        launchBtn.disabled = true;
        try {
          await FS.toggleModLaunch(
            mod,
            engine,
            isExecutable,
            refreshLaunchButtons,
          );
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
