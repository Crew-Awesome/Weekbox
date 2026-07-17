export const modManagerTemplates = {
  mainModal: () => `
    <div class="mod-manager-overlay" id="mod-manager-modal" style="display: none">
      <div class="mod-manager-content">
        <header class="mod-manager-header">
          <div class="mod-manager-title-group">
            <h2>Mod Manager</h2>
            <div class="mod-manager-view-tabs" role="group" aria-label="Mod manager content">
              <button class="mod-manager-view-tab active" type="button" data-mod-manager-view="mods" aria-pressed="true">Mods</button>
              <button class="mod-manager-view-tab" type="button" data-mod-manager-view="dependencies" aria-pressed="false">Dependencies</button>
            </div>
          </div>
          <div class="mod-manager-header-actions">
            <div class="mod-manager-filter" id="mod-manager-engine-filter">
              <button class="mod-manager-filter-trigger" type="button" aria-expanded="false">
                <span class="mod-manager-filter-icon" aria-hidden="true"><i class="fa-solid fa-layer-group"></i></span>
                <span class="mod-manager-filter-label">All mods</span>
                <i class="fa-solid fa-chevron-down" aria-hidden="true"></i>
              </button>
              <div class="mod-manager-filter-menu" role="menu" hidden></div>
            </div>
            <button class="mod-manager-action-btn" id="mod-manager-view-toggle" title="Toggle View Mode">
              <i class="fa-solid fa-list"></i>
            </button>
            <button class="mod-manager-action-btn mod-manager-close-btn" id="mod-manager-close-btn" title="Close">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
        </header>
        <div class="mod-manager-body" id="mod-manager-modal-body"></div>
      </div>
    </div>`,
  unassignedBadge: () => `<div class="mod-manager-engine-badge"><i class="fa-solid fa-question-circle"></i><span>Unassigned</span></div>`,
  executableBadge: () => `<div class="mod-manager-engine-badge"><img src="assets/icons/exe.png" alt="Executable"/><span>Executable</span></div>`,
  engineCompatibilityPicker: (modId, engineId, engineVersion, selectedEngineIcon, selectedEngineName, engineOptionsHtml, selectedVersion, versionOptionsHtml) => `
    <div class="mod-manager-engine-compatibility-picker" data-mod-id="${modId}" data-saved-engine-id="${engineId}" data-pending-engine-id="${engineId}" data-saved-version="${engineVersion}" data-pending-version="${engineVersion}">
      <div class="mod-manager-engine-picker">
        <button class="mod-manager-engine-pill" type="button" aria-expanded="false">
          ${selectedEngineIcon ? `<img src="assets/icons/${selectedEngineIcon}" alt=""/>` : `<i class="fa-solid fa-question-circle" aria-hidden="true"></i>`}
          <span>${selectedEngineName}</span><i class="fa-solid fa-chevron-down" aria-hidden="true"></i>
        </button>
        <div class="mod-manager-engine-menu" hidden>
          <button type="button" data-engine-id="" class="${!engineId ? "selected" : ""}"><i class="fa-solid fa-question-circle" aria-hidden="true"></i>Unassigned</button>
          ${engineOptionsHtml}
        </div>
      </div>
      <div class="mod-manager-version-picker">
        <button class="mod-manager-version-pill" type="button" aria-expanded="false">
          <span>${selectedVersion}</span><i class="fa-solid fa-chevron-down" aria-hidden="true"></i>
        </button>
        <div class="mod-manager-version-menu" hidden>
          ${versionOptionsHtml}
        </div>
      </div>
    </div>`,
  engineOption: (id, name, icon, isSelected) => `<button type="button" data-engine-id="${id}" data-engine-name="${name}" data-engine-icon="${icon}" class="${isSelected ? "selected" : ""}"><img src="assets/icons/${icon}" alt=""/>${name}</button>`,
  versionOption: (version, isSelected) => `<button type="button" data-version="${version === "Any version" ? "" : version}" class="${isSelected ? "selected" : ""}">${version}</button>`,
  cardContent: (imageUrl, launchKind, modId, engineId, engineVersion, launchLabel, modName, isHidden, eyeIcon, engineBadgeHtml) => `
    <div class="mod-manager-cover-wrap">
      <img class="mod-manager-cover" crossorigin="Anonymous" src="${imageUrl}" alt="Mod Cover" onerror="this.src='[https://images.gamebanana.com/img/ss/mods/default.jpg](https://images.gamebanana.com/img/ss/mods/default.jpg)'"/>
      <button class="mod-manager-launch-btn" type="button" data-launch-kind="${launchKind}" data-mod-id="${modId}" data-engine-id="${engineId}" data-engine-version="${engineVersion}" data-launch-label="${launchLabel}" data-mod-name="${modName}" aria-label="${launchLabel} ${modName}" ${isHidden ? "disabled" : ""}>
        <i class="fa-solid fa-play" aria-hidden="true"></i><span>${launchLabel}</span>
      </button>
    </div>
    <div class="mod-manager-card-body">
        <div class="mod-manager-info">
          <h3 title="${modName}">${modName}</h3>
          ${engineBadgeHtml}
        </div>
        <div class="mod-manager-actions">
          <button class="mod-action-btn mod-manager-vis-btn" title="Toggle Visibility">
            <i class="fa-solid ${eyeIcon}"></i>
          </button>
          <button class="mod-action-btn mod-manager-dir-btn" title="Open Directory">
            <i class="fa-solid fa-folder-open"></i>
          </button>
          <button class="mod-action-btn mod-manager-delete-btn" data-id="${modId}" title="Delete Mod">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
    </div>`,
  launchButtonRunning: () => `<i class="fa-solid fa-play mod-manager-running-icon" aria-hidden="true"></i><span class="mod-manager-running-label">Running</span><span class="mod-manager-close-label"><i class="fa-solid fa-xmark" aria-hidden="true"></i><span>Click to Close</span></span>`,
  launchButtonSwitch: () => `<i class="fa-solid fa-right-left" aria-hidden="true"></i><span>Switch Mod</span>`,
  launchButtonDefault: (launchLabel) => `<i class="fa-solid fa-play" aria-hidden="true"></i><span>${launchLabel}</span>`,
  emptyState: (message) => `<div class="empty-mods-state">${message}</div>`,
  deleteSpinner: () => `<i class="fa-solid fa-spinner fa-spin"></i>`,
  deleteIcon: () => `<i class="fa-solid fa-trash"></i>`,
  unassignedQuestionIcon: () => `<i class="fa-solid fa-question-circle" aria-hidden="true"></i>`,
  openDirectoryIcon: () => `<i class="fa-solid fa-folder-open" aria-hidden="true"></i>`
};