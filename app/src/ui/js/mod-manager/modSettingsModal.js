import { gameBananaApi } from "../../../backend/api/gamebanana.js";
import { FS } from "../../../utils/filesystem.js";
import { sanitizePathSegment } from "../../../utils/filesystem/pathUtils.js";
import { setupModSettingsDropdowns } from "./modSettingsDropdowns.js";
import {
  getGameBananaSource,
  loadingContent,
  settingsContent,
} from "./modSettingsTemplates.js";
import { networkStatus } from "../../../backend/core/networkStatus.js";

export const modSettingsModal = {
  isOpening: false,
  openRequestId: 0,
  dropdowns: null,

  async open({
    mod,
    isExecutable,
    installedEngines,
    onSaved,
    readOnly = false,
  }) {
    if (this.isOpening) return false;
    this.close();
    this.isOpening = true;
    const requestId = ++this.openRequestId;
    const overlay = document.createElement("div");
    overlay.className = "mod-settings-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "mod-settings-title");
    overlay.innerHTML = loadingContent();
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("show"));

    let localCover;
    try {
      localCover = await FS.getModCover(mod.id);
    } finally {
      this.isOpening = false;
    }
    if (requestId !== this.openRequestId) return false;

    const controlsDisabled =
      readOnly || isExecutable || mod.engineLocked ? "disabled" : "";
    const isDependency = mod.kind === "dependency";
    overlay.innerHTML = settingsContent({
      mod,
      localCover,
      controlsDisabled,
      canReset: Boolean(getGameBananaSource(mod)) && networkStatus.online,
      resetTitle: networkStatus.online
        ? "Defaults are only available for GameBanana mods"
        : "Connect to the internet to reset GameBanana mod information",
      canMoveToDependencies: !isExecutable && mod.kind !== "dependency",
      isDependency,
      isExecutable,
      readOnly,
    });

    const form = overlay.querySelector("form");
    const nameInput = overlay.querySelector(".mod-settings-name");
    const cover = overlay.querySelector(".mod-settings-cover");
    const fileInput = overlay.querySelector(".mod-settings-file");
    const status = overlay.querySelector(".mod-settings-status");
    const dropdowns = isExecutable
      ? null
      : setupModSettingsDropdowns(overlay, mod, installedEngines);
    this.dropdowns = dropdowns;
    let pendingCoverDataUrl = null;
    let pendingCoverUrl = null;

    fileInput.addEventListener("change", () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        pendingCoverDataUrl = String(reader.result || "");
        pendingCoverUrl = null;
        cover.src = pendingCoverDataUrl;
      });
      reader.readAsDataURL(file);
    });

    const close = () => this.close();
    overlay
      .querySelector(".mod-settings-close")
      .addEventListener("click", close);
    overlay
      .querySelector(".mod-settings-cancel")
      .addEventListener("click", close);
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) close();
    });
    overlay
      .querySelector(".mod-settings-open-folder")
      .addEventListener("click", async () => {
        const modPath = `${FS.modsPath}/${mod.folderName || sanitizePathSegment(mod.name)}`;
        try {
          await Neutralino.os.open(modPath);
        } catch {
          status.textContent = "Could not open the mod folder.";
        }
      });
    overlay
      .querySelector(".mod-settings-reset")
      .addEventListener("click", async () => {
        const source = getGameBananaSource(mod);
        if (!source) return;
        status.textContent = "Loading defaults…";
        try {
          const details =
            source.type === "tool"
              ? await gameBananaApi.getToolDetails(source.id)
              : await gameBananaApi.getModDetails(source.id, {
                  includeRequirements: false,
                });
          if (!details?.title)
            throw new Error("GameBanana defaults are unavailable");
          nameInput.value = details.title;
          pendingCoverUrl =
            source.type === "tool"
              ? details?.thumbnail || null
              : details.images?.[0] || null;
          pendingCoverDataUrl = null;
          cover.src = pendingCoverUrl || "assets/icons/launcher-icon.png";
          status.textContent = "Defaults loaded. Save to apply them.";
        } catch (error) {
          status.textContent = error.message || "Could not load defaults.";
        }
      });
    overlay
      .querySelector(".mod-settings-move-to-mods")
      ?.addEventListener("click", async (event) => {
        const moveButton = event.currentTarget;
        moveButton.disabled = true;
        status.textContent = "Moving to mods…";
        try {
          await FS.assertModChangeAllowed(mod.id);
          const movedMod = await FS.moveDependencyToMods(mod.id);
          if (!movedMod) throw new Error("Dependency could not be moved");
          await onSaved?.();
          close();
        } catch (error) {
          status.textContent = error.message || "Could not move dependency.";
          moveButton.disabled = false;
        }
      });
    overlay
      .querySelector(".mod-settings-move-to-dependencies")
      ?.addEventListener("click", async (event) => {
        const moveButton = event.currentTarget;
        moveButton.disabled = true;
        status.textContent = "Moving to dependencies…";
        try {
          await FS.assertModChangeAllowed(mod.id);
          if (!mod.engineLocked) {
            await FS.setModEngineCompatibility(
              mod.id,
              dropdowns.engineSelect.value || null,
              dropdowns.versionSelect.value || null,
            );
          }
          const movedMod = await FS.moveModToDependencies(mod.id);
          if (!movedMod) throw new Error("Mod could not be moved");
          await onSaved?.();
          close();
        } catch (error) {
          status.textContent = error.message || "Could not move mod.";
          moveButton.disabled = false;
        }
      });
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const name = nameInput.value.trim();
      if (!name) return;
      const saveButton = overlay.querySelector(".mod-settings-save");
      saveButton.disabled = true;
      status.textContent = "Saving…";
      try {
        await FS.assertModChangeAllowed(mod.id);
        if (!isExecutable && !mod.engineLocked) {
          await FS.setModEngineCompatibility(
            mod.id,
            dropdowns.engineSelect.value || null,
            dropdowns.versionSelect.value || null,
          );
        }
        const appearance = { name };
        if (pendingCoverDataUrl) appearance.coverDataUrl = pendingCoverDataUrl;
        else if (pendingCoverUrl) appearance.coverUrl = pendingCoverUrl;
        if (!(await FS.updateModAppearance(mod.id, appearance))) {
          throw new Error("Mod settings could not be saved");
        }
        await onSaved?.();
        close();
      } catch (error) {
        status.textContent = error.message || "Could not save mod settings.";
        saveButton.disabled = false;
      }
    });
    return true;
  },

  close() {
    this.openRequestId += 1;
    this.dropdowns?.destroy();
    this.dropdowns = null;
    document.querySelector(".mod-settings-overlay")?.remove();
  },
};
