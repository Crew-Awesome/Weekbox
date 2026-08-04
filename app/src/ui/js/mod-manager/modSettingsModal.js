import { gameBananaApi } from "../../../backend/providers/gamebanana/gamebanana.provider.js";
import { FS } from "../../../backend/services/filesystem.js";
import { sanitizePathSegment } from "../../../backend/services/filesystem/path.util.js";
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
    fileLocked = false,
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
      readOnly || fileLocked || mod.engineLocked ? "disabled" : "";
    const isDependency = mod.kind === "dependency";
    let tagSuggestions = [];
    try {
      const installedMods = await FS.getInstalledMods();
      const currentTags = Array.isArray(mod.tags) ? mod.tags : [];
      tagSuggestions = [
        ...new Set(
          (Array.isArray(installedMods) ? installedMods : []).flatMap((item) =>
            Array.isArray(item.tags) ? item.tags : [],
          ),
        ),
      ]
        .filter((tag) => !currentTags.includes(tag))
        .sort();
    } catch {
      tagSuggestions = [];
    }
    overlay.innerHTML = settingsContent({
      mod,
      localCover,
      controlsDisabled,
      canReset: Boolean(getGameBananaSource(mod)) && networkStatus.online,
      resetTitle: networkStatus.online
        ? t("modSettings.defaultsOnlyGameBanana")
        : t("modSettings.connectToReset"),
      isDependency,
      isExecutable,
      readOnly,
      fileLocked,
      tagSuggestions,
    });

    const form = overlay.querySelector("form");
    const nameInput = overlay.querySelector(".mod-settings-name");
    const cover = overlay.querySelector(".mod-settings-cover");
    const fileInput = overlay.querySelector(".mod-settings-file");
    const status = overlay.querySelector(".mod-settings-status");
    const typeSelect = overlay.querySelector(".mod-settings-type");
    const tagInput = overlay.querySelector(".mod-settings-tag-input");
    const tagPills = overlay.querySelector(".mod-settings-tag-pills");
    const tagSuggestionsMenu = overlay.querySelector(
      ".mod-settings-tag-suggestions",
    );
    let tags = [
      ...new Set(
        (mod.tags || [])
          .map((tag) =>
            String(tag).trim().replace(/^#+/, "").toLocaleLowerCase(),
          )
          .filter(Boolean),
      ),
    ];
    const renderTags = () => {
      if (!tagPills) return;
      tagPills.replaceChildren(
        ...tags.map((tag) => {
          const pill = document.createElement("button");
          pill.type = "button";
          pill.className = "mod-settings-tag-pill";
          pill.textContent = `#${tag} ×`;
          pill.disabled = readOnly;
          pill.addEventListener("click", () => {
            tags = tags.filter((item) => item !== tag);
            renderTags();
          });
          return pill;
        }),
      );
    };
    const addTag = () => {
      const tag = String(tagInput?.value || "")
        .trim()
        .replace(/^#+/, "")
        .replace(/\s+/g, " ")
        .toLocaleLowerCase();
      if (tag && tag.length <= 48 && !tags.includes(tag) && tags.length < 20)
        tags.push(tag);
      if (tagInput) tagInput.value = "";
      renderTags();
    };
    tagInput?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        addTag();
      }
      if (event.key === "Escape" && tagSuggestionsMenu)
        tagSuggestionsMenu.hidden = true;
    });
    tagInput?.addEventListener("blur", () =>
      setTimeout(() => {
        if (tagSuggestionsMenu) tagSuggestionsMenu.hidden = true;
      }, 120),
    );
    tagInput?.addEventListener("focus", () => {
      if (tagSuggestionsMenu?.children.length && tagInput.value.trim())
        tagSuggestionsMenu.hidden = false;
    });
    tagInput?.addEventListener("input", () => {
      const query = String(tagInput.value || "")
        .replace(/^#+/, "")
        .toLocaleLowerCase();
      tagSuggestionsMenu
        ?.querySelectorAll("button[data-tag]")
        .forEach((button) => {
          button.hidden =
            !query ||
            !button.dataset.tag.includes(query) ||
            tags.includes(button.dataset.tag);
        });
      if (tagSuggestionsMenu)
        tagSuggestionsMenu.hidden =
          !query ||
          !tagSuggestionsMenu.querySelector("button[data-tag]:not([hidden])");
    });
    tagSuggestionsMenu?.addEventListener("mousedown", (event) => {
      const button = event.target.closest("button[data-tag]");
      if (!button) return;
      event.preventDefault();
      if (!tags.includes(button.dataset.tag)) tags.push(button.dataset.tag);
      if (tagInput) tagInput.value = "";
      renderTags();
      tagSuggestionsMenu.hidden = true;
    });
    renderTags();
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
          if (!fileLocked) await FS.assertModChangeAllowed(mod.id);
          const movedMod = await FS.moveDependencyToMods(mod.id);
          if (!movedMod) throw new Error(t("modSettings.dependencyMoveFailed"));
          await onSaved?.();
          close();
        } catch (error) {
          status.textContent = t("modSettings.couldNotMoveDependency");
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
        if (!fileLocked) await FS.assertModChangeAllowed(mod.id);
        if (!fileLocked && !isExecutable && !mod.engineLocked && dropdowns) {
          const engineId = dropdowns.engineSelect.value || null;
          const version =
            engineId && dropdowns.versionSelect
              ? dropdowns.versionSelect.value || null
              : null;
          await FS.setModEngineCompatibility(mod.id, engineId, version);
        }
        if (
          !fileLocked &&
          !isExecutable &&
          typeSelect &&
          typeSelect.value !== (mod.kind || "mod")
        ) {
          await FS.setModType(mod.id, typeSelect.value);
        }
        if (!(await FS.setModTags(mod.id, tags))) {
          throw new Error(t("modSettings.saveFailed"));
        }
        const appearance = { name };
        if (fileLocked && !mod.folderName) {
          appearance.folderName = mod.name
            ? sanitizePathSegment(mod.name)
            : null;
        }
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
