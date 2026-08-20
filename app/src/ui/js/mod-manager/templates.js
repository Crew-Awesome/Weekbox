import { t } from "../i18n/index.js";

function escapeHtml(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character],
  );
}

function renderTemplate(id, data = {}, rawKeys = []) {
  const tpl = document.getElementById(id);
  if (!tpl) return "";
  let html = tpl.innerHTML;
  for (const key in data) {
    const value = rawKeys.includes(key) ? data[key] : escapeHtml(data[key]);
    html = html.replace(new RegExp("{{" + key + "}}", "g"), value);
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
    renderTemplate(
      "tpl-engineCompatibilityPicker",
      {
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
        unassignedLabel: t("import.unassigned"),
      },
      ["selectedEngineIconHtml", "engineOptionsHtml", "versionOptionsHtml"],
    ),
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
    renderTemplate(
      "tpl-cardContent",
      {
        launchKind,
        modId,
        engineId,
        engineVersion,
        launchLabel,
        modName,
        eyeIcon,
        engineBadgeHtml,
        disabledAttr: isHidden || isUnassigned ? "disabled" : "",
      },
      ["engineBadgeHtml"],
    ),
  launchButtonRunning: () => renderTemplate("tpl-launchButtonRunning"),
  launchButtonSwitch: () => renderTemplate("tpl-launchButtonSwitch"),
  launchButtonDefault: (launchLabel) =>
    renderTemplate("tpl-launchButtonDefault", { launchLabel }),
  emptyState: (message) =>
    renderTemplate("tpl-emptyState", { message }, ["message"]),
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
