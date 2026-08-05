import { gameBananaApi } from "../../../backend/providers/gamebanana/gamebanana.provider.js";
import { FS } from "../../../backend/services/filesystem.js";
import { setupModSettingsDropdowns } from "./modSettingsDropdowns.js";
import { escapeHtml } from "./modSettingsTemplates.js";
import { t } from "../i18n/index.js";

const DEFAULT_COVER = "assets/img/placeholder-mini.jpg";

function folderName(path) {
  return (
    String(path || "")
      .split(/[\\/]/)
      .filter(Boolean)
      .pop() || t("import.localMod")
  );
}

function normalizeTags(tags) {
  return [
    ...new Set(
      (Array.isArray(tags) ? tags : [])
        .map((tag) =>
          String(tag || "")
            .trim()
            .replace(/^#+/, "")
            .replace(/\s+/g, " ")
            .toLocaleLowerCase(),
        )
        .filter((tag) => tag && tag.length <= 48),
    ),
  ].slice(0, 20);
}

function getTagSuggestions(mods) {
  return [
    ...new Set(
      (Array.isArray(mods) ? mods : []).flatMap((mod) =>
        Array.isArray(mod.tags) ? mod.tags : [],
      ),
    ),
  ].sort();
}

export const localModImportModal = {
  overlay: null,
  sourcePath: "",
  installedEngines: [],
  tagSuggestions: [],
  pendingCoverDataUrl: null,
  pendingCoverUrl: null,
  dropdowns: null,
  draft: null,
  previousFocus: null,

  async open({ onImported } = {}) {
    this.close({ restoreFocus: false });
    this.sourcePath = "";
    this.pendingCoverDataUrl = null;
    this.pendingCoverUrl = null;
    this.draft = {
      name: t("import.localMod"),
      kind: "mod",
      engineId: "",
      engineVersion: "",
      tags: [],
    };
    this.previousFocus = document.activeElement;
    this.onImported = onImported;
    const [installedEngines, installedMods] = await Promise.all([
      FS.getInstalledEngines(),
      FS.getInstalledMods().catch(() => []),
    ]);
    this.installedEngines = installedEngines;
    this.tagSuggestions = getTagSuggestions(installedMods);
    this.overlay = document.createElement("div");
    this.overlay.className = "mod-settings-overlay local-mod-import-overlay";
    this.overlay.setAttribute("role", "dialog");
    this.overlay.setAttribute("aria-modal", "true");
    this.overlay.setAttribute("aria-labelledby", "local-mod-import-title");
    document.body.appendChild(this.overlay);
    this.renderFolderStep();
    requestAnimationFrame(() => this.overlay?.classList.add("show"));
  },

  close({ restoreFocus = true } = {}) {
    this.dropdowns?.destroy();
    this.dropdowns = null;
    const overlay = this.overlay;
    const focusTarget = this.previousFocus;
    this.overlay = null;
    this.previousFocus = null;
    if (!overlay) return;
    overlay.classList.remove("show");
    setTimeout(() => overlay.remove(), 180);
    if (restoreFocus && focusTarget?.isConnected) focusTarget.focus();
  },

  setStatus(message) {
    const status = this.overlay?.querySelector(".mod-settings-status");
    if (status) status.textContent = message;
  },

  async chooseFolder() {
    try {
      const selectedPath = await Neutralino.os.showFolderDialog(
        t("import.chooseModFolder"),
      );
      if (!selectedPath || !this.overlay) return;
      this.sourcePath = selectedPath;
      const metadata = await FS.inspectLocalMod(selectedPath).catch(() => ({}));
      this.draft = {
        ...this.draft,
        name: metadata.name || folderName(selectedPath),
        kind: metadata.kind || "mod",
        engineId: metadata.engineId || "",
        engineVersion: metadata.engineVersion || "",
      };
      this.pendingCoverDataUrl = metadata.coverDataUrl || null;
      this.pendingCoverUrl = null;
      this.renderFolderStep();
    } catch {
      this.setStatus(t("import.folderPickerFailed"));
    }
  },

  renderFolderStep() {
    if (!this.overlay) return;
    this.dropdowns?.destroy();
    this.dropdowns = null;
    const selectedName = this.sourcePath
      ? folderName(this.sourcePath)
      : t("import.chooseFolder");
    const selectedPath = this.sourcePath
      ? `<small>${escapeHtml(this.sourcePath)}</small>`
      : "";
    this.overlay.innerHTML = `
      <form class="mod-settings-modal local-mod-import-modal local-mod-import-modal--folder">
        <header class="mod-settings-header">
          <div>
            <h2 id="local-mod-import-title">${t("import.title")}</h2>
          </div>
          <button type="button" class="mod-settings-close local-mod-import-close" aria-label="${t("common.close")} ${t("import.title")}"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
        </header>
        <div class="mod-settings-body local-mod-import-body">
          <button class="local-mod-import-folder" type="button">
            <i class="fa-solid fa-folder-open" aria-hidden="true"></i>
            <span>
              <strong>${escapeHtml(selectedName)}</strong>
              ${selectedPath}
            </span>
            <i class="fa-solid fa-chevron-right local-mod-import-folder-chevron" aria-hidden="true"></i>
          </button>
        </div>
        <footer class="mod-settings-footer local-mod-import-footer">
          <span class="mod-settings-status" role="status"></span>
          <button type="button" class="mod-settings-cancel local-mod-import-cancel">${t("common.cancel")}</button>
          <button type="submit" class="mod-settings-save local-mod-import-next" ${this.sourcePath ? "" : "disabled"}>${t("common.next")} <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></button>
        </footer>
      </form>`;
    this.overlay
      .querySelector(".local-mod-import-close")
      .addEventListener("click", () => this.close());
    this.overlay
      .querySelector(".local-mod-import-cancel")
      .addEventListener("click", () => this.close());
    this.overlay
      .querySelector(".local-mod-import-folder")
      .addEventListener("click", () => this.chooseFolder());
    this.overlay
      .querySelector(".local-mod-import-modal")
      .addEventListener("submit", (event) => {
        event.preventDefault();
        this.renderDetailsStep();
      });
    this.overlay.onclick = (event) => {
      if (event.target === this.overlay) this.close();
    };
    requestAnimationFrame(() =>
      this.overlay
        ?.querySelector(
          this.sourcePath
            ? ".local-mod-import-next"
            : ".local-mod-import-folder",
        )
        ?.focus(),
    );
  },

  renderDetailsStep() {
    if (!this.overlay) return;
    this.dropdowns?.destroy();
    this.dropdowns = null;
    const draft = this.draft;
    const coverSrc =
      this.pendingCoverDataUrl || this.pendingCoverUrl || DEFAULT_COVER;
    const tagSuggestions = this.tagSuggestions
      .filter((tag) => !draft.tags.includes(tag))
      .map(
        (tag) =>
          `<button type="button" data-tag="${escapeHtml(tag)}">#${escapeHtml(tag)}</button>`,
      )
      .join("");
    this.overlay.innerHTML = `
      <form class="mod-settings-modal local-mod-import-modal local-mod-import-form">
        <header class="mod-settings-header">
          <div>
            <h2 id="local-mod-import-title">${t("import.title")}</h2>
          </div>
          <button type="button" class="mod-settings-close local-mod-import-close" aria-label="${t("common.close")} ${t("import.title")}"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
        </header>
        <div class="mod-settings-body local-mod-import-body">
          <div class="mod-settings-identity">
            <label class="mod-settings-cover-picker local-mod-import-cover-picker" title="${t("modSettings.changeCoverImage")}">
              <img class="mod-settings-cover local-mod-import-cover" src="${escapeHtml(coverSrc)}" alt="${t("modSettings.currentCover")}">
              <span><i class="fa-solid fa-image" aria-hidden="true"></i> ${t("modSettings.changeImage")}</span>
              <input class="mod-settings-file local-mod-import-cover-file" type="file" accept="image/*">
            </label>
            <label class="local-mod-import-name-field">
              <span>${t("import.modName")}</span>
              <input class="mod-settings-name local-mod-import-name" maxlength="120" required value="${escapeHtml(draft.name)}">
            </label>
          </div>
          <div class="mod-settings-engine ${draft.engineId ? "has-version" : ""}">
            <label class="mod-settings-type-field">${t("modManager.type")}
              <span class="mod-settings-dropdown">
                <button type="button" class="mod-settings-dropdown-trigger mod-settings-type-trigger" aria-haspopup="listbox" aria-expanded="false">
                  <span class="mod-settings-select-icon"><i class="fa-solid fa-layer-group" aria-hidden="true"></i></span>
                  <span class="mod-settings-type-selected"></span><i class="fa-solid fa-chevron-down mod-settings-select-chevron" aria-hidden="true"></i>
                </button>
                <div class="mod-settings-dropdown-menu mod-settings-type-menu" role="listbox" aria-label="${t("modManager.type")}" hidden></div>
                <select class="mod-settings-type" hidden></select>
              </span>
            </label>
            <label class="mod-settings-engine-field">${t("common.engine")}
              <span class="mod-settings-dropdown">
                <button type="button" class="mod-settings-dropdown-trigger mod-settings-engine-trigger" aria-haspopup="listbox" aria-expanded="false">
                  <span class="mod-settings-select-icon mod-settings-engine-icon"><i class="fa-solid fa-question-circle" aria-hidden="true"></i></span>
                  <span class="mod-settings-engine-selected">${t("import.unassigned")}</span><i class="fa-solid fa-chevron-down mod-settings-select-chevron" aria-hidden="true"></i>
                </button>
                <div class="mod-settings-dropdown-menu mod-settings-engine-menu" role="listbox" aria-label="${t("common.engine")}" hidden></div>
                <select class="mod-settings-engine-select" hidden></select>
              </span>
            </label>
            <label class="mod-settings-version-field" ${draft.engineId ? "" : "hidden"}>${t("common.version")}
              <span class="mod-settings-dropdown">
                <button type="button" class="mod-settings-dropdown-trigger mod-settings-version-trigger" aria-haspopup="listbox" aria-expanded="false">
                  <span class="mod-settings-select-icon"><i class="fa-solid fa-code-branch" aria-hidden="true"></i></span>
                  <span class="mod-settings-version-selected"></span><i class="fa-solid fa-chevron-down mod-settings-select-chevron" aria-hidden="true"></i>
                </button>
                <div class="mod-settings-dropdown-menu mod-settings-version-menu" role="listbox" aria-label="${t("common.version")}" hidden></div>
                <select class="mod-settings-version-select" hidden></select>
              </span>
            </label>
            <label class="mod-settings-tags-field">
              <span>${t("modSettings.tags")}</span>
              <div class="mod-settings-tag-editor">
                <span class="mod-settings-tag-pills"></span>
                <input class="mod-settings-tag-input" placeholder="${escapeHtml(t("modSettings.tagPlaceholder"))}">
              </div>
              <div class="mod-settings-tag-suggestions" hidden>${tagSuggestions}</div>
            </label>
          </div>
        </div>
        <footer class="mod-settings-footer local-mod-import-footer">
          <button type="button" class="mod-settings-cancel local-mod-import-back"><i class="fa-solid fa-arrow-left" aria-hidden="true"></i> ${t("common.back")}</button>
          <span class="mod-settings-status" role="status"></span>
          <button type="button" class="mod-settings-reset local-mod-import-gamebanana"><i class="fa-solid fa-cloud-arrow-down" aria-hidden="true"></i> ${t("import.importGameBanana")}</button>
          <button type="submit" class="mod-settings-save local-mod-import-submit"><i class="fa-solid fa-plus" aria-hidden="true"></i> ${t("import.addMod")}</button>
        </footer>
      </form>`;

    const form = this.overlay.querySelector(".local-mod-import-form");
    const nameInput = this.overlay.querySelector(".local-mod-import-name");
    const coverImage = this.overlay.querySelector(".local-mod-import-cover");
    const tagInput = this.overlay.querySelector(".mod-settings-tag-input");
    const tagPills = this.overlay.querySelector(".mod-settings-tag-pills");
    const suggestions = this.overlay.querySelector(
      ".mod-settings-tag-suggestions",
    );
    const renderTags = () => {
      tagPills.replaceChildren(
        ...draft.tags.map((tag) => {
          const pill = document.createElement("button");
          pill.type = "button";
          pill.className = "mod-settings-tag-pill";
          pill.textContent = `#${tag} ×`;
          pill.addEventListener("click", () => {
            draft.tags = draft.tags.filter((item) => item !== tag);
            renderTags();
          });
          return pill;
        }),
      );
    };
    const addTag = () => {
      const tag = String(tagInput.value || "")
        .trim()
        .replace(/^#+/, "")
        .replace(/\s+/g, " ")
        .toLocaleLowerCase();
      if (tag && !draft.tags.includes(tag) && draft.tags.length < 20) {
        draft.tags = normalizeTags([...draft.tags, tag]);
      }
      tagInput.value = "";
      renderTags();
      suggestions.hidden = true;
    };
    renderTags();
    tagInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        addTag();
      }
      if (event.key === "Escape") suggestions.hidden = true;
    });
    tagInput.addEventListener("input", () => {
      const query = tagInput.value.replace(/^#+/, "").toLocaleLowerCase();
      suggestions.querySelectorAll("button[data-tag]").forEach((button) => {
        button.hidden =
          !query ||
          !button.dataset.tag.includes(query) ||
          draft.tags.includes(button.dataset.tag);
      });
      suggestions.hidden =
        !query || !suggestions.querySelector("button[data-tag]:not([hidden])");
    });
    suggestions.addEventListener("mousedown", (event) => {
      const button = event.target.closest("button[data-tag]");
      if (!button) return;
      event.preventDefault();
      if (!draft.tags.includes(button.dataset.tag)) {
        draft.tags = normalizeTags([...draft.tags, button.dataset.tag]);
      }
      tagInput.value = "";
      renderTags();
      suggestions.hidden = true;
    });
    nameInput.addEventListener("input", () => {
      draft.name = nameInput.value;
    });
    coverImage.addEventListener("error", () => {
      if (coverImage.dataset.fallback) return;
      coverImage.dataset.fallback = "true";
      this.pendingCoverDataUrl = null;
      this.pendingCoverUrl = null;
      coverImage.src = DEFAULT_COVER;
    });
    this.overlay
      .querySelector(".local-mod-import-cover-file")
      .addEventListener("change", (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.addEventListener("load", () => {
          this.pendingCoverDataUrl = String(reader.result || "");
          this.pendingCoverUrl = null;
          delete coverImage.dataset.fallback;
          coverImage.src = this.pendingCoverDataUrl;
        });
        reader.readAsDataURL(file);
      });

    this.dropdowns = setupModSettingsDropdowns(
      this.overlay,
      draft,
      this.installedEngines,
    );
    this.overlay
      .querySelector(".local-mod-import-close")
      .addEventListener("click", () => this.close());
    this.overlay
      .querySelector(".local-mod-import-back")
      .addEventListener("click", () => this.renderFolderStep());
    this.overlay
      .querySelector(".local-mod-import-gamebanana")
      .addEventListener("click", () =>
        this.openGameBananaImport({ coverImage, nameInput }),
      );
    form.addEventListener("submit", (event) =>
      this.import(event, { nameInput }),
    );
    this.overlay.onclick = (event) => {
      if (event.target === this.overlay) this.close();
    };
    requestAnimationFrame(() => nameInput.focus());
  },

  openGameBananaImport({ coverImage, nameInput }) {
    const overlay = document.createElement("div");
    overlay.className = "mod-settings-overlay local-mod-gamebanana-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "gamebanana-import-title");
    overlay.innerHTML = `
      <form class="mod-settings-modal local-mod-gamebanana-modal">
        <header class="mod-settings-header">
          <h2 id="gamebanana-import-title">${t("import.gameBananaTitle")}</h2>
          <button type="button" class="mod-settings-close" aria-label="${t("common.close")} ${t("import.gameBananaTitle")}"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
        </header>
        <div class="mod-settings-body local-mod-gamebanana-body">
          <label for="local-gamebanana-id">${t("import.gameBananaIdOrLink")}</label>
          <input id="local-gamebanana-id" required placeholder="${escapeHtml(t("import.gameBananaPlaceholder"))}">
          <p class="mod-settings-status local-mod-gamebanana-status" role="status"></p>
        </div>
        <footer class="mod-settings-footer">
          <span></span>
          <button type="button" class="mod-settings-cancel local-mod-gamebanana-cancel">${t("common.cancel")}</button>
          <button type="submit" class="mod-settings-save"><i class="fa-solid fa-cloud-arrow-down" aria-hidden="true"></i> ${t("import.importDetails")}</button>
        </footer>
      </form>`;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => {
      overlay.classList.add("show");
      overlay.querySelector("input")?.focus();
    });
    const returnFocus = this.overlay?.querySelector(
      ".local-mod-import-gamebanana",
    );
    const close = () => {
      overlay.classList.remove("show");
      setTimeout(() => overlay.remove(), 180);
      if (returnFocus?.isConnected) returnFocus.focus();
    };
    const status = overlay.querySelector(".local-mod-gamebanana-status");
    overlay
      .querySelector(".mod-settings-close")
      .addEventListener("click", close);
    overlay
      .querySelector(".local-mod-gamebanana-cancel")
      .addEventListener("click", close);
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) close();
    });
    overlay.querySelector("form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const submit = event.currentTarget.querySelector('[type="submit"]');
      const value = event.currentTarget.querySelector("input").value.trim();
      const parsed = gameBananaApi.getGameBananaSubmission(value);
      const modId = parsed?.type === "mod" ? parsed.id : Number(value);
      if (!Number.isInteger(modId) || modId <= 0) {
        status.textContent = t("import.invalidGameBananaInput");
        return;
      }
      submit.disabled = true;
      status.textContent = t("import.loadingGameBanana");
      try {
        const details = await gameBananaApi.getModDetails(modId, {
          includeRequirements: false,
        });
        if (!details?.title) throw new Error(t("import.gameBananaNotFound"));
        this.draft.name = details.title;
        this.draft.kind = details.kind || "mod";
        this.draft.engineId =
          details.engineId ||
          gameBananaApi.getEngineIdForCategory(details.categoryId) ||
          "";
        this.draft.engineVersion = "";
        nameInput.value = this.draft.name;
        this.dropdowns?.refresh({
          engineId: this.draft.engineId,
          version: this.draft.engineVersion,
          type: this.draft.kind,
        });
        this.pendingCoverDataUrl = null;
        this.pendingCoverUrl = details.images?.[0] || null;
        delete coverImage.dataset.fallback;
        coverImage.src = this.pendingCoverUrl || DEFAULT_COVER;
        close();
      } catch {
        status.textContent = t("import.gameBananaImportFailed");
        submit.disabled = false;
      }
    });
  },

  async import(event, { nameInput }) {
    event.preventDefault();
    const submit = this.overlay?.querySelector(".local-mod-import-submit");
    if (!submit || !this.dropdowns) return;
    const name = nameInput.value.trim();
    if (!name) {
      nameInput.focus();
      return;
    }
    submit.disabled = true;
    this.setStatus(t("import.copyingFiles"));
    try {
      const engineId = this.dropdowns.engineSelect.value || "";
      await FS.importLocalMod({
        sourcePath: this.sourcePath,
        name,
        kind: this.dropdowns.typeSelect?.value || "mod",
        tags: this.draft.tags,
        engineId,
        engineVersion: engineId
          ? this.dropdowns.versionSelect?.value || ""
          : "",
        coverDataUrl: this.pendingCoverDataUrl,
        coverUrl: /^https?:\/\//i.test(this.pendingCoverUrl || "")
          ? this.pendingCoverUrl
          : null,
      });
      await this.onImported?.();
      this.close();
    } catch {
      this.setStatus(t("import.folderImportFailed"));
      submit.disabled = false;
    }
  },
};
