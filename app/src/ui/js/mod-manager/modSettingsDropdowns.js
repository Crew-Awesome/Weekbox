import { ENGINE_DETAILS } from "../../../backend/config/engines.js";
import { setupDropdown } from "../../../utils/dropdown.js";
import { escapeHtml } from "./modSettingsTemplates.js";

export function setupModSettingsDropdowns(overlay, mod, installedEngines) {
  const assignableEngines = Object.entries(ENGINE_DETAILS).filter(
    ([id]) => id !== "executable",
  );
  const engineSelect = overlay.querySelector(".mod-settings-engine-select");
  const versionSelect = overlay.querySelector(".mod-settings-version-select");
  const engineIcon = overlay.querySelector(".mod-settings-engine-icon");
  const engineTrigger = overlay.querySelector(".mod-settings-engine-trigger");
  const engineMenu = overlay.querySelector(".mod-settings-engine-menu");
  const engineSelected = overlay.querySelector(".mod-settings-engine-selected");
  const versionTrigger = overlay.querySelector(".mod-settings-version-trigger");
  const versionMenu = overlay.querySelector(".mod-settings-version-menu");
  const versionSelected = overlay.querySelector(
    ".mod-settings-version-selected",
  );

  const renderVersions = (selectedVersion = mod.engineVersion || "") => {
    const versions = installedEngines
      .filter((item) => item.id === engineSelect.value)
      .map((item) => item.version);
    versionSelect.innerHTML = [
      '<option value="">Any version</option>',
      ...versions.map(
        (version) =>
          `<option value="${escapeHtml(version)}" ${version === selectedVersion ? "selected" : ""}>${escapeHtml(version)}</option>`,
      ),
    ].join("");
    versionMenu.innerHTML = [
      `<button type="button" data-version="" class="${!selectedVersion ? "selected" : ""}" role="option" aria-selected="${!selectedVersion}"><i class="fa-solid fa-code-branch" aria-hidden="true"></i>Any version</button>`,
      ...versions.map(
        (version) =>
          `<button type="button" data-version="${escapeHtml(version)}" class="${version === selectedVersion ? "selected" : ""}" role="option" aria-selected="${version === selectedVersion}"><i class="fa-solid fa-code-branch" aria-hidden="true"></i>${escapeHtml(version)}</button>`,
      ),
    ].join("");
    versionSelected.textContent = selectedVersion || "Any version";
  };

  engineSelect.innerHTML = [
    '<option value="">Unassigned</option>',
    ...assignableEngines.map(
      ([id, details]) =>
        `<option value="${id}" ${id === mod.engineId ? "selected" : ""}>${escapeHtml(details.name)}</option>`,
    ),
  ].join("");
  const renderEngines = () => {
    const engine = ENGINE_DETAILS[engineSelect.value];
    engineSelected.textContent = engine?.name || "Unassigned";
    engineIcon.innerHTML = engine
      ? `<img src="assets/icons/${engine.icon}" alt="">`
      : '<i class="fa-solid fa-question-circle" aria-hidden="true"></i>';
    engineMenu.innerHTML = [
      `<button type="button" data-engine-id="" class="${!engineSelect.value ? "selected" : ""}" role="option" aria-selected="${!engineSelect.value}"><i class="fa-solid fa-question-circle" aria-hidden="true"></i>Unassigned</button>`,
      ...assignableEngines.map(
        ([id, details]) =>
          `<button type="button" data-engine-id="${id}" class="${id === engineSelect.value ? "selected" : ""}" role="option" aria-selected="${id === engineSelect.value}"><img src="assets/icons/${details.icon}" alt="">${escapeHtml(details.name)}</button>`,
      ),
    ].join("");
  };

  renderEngines();
  renderVersions();
  const engineDropdown = setupDropdown(
    engineTrigger,
    engineTrigger.parentElement,
    {
      menuElement: engineMenu,
    },
  );
  const versionDropdown = setupDropdown(
    versionTrigger,
    versionTrigger.parentElement,
    {
      menuElement: versionMenu,
    },
  );
  engineMenu.addEventListener("click", (event) => {
    const option = event.target.closest("button[data-engine-id]");
    if (!option) return;
    engineSelect.value = option.dataset.engineId;
    renderEngines();
    renderVersions();
    engineDropdown.close();
  });
  versionMenu.addEventListener("click", (event) => {
    const option = event.target.closest("button[data-version]");
    if (!option) return;
    versionSelect.value = option.dataset.version;
    renderVersions(versionSelect.value);
    versionDropdown.close();
  });

  return {
    engineSelect,
    versionSelect,
    destroy: () => {
      engineDropdown.destroy();
      versionDropdown.destroy();
    },
  };
}
