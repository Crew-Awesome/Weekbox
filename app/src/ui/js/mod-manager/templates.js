function renderTemplate(id, data = {}) {
  const tpl = document.getElementById(id);
  if (!tpl) return "";
  let html = tpl.innerHTML;
  for (const key in data) {
    html = html.replace(new RegExp("{{" + key + "}}", "g"), data[key]);
  }
  return html;
}

const modManagerTemplates = {
  mainModal: () => renderTemplate("tpl-mainModal"),
  unassignedBadge: () => renderTemplate("tpl-unassignedBadge"),
  executableBadge: () => renderTemplate("tpl-executableBadge"),
  engineBadge: (name, icon) =>
    renderTemplate("tpl-engineBadge", { name, icon }),
  engineCompatibilityPicker: (
    modId,
    engineId,
    engineVersion,
    selectedEngineIcon,
    selectedEngineName,
    engineOptionsHtml,
    selectedVersion,
    versionOptionsHtml,
  ) =>
    renderTemplate("tpl-engineCompatibilityPicker", {
      modId,
      engineId,
      engineVersion,
      selectedEngineIconHtml: selectedEngineIcon
        ? `<img src="assets/icons/${selectedEngineIcon}" alt=""/>`
        : `<i class="fa-solid fa-question-circle" aria-hidden="true"></i>`,
      selectedEngineName,
      unassignedSelectedClass: !engineId ? "selected" : "",
      engineOptionsHtml,
      selectedVersion,
      versionOptionsHtml,
    }),
  engineOption: (id, name, icon, isSelected) =>
    renderTemplate("tpl-engineOption", {
      id,
      name,
      icon,
      selectedClass: isSelected ? "selected" : "",
    }),
  versionOption: (version, isSelected) =>
    renderTemplate("tpl-versionOption", {
      versionValue: version === "Any version" ? "" : version,
      version,
      selectedClass: isSelected ? "selected" : "",
    }),
  cardContent: (
    launchKind,
    modId,
    engineId,
    engineVersion,
    launchLabel,
    modName,
    isHidden,
    isUnassigned,
    eyeIcon,
    engineBadgeHtml,
  ) =>
    renderTemplate("tpl-cardContent", {
      launchKind,
      modId,
      engineId,
      engineVersion,
      launchLabel,
      modName,
      eyeIcon,
      engineBadgeHtml,
      disabledAttr: isHidden || isUnassigned ? "disabled" : "",
    }),
  launchButtonRunning: () => renderTemplate("tpl-launchButtonRunning"),
  launchButtonSwitch: () => renderTemplate("tpl-launchButtonSwitch"),
  launchButtonDefault: (launchLabel) =>
    renderTemplate("tpl-launchButtonDefault", { launchLabel }),
  emptyState: (message) => renderTemplate("tpl-emptyState", { message }),
  addLocalModCard: () =>
    renderTemplate("tpl-addLocalModCard") ||
    `<button class="mod-manager-add-local-card" type="button" aria-label="Add local mod">
      <span class="mod-manager-add-local-content">
        <i class="fa-solid fa-plus" aria-hidden="true"></i>
        <span>Add local mod</span>
      </span>
    </button>`,
  deleteSpinner: () => renderTemplate("tpl-deleteSpinner"),
  deleteIcon: () => renderTemplate("tpl-deleteIcon"),
  unassignedQuestionIcon: () => renderTemplate("tpl-unassignedQuestionIcon"),
  openDirectoryIcon: () => renderTemplate("tpl-openDirectoryIcon"),
};

const __renderTemplate = renderTemplate;
const __modManagerTemplates = modManagerTemplates;

export {
  renderTemplate,
  modManagerTemplates,
  __renderTemplate,
  __modManagerTemplates,
};
