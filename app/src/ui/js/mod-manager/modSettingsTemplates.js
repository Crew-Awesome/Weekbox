import { ENGINE_DETAILS } from "../../../backend/config/engines.config.js";
import { t } from "../i18n/index.js";

export function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function getGameBananaId(mod) {
  return getGameBananaSource(mod)?.id || null;
}

export function getGameBananaSource(mod) {
  const match = String(mod?.id || "").match(/^(?:(mod|tool):)?(\d+)$/);
  if (!match) return null;
  return { type: match[1] || "mod", id: match[2] };
}

export function loadingContent() {
  return `
    <div class="mod-settings-modal mod-settings-loading" role="status">
      <i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i>
      <span>${t("modSettings.loading")}</span>
    </div>`;
}

export function settingsContent({
  mod,
  localCover,
  controlsDisabled,
  canReset,
  resetTitle,
  canMoveToDependencies,
  isDependency,
  isExecutable,
  readOnly,
  fileLocked = false,
  tagSuggestions = [],
}) {
  const hasEngine = Boolean(
    mod.engineId &&
      mod.engineId !== "executable" &&
      ENGINE_DETAILS[mod.engineId],
  );

  const tagsField = `
          <label class="mod-settings-tags-field">
            <span>Tags</span>
            <div class="mod-settings-tag-editor">
              <span class="mod-settings-tag-pills"></span>
              <input class="mod-settings-tag-input" placeholder="Type a tag and press Enter" ${readOnly ? "disabled" : ""}>
            </div>
            <div class="mod-settings-tag-suggestions" hidden>
              ${tagSuggestions.map((tag) => `<button type="button" data-tag="${escapeHtml(tag)}">#${escapeHtml(tag)}</button>`).join("")}
            </div>
          </label>`;
  return `
    <form class="mod-settings-modal">
      <header class="mod-settings-header">
        <h2 id="mod-settings-title">${isDependency ? t("modSettings.dependencySettings") : t("modSettings.settings")}</h2>
        <div class="mod-settings-header-actions">
          <button type="button" class="mod-settings-open-folder" title="${isDependency ? t("modSettings.openDependencyFolder") : t("modSettings.openModFolder")}" aria-label="${isDependency ? t("modSettings.openDependencyFolder") : t("modSettings.openModFolder")}"><i class="fa-solid fa-folder-open"></i></button>
          <button type="button" class="mod-settings-close" aria-label="${t("common.close")} ${isDependency ? t("modSettings.dependencySettings") : t("modSettings.settings")}"><i class="fa-solid fa-xmark"></i></button>
        </div>
      </header>
      <div class="mod-settings-body">
        <div class="mod-settings-identity">
          <label class="mod-settings-cover-picker" title="${readOnly ? t("modSettings.changesUnavailable") : t("modSettings.changeCoverImage")}">
            <img class="mod-settings-cover" src="${escapeHtml(localCover || "assets/icons/launcher-icon.png")}" alt="${t("modSettings.currentCover")}">
            <span><i class="fa-solid fa-image" aria-hidden="true"></i> ${t("modSettings.changeImage")}</span>
            <input class="mod-settings-file" type="file" accept="image/*" ${readOnly ? "disabled" : ""}>
          </label>
          <input class="mod-settings-name" aria-label="${t("import.modName")}" value="${escapeHtml(mod.name)}" maxlength="120" required ${readOnly ? "disabled" : ""}>
        </div>
        ${
          isExecutable
            ? `
          <div class="mod-settings-engine mod-settings-executable-type">
            <div>
              <span>${t("modManager.type")}</span>
              <div class="mod-settings-executable-value"><img src="assets/icons/exe.png" alt=""><span>${t("home.executables")}</span></div>
            </div>
            ${tagsField}
          </div>`
            : `<div class="mod-settings-engine ${hasEngine ? "has-version" : ""}" ${controlsDisabled ? 'aria-disabled="true"' : ""}>
          <label class="mod-settings-type-field">${t("modManager.type")}
            <span class="mod-settings-dropdown">
              <button type="button" class="mod-settings-dropdown-trigger mod-settings-type-trigger" aria-haspopup="listbox" aria-expanded="false" ${controlsDisabled}>
                <span class="mod-settings-select-icon"><i class="fa-solid fa-layer-group" aria-hidden="true"></i></span>
                <span class="mod-settings-type-selected"></span><i class="fa-solid fa-chevron-down mod-settings-select-chevron" aria-hidden="true"></i>
              </button>
              <div class="mod-settings-dropdown-menu mod-settings-type-menu" role="listbox" aria-label="${t("modManager.type")}" hidden></div>
              <select class="mod-settings-type" hidden></select>
            </span>
          </label>
          <label class="mod-settings-engine-field">${t("common.engine")}
            <span class="mod-settings-dropdown">
              <button type="button" class="mod-settings-dropdown-trigger mod-settings-engine-trigger" aria-haspopup="listbox" aria-expanded="false" ${controlsDisabled}>
                <span class="mod-settings-select-icon mod-settings-engine-icon">${isExecutable ? '<img src="assets/icons/exe.png" alt="">' : '<i class="fa-solid fa-question-circle" aria-hidden="true"></i>'}</span>
                <span class="mod-settings-engine-selected">${isExecutable ? t("home.executables") : t("import.unassigned")}</span><i class="fa-solid fa-chevron-down mod-settings-select-chevron" aria-hidden="true"></i>
              </button>
              <div class="mod-settings-dropdown-menu mod-settings-engine-menu" role="listbox" aria-label="${t("common.engine")}" hidden></div>
              <select class="mod-settings-engine-select" hidden></select>
            </span>
          </label>
          <label class="mod-settings-version-field" ${!hasEngine ? "hidden" : ""}>${t("common.version")}
            <span class="mod-settings-dropdown">
              <button type="button" class="mod-settings-dropdown-trigger mod-settings-version-trigger" aria-haspopup="listbox" aria-expanded="false" ${controlsDisabled}>
                <span class="mod-settings-select-icon"><i class="fa-solid fa-code-branch" aria-hidden="true"></i></span>
                <span class="mod-settings-version-selected"></span><i class="fa-solid fa-chevron-down mod-settings-select-chevron" aria-hidden="true"></i>
              </button>
              <div class="mod-settings-dropdown-menu mod-settings-version-menu" role="listbox" aria-label="${t("common.version")}" hidden></div>
              <select class="mod-settings-version-select" hidden></select>
            </span>
          </label>
          ${tagsField}
        </div>`
        }
        ${mod.engineLocked ? `<p class="mod-settings-note">${t("modSettings.lockedToPsychOnline")}</p>` : ""}
        ${readOnly ? `<p class="mod-settings-note">${t("modSettings.closeEngineToChange")}</p>` : ""}
      </div>
      <footer class="mod-settings-footer">
        <button type="button" class="mod-settings-reset" ${canReset && !readOnly ? "" : `disabled title="${escapeHtml(readOnly ? t("modSettings.closeEngineToChangeShort") : resetTitle)}"`}>${t("common.reset")}</button>
        ${isDependency ? `<button type="button" class="mod-settings-move-to-mods" ${readOnly ? "disabled" : ""}>${t("modSettings.moveToMods")}</button>` : canMoveToDependencies ? `<button type="button" class="mod-settings-move-to-dependencies" ${readOnly ? "disabled" : ""}>${t("modSettings.moveToDependencies")}</button>` : ""}
        <span class="mod-settings-status" role="status"></span>
        <button type="button" class="mod-settings-cancel">${t("common.cancel")}</button>
        <button type="submit" class="mod-settings-save" ${readOnly ? "disabled" : ""}>${t("common.save")}</button>
      </footer>
    </form>`;
}
