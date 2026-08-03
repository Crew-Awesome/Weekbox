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
      <span>Loading mod settings…</span>
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
}) {
  return `
    <form class="mod-settings-modal">
      <header class="mod-settings-header">
        <h2 id="mod-settings-title">${isDependency ? "Dependency Settings" : "Mod Settings"}</h2>
        <div class="mod-settings-header-actions">
          <button type="button" class="mod-settings-open-folder" title="Open ${isDependency ? "Dependency" : "Mod"} Folder" aria-label="Open ${isDependency ? "dependency" : "mod"} folder"><i class="fa-solid fa-folder-open"></i></button>
          <button type="button" class="mod-settings-close" aria-label="Close ${isDependency ? "Dependency" : "Mod"} Settings"><i class="fa-solid fa-xmark"></i></button>
        </div>
      </header>
      <div class="mod-settings-body">
        <div class="mod-settings-identity">
          <label class="mod-settings-cover-picker" title="${readOnly ? "Changes are unavailable while the mod is running" : "Change cover image"}">
            <img class="mod-settings-cover" src="${escapeHtml(localCover || "assets/icons/launcher-icon.png")}" alt="Current mod cover">
            <span><i class="fa-solid fa-image" aria-hidden="true"></i> Change image</span>
            <input class="mod-settings-file" type="file" accept="image/*" ${readOnly ? "disabled" : ""}>
          </label>
          <input class="mod-settings-name" aria-label="Mod name" value="${escapeHtml(mod.name)}" maxlength="120" required ${readOnly ? "disabled" : ""}>
        </div>
        ${
          isExecutable
            ? `
          <div class="mod-settings-engine mod-settings-executable-type">
            <div>
              <span>Type</span>
              <div class="mod-settings-executable-value"><img src="assets/icons/exe.png" alt=""><span>Executable</span></div>
            </div>
          </div>`
            : `<div class="mod-settings-engine" ${controlsDisabled ? 'aria-disabled="true"' : ""}>
          <label>Engine
            <span class="mod-settings-dropdown">
              <button type="button" class="mod-settings-dropdown-trigger mod-settings-engine-trigger" aria-haspopup="listbox" aria-expanded="false" ${controlsDisabled}>
                <span class="mod-settings-select-icon mod-settings-engine-icon"><i class="fa-solid fa-question-circle" aria-hidden="true"></i></span>
                <span class="mod-settings-engine-selected"></span><i class="fa-solid fa-chevron-down mod-settings-select-chevron" aria-hidden="true"></i>
              </button>
              <div class="mod-settings-dropdown-menu mod-settings-engine-menu" role="listbox" aria-label="Engine" hidden></div>
              <select class="mod-settings-engine-select" hidden></select>
            </span>
          </label>
          <label>Version
            <span class="mod-settings-dropdown">
              <button type="button" class="mod-settings-dropdown-trigger mod-settings-version-trigger" aria-haspopup="listbox" aria-expanded="false" ${controlsDisabled}>
                <span class="mod-settings-select-icon"><i class="fa-solid fa-code-branch" aria-hidden="true"></i></span>
                <span class="mod-settings-version-selected"></span><i class="fa-solid fa-chevron-down mod-settings-select-chevron" aria-hidden="true"></i>
              </button>
              <div class="mod-settings-dropdown-menu mod-settings-version-menu" role="listbox" aria-label="Version" hidden></div>
              <select class="mod-settings-version-select" hidden></select>
            </span>
          </label>
        </div>`
        }
        ${mod.engineLocked ? '<p class="mod-settings-note">This mod is locked to Psych Online.</p>' : ""}
        ${readOnly ? '<p class="mod-settings-note">Close the engine to change these settings. You can still open the mod folder.</p>' : ""}
      </div>
      <footer class="mod-settings-footer">
        <button type="button" class="mod-settings-reset" ${canReset && !readOnly ? "" : `disabled title="${escapeHtml(readOnly ? "Close the engine to change settings" : resetTitle)}"`}>Reset</button>
        ${isDependency ? `<button type="button" class="mod-settings-move-to-mods" ${readOnly ? "disabled" : ""}>Move to Mods</button>` : canMoveToDependencies ? `<button type="button" class="mod-settings-move-to-dependencies" ${readOnly ? "disabled" : ""}>Move to Dependencies</button>` : ""}
        <span class="mod-settings-status" role="status"></span>
        <button type="button" class="mod-settings-cancel">Cancel</button>
        <button type="submit" class="mod-settings-save" ${readOnly ? "disabled" : ""}>Save</button>
      </footer>
    </form>`;
}
