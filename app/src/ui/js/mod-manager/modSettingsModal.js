import { gameBananaApi } from "../../../backend/providers/gamebanana/gamebanana.provider.js";
import { FS } from "../../utils/index-utils.js";
import { sanitizePathSegment } from "../../utils/index-utils.js";
import { setupModSettingsDropdowns } from "./modSettingsDropdowns.js";
import {
  getGameBananaSource,
  loadingContent,
  settingsContent,
} from "./modSettingsTemplates.js";
import { networkStatus } from "../../../backend/core/system/network-status.service.js";
import { t } from "../i18n/index.js";

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

    const controlsDisabled = readOnly || mod.engineLocked ? "disabled" : "";
    const isDependency = mod.kind === "dependency";
    overlay.innerHTML = settingsContent({
      mod,
      localCover,
      controlsDisabled,
      canReset: Boolean(getGameBananaSource(mod)) && networkStatus.online,
      resetTitle: networkStatus.online
        ? t("modSettings.defaultsOnlyGameBanana")
        : t("modSettings.connectToReset"),
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
    const dropdowns = setupModSettingsDropdowns(
      overlay,
      mod,
      installedEngines,
      isExecutable,
    );
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
          status.textContent = t("modSettings.openFolderFailed");
        }
      });
    overlay
      .querySelector(".mod-settings-reset")
      .addEventListener("click", async () => {
        const source = getGameBananaSource(mod);
        if (!source) return;
        status.textContent = t("modSettings.loadingDefaults");
        try {
          const details =
            source.type === "tool"
              ? await gameBananaApi.getToolDetails(source.id)
              : await gameBananaApi.getModDetails(source.id, {
                  includeRequirements: false,
                });
          if (!details?.title)
            throw new Error(t("modSettings.defaultsUnavailable"));
          nameInput.value = details.title;
          pendingCoverUrl =
            source.type === "tool"
              ? details?.thumbnail || null
              : details.images?.[0] || null;
          pendingCoverDataUrl = null;
          cover.src = pendingCoverUrl || "assets/icons/launcher-icon.png";
          status.textContent = t("modSettings.defaultsLoaded");
        } catch (error) {
          status.textContent = t("modSettings.defaultsFailed");
        }
      });
    overlay
      .querySelector(".mod-settings-move-to-mods")
      ?.addEventListener("click", async (event) => {
        const moveButton = event.currentTarget;
        moveButton.disabled = true;
        status.textContent = t("modSettings.movingToMods");
        try {
          await FS.assertModChangeAllowed(mod.id);
          const movedMod = await FS.moveDependencyToMods(mod.id);
          if (!movedMod) throw new Error(t("modSettings.dependencyMoveFailed"));
          await onSaved?.();
          close();
        } catch (error) {
          status.textContent = t("modSettings.couldNotMoveDependency");
          moveButton.disabled = false;
        }
      });
    overlay
      .querySelector(".mod-settings-move-to-dependencies")
      ?.addEventListener("click", async (event) => {
        const moveButton = event.currentTarget;
        moveButton.disabled = true;
        status.textContent = t("modSettings.movingToDependencies");
        try {
          await FS.assertModChangeAllowed(mod.id);
          if (!mod.engineLocked) {
            const engineId = dropdowns.engineSelect.value || null;
            const version =
              engineId && dropdowns.versionSelect
                ? dropdowns.versionSelect.value || null
                : null;
            await FS.setModEngineCompatibility(mod.id, engineId, version);
          }
          const movedMod = await FS.moveModToDependencies(mod.id);
          if (!movedMod) throw new Error(t("modSettings.modMoveFailed"));
          await onSaved?.();
          close();
        } catch (error) {
          status.textContent = t("modSettings.couldNotMoveMod");
          moveButton.disabled = false;
        }
      });
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const name = nameInput.value.trim();
      if (!name) return;
      const saveButton = overlay.querySelector(".mod-settings-save");
      saveButton.disabled = true;
      status.textContent = t("modSettings.saving");
      try {
        await FS.assertModChangeAllowed(mod.id);
        if (!mod.engineLocked) {
          const engineId = dropdowns.engineSelect.value || null;
          const version =
            engineId && dropdowns.versionSelect
              ? dropdowns.versionSelect.value || null
              : null;
          await FS.setModEngineCompatibility(mod.id, engineId, version);
        }
        const appearance = { name };
        if (pendingCoverDataUrl) appearance.coverDataUrl = pendingCoverDataUrl;
        else if (pendingCoverUrl) appearance.coverUrl = pendingCoverUrl;
        if (!(await FS.updateModAppearance(mod.id, appearance))) {
          throw new Error(t("modSettings.saveFailed"));
        }
        await onSaved?.();
        close();
      } catch (error) {
        status.textContent = t("modSettings.couldNotSave");
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
