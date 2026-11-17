import { gameBananaApi } from "../../../backend/providers/gamebanana/gamebanana.provider.js";
import { backstageApi } from "../../../backend/providers/backstage/backstage.provider.js";
import { gameJoltApi } from "../../../backend/providers/gamejolt/gamejolt.provider.js";
import { FS } from "../../../backend/services/filesystem.js";
import { setupModSettingsDropdowns } from "./modSettingsDropdowns.js";
import {
  getGameBananaSource,
  loadingContent,
  settingsContent,
} from "./modSettingsTemplates.js";
import { networkStatus } from "../../../backend/core/system/network-status.service.js";
import { t } from "../i18n/index.js";
import {
  activateCheckoutDialog,
  deactivateCheckoutDialog,
} from "../home/modal/dialogFocus.js";
import { customEngineModal } from "../engine-manager/customEngineModal.js";
import { openProviderImport } from "./providerImportModal.js";

function setupTagEditor({ overlay, mod, readOnly }) {
  const tagInput = overlay.querySelector(".mod-settings-tag-input");
  const tagPills = overlay.querySelector(".mod-settings-tag-pills");
  const tagSuggestionsMenu = overlay.querySelector(
    ".mod-settings-tag-suggestions",
  );
  let tags = [
    ...new Set(
      (mod.tags || [])
        .map((tag) => String(tag).trim().replace(/^#+/, "").toLocaleLowerCase())
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
  return { getTags: () => tags };
}

async function saveModSettings({
  modal,
  mod,
  name,
  fileLocked,
  isExecutable,
  dropdowns,
  typeSelect,
  tags,
  pendingCoverDataUrl,
  pendingCoverUrl,
  pendingIconUrl,
  providerSource,
  onSaved,
}) {
  if (!fileLocked) await FS.assertModChangeAllowed(mod.id);
  await saveModEngineSettings({ mod, fileLocked, isExecutable, dropdowns });
  await saveModType({ mod, fileLocked, isExecutable, typeSelect });
  if (!(await FS.setModTags(mod.id, tags))) {
    throw new Error(t("modSettings.saveFailed"));
  }
  await saveModAppearance({
    mod,
    name,
    fileLocked,
    pendingCoverDataUrl,
    pendingCoverUrl,
    pendingIconUrl,
    providerSource,
  });
  await onSaved?.();
  document.dispatchEvent(
    new CustomEvent("recently-played-mods-updated", {
      detail: { refreshStandalone: true },
    }),
  );
  modal.close();
}

async function saveModEngineSettings({
  mod,
  fileLocked,
  isExecutable,
  dropdowns,
}) {
  if (!fileLocked && !isExecutable && !mod.engineLocked && dropdowns) {
    const engineId = dropdowns.engineSelect.value || null;
    const version =
      engineId && dropdowns.versionSelect
        ? dropdowns.versionSelect.value || null
        : null;
    if (
      engineId !== (mod.engineId || null) ||
      version !== (mod.engineVersion || null)
    ) {
      await FS.setModEngineCompatibility(mod.id, engineId, version);
    }
  }
}

async function saveModType({ mod, fileLocked, isExecutable, typeSelect }) {
  if (
    !fileLocked &&
    !isExecutable &&
    typeSelect &&
    typeSelect.value !== (mod.kind || "mod")
  ) {
    await FS.setModType(mod.id, typeSelect.value);
  }
}

async function saveModAppearance({
  mod,
  name,
  fileLocked,
  pendingCoverDataUrl,
  pendingCoverUrl,
  pendingIconUrl,
  providerSource,
}) {
  const appearance = { name };
  if (providerSource) {
    appearance.providerSource = providerSource.provider;
    appearance.providerId = providerSource.id;
    appearance.providerType = providerSource.type || null;
    appearance.providerUrl = providerSource.url;
    appearance.sourceUrl = providerSource.url;
    appearance.author = providerSource.author || null;
    appearance.gameBananaId = providerSource.provider === "gamebanana" ? providerSource.id : null;
    appearance.gameBananaType = providerSource.provider === "gamebanana" ? providerSource.type : null;
  }
  if (fileLocked && !mod.folderName) {
    appearance.folderName = mod.name ? sanitizePathSegment(mod.name) : null;
  }
  if (pendingCoverDataUrl) appearance.coverDataUrl = pendingCoverDataUrl;
  else if (pendingCoverUrl) appearance.coverUrl = pendingCoverUrl;
  if (pendingIconUrl) appearance.iconUrl = pendingIconUrl;
  if (!(await FS.updateModAppearance(mod.id, appearance))) {
    throw new Error(t("modSettings.saveFailed"));
  }
}

function getProviderArtwork(details, provider) {
  const galleryImage = details.images?.find(
    (image) => image && !image.includes("placeholder-mini"),
  );
  if (provider === "backstage") {
    return details.image || details.thumbnail || galleryImage || null;
  }
  if (provider === "gamejolt") {
    return details.image || details.thumbnail || galleryImage || null;
  }
  return galleryImage || details.thumbnail || null;
}

function getProviderSource(mod) {
  if (mod.providerSource && mod.providerId) {
    return { provider: mod.providerSource, id: String(mod.providerId), type: mod.providerType || "mod", url: mod.providerUrl || mod.sourceUrl || "" };
  }
  const gameBananaSource = getGameBananaSource(mod);
  return gameBananaSource ? { ...gameBananaSource, provider: "gamebanana", url: mod.sourceUrl || "" } : null;
}

function getImportedEngineId(details, provider) {
  if (details.engineId) return details.engineId;
  return provider === "gamebanana" ? gameBananaApi.getEngineIdForCategory(details.categoryId) || "" : "";
}

function setupProviderImportButton({
  overlay,
  nameInput,
  cover,
  dropdowns,
  status,
  setSource,
  setCoverDataUrl,
  setCoverUrl,
  setIconUrl,
  canReplaceCover,
  canSetProviderIcon,
}) {
  overlay
    .querySelector(".mod-settings-import-provider")
    ?.addEventListener("click", () => {
      openProviderImport({
        onImported: ({ details, source }) => {
          const artwork = getProviderArtwork(details, source.provider);
          const engineId = getImportedEngineId(details, source.provider);
          setSource({ ...source, author: details.author || "" });
          nameInput.value = details.title;
          dropdowns?.refresh({ engineId, version: "", type: details.kind || "mod" });
          if (canReplaceCover() && artwork) {
            setCoverDataUrl(null);
            setCoverUrl(artwork);
            cover.src = artwork;
          }
          if (canSetProviderIcon()) {
            setIconUrl(source.provider === "backstage" ? details.icon || null : null);
          }
          status.textContent = t("modSettings.defaultsLoaded");
        },
      });
    });
}

export const modSettingsModal = {
  isOpening: false,
  openRequestId: 0,
  dropdowns: null,
  activeModId: null,
  savingModId: null,

  async open({
    mod,
    isExecutable,
    installedEngines,
    onSaved,
    readOnly = false,
    fileLocked = false,
  }) {
    if (
      this.isOpening ||
      this.savingModId !== null ||
      this.activeModId === mod.id
    )
      return false;
    this.close();
    this.activeModId = mod.id;
    this.isOpening = true;
    const requestId = ++this.openRequestId;
    const overlay = document.createElement("div");
    overlay.className = "mod-settings-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "mod-settings-title");
    overlay.innerHTML = loadingContent();
    document.body.appendChild(overlay);
    activateCheckoutDialog(overlay, overlay, null, () => this.close());
    requestAnimationFrame(() => overlay.classList.add("show"));

    let localCover;
    let localIcon;
    try {
      [localCover, localIcon] = await Promise.all([
        FS.getModCover(mod.id),
        FS.getModIcon(mod.id),
      ]);
    } finally {
      this.isOpening = false;
    }
    if (requestId !== this.openRequestId) return false;

    const linkedProvider = getProviderSource(mod);
    let providerCoverFallback = mod.image || null;
    let providerIconFallback = mod.providerIconUrl || null;
    if (
      ["backstage", "gamejolt"].includes(linkedProvider?.provider) &&
      (!localCover || (linkedProvider.provider === "backstage" && !localIcon))
    ) {
      const details = await (linkedProvider.provider === "backstage"
        ? backstageApi.getModDetails(linkedProvider.id)
        : gameJoltApi.getGameDetails(linkedProvider.id))
        .catch(() => null);
      providerCoverFallback ||= details?.image || details?.thumbnail || details?.images?.[0] || null;
      providerIconFallback ||= details?.icon || null;
      if (!localCover) {
        const coverUrl = providerCoverFallback;
        if (coverUrl) {
          localCover = await FS.ensureModCover(mod.id, async () => coverUrl)
            .catch(() => null);
        }
      }
      if (!localIcon && details?.icon) {
        localIcon = await FS.cacheModIcon(mod.id, details.icon).catch(() => null);
        if (localIcon) {
          document.dispatchEvent(
            new CustomEvent("recently-played-mods-updated", {
              detail: { refreshStandalone: true },
            }),
          );
        }
      }
    }
    // Provider URLs are display fallbacks when local caching is blocked by
    // cross-origin policy. Saved user artwork remains the first choice.
    localCover ||= providerCoverFallback;
    localIcon ||= providerIconFallback;

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
    const tagEditor = setupTagEditor({ overlay, mod, readOnly });
    const dropdowns = isExecutable
      ? null
      : setupModSettingsDropdowns(overlay, mod, installedEngines);
    this.dropdowns = dropdowns;
    let pendingCoverDataUrl = null;
    let pendingCoverUrl = null;
    let pendingIconUrl = null;
    let providerSource = getProviderSource(mod);

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
    setupProviderImportButton({
      overlay,
      nameInput,
      cover,
      dropdowns,
      status,
      setSource: (value) => (providerSource = value),
      setCoverDataUrl: (value) => (pendingCoverDataUrl = value),
      setCoverUrl: (value) => (pendingCoverUrl = value),
      setIconUrl: (value) => (pendingIconUrl = value),
      canReplaceCover: () => !mod.coverPath && !pendingCoverDataUrl,
      canSetProviderIcon: () => !localIcon,
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
          cover.src = pendingCoverUrl || "assets/img/placeholder-mini.jpg";
          providerSource = { ...source, provider: "gamebanana", url: details.gameBananaUrl || "" };
          status.textContent = t("modSettings.defaultsLoaded");
        } catch {
          status.textContent = t("modSettings.defaultsFailed");
        }
      });
    overlay
      .querySelector(".mod-settings-convert-engine")
      ?.addEventListener("click", () => {
        const folderName = mod.folderName || sanitizePathSegment(mod.name);
        if (!folderName) return;
        void customEngineModal.open({
          sourcePath: `${FS.modsPath}/${folderName}`,
          allowLibrarySource: true,
          onImported: () => onSaved?.(),
        });
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
        } catch {
          status.textContent = t("modSettings.couldNotMoveDependency");
          moveButton.disabled = false;
        }
      });
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const name = nameInput.value.trim();
      if (!name) return;
      if (this.savingModId !== null) return;
      this.savingModId = mod.id;
      const saveButton = overlay.querySelector(".mod-settings-save");
      saveButton.disabled = true;
      status.textContent = t("modSettings.saving");
      try {
        await saveModSettings({
          modal: this,
          mod,
          name,
          fileLocked,
          isExecutable,
          dropdowns,
          typeSelect,
          tags: tagEditor.getTags(),
          pendingCoverDataUrl,
          pendingCoverUrl,
          pendingIconUrl,
          providerSource,
          onSaved,
        });
      } catch (error) {
        console.error("Could not save mod settings", {
          modId: mod.id,
          error,
        });
        status.textContent = t("modSettings.couldNotSave");
        saveButton.disabled = false;
      } finally {
        if (this.savingModId === mod.id) this.savingModId = null;
      }
    });
    activateCheckoutDialog(overlay, overlay, nameInput, () => this.close());
    return true;
  },

  close() {
    this.openRequestId += 1;
    this.activeModId = null;
    this.dropdowns?.destroy();
    this.dropdowns = null;
    const overlay = document.querySelector(".mod-settings-overlay");
    if (!overlay) return;
    deactivateCheckoutDialog(overlay);
    overlay.classList.remove("show");
    setTimeout(() => overlay.remove(), 260);
  },
};
