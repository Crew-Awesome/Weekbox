import { ENGINE_DETAILS } from "../../../backend/config/engines.config.js";
import { setupDropdown } from "../../utils/index-utils.js";
import { escapeHtml } from "./modSettingsTemplates.js";

export function setupModSettingsDropdowns(
  overlay,
  mod,
  installedEngines,
  isExecutable = false,
) {
  const assignableEngines = Object.entries(ENGINE_DETAILS).filter(
    ([id]) => id !== "executable",
  );
  const engineContainer = overlay.querySelector(".mod-settings-engine");
  const engineSelect = overlay.querySelector(".mod-settings-engine-select");
  const versionField = overlay.querySelector(".mod-settings-version-field");
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

  const defaultLabel = isExecutable ? "Executable" : "Unassigned";
  const defaultIconHtml = isExecutable
    ? '<img src="assets/icons/exe.png" alt="">'
    : '<i class="fa-solid fa-question-circle" aria-hidden="true"></i>';

  const updateVersionVisibility = (hasEngine) => {
    if (versionField) {
      versionField.hidden = !hasEngine;
    }
    if (engineContainer) {
      engineContainer.classList.toggle("has-version", hasEngine);
    }
  };

  const renderVersions = (selectedVersion = mod.engineVersion || "") => {
    if (!versionSelect || !versionMenu || !versionSelected || !versionTrigger)
      return;

    const selectedEngineId = engineSelect.value;
    if (!selectedEngineId) {
      updateVersionVisibility(false);
      versionSelect.value = "";
      versionSelect.innerHTML = "";
      versionMenu.innerHTML = "";
      versionSelected.textContent = "";
      return;
    }

    updateVersionVisibility(true);
    const versions = installedEngines
      .filter((item) => item.id === selectedEngineId)
      .map((item) => item.version);

    if (versions.length === 0) {
      versionTrigger.disabled = true;
      versionTrigger.setAttribute("disabled", "true");
      versionSelect.value = "";
      versionSelect.innerHTML =
        '<option value="">Requires installed version</option>';
      versionMenu.innerHTML =
        '<button type="button" data-version="" class="selected" disabled role="option" aria-selected="true"><i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>Requires installed version</button>';
      versionSelected.textContent = "Requires installed version";
      return;
    }

    versionTrigger.disabled = false;
    versionTrigger.removeAttribute("disabled");

    const validSelectedVersion =
      selectedVersion && versions.includes(selectedVersion)
        ? selectedVersion
        : "";

    versionSelect.innerHTML = [
      '<option value="">Any version</option>',
      ...versions.map(
        (version) =>
          `<option value="${escapeHtml(version)}" ${version === validSelectedVersion ? "selected" : ""}>${escapeHtml(version)}</option>`,
      ),
    ].join("");
    versionMenu.innerHTML = [
      `<button type="button" data-version="" class="${!validSelectedVersion ? "selected" : ""}" role="option" aria-selected="${!validSelectedVersion}"><i class="fa-solid fa-code-branch" aria-hidden="true"></i>Any version</button>`,
      ...versions.map(
        (version) =>
          `<button type="button" data-version="${escapeHtml(version)}" class="${version === validSelectedVersion ? "selected" : ""}" role="option" aria-selected="${version === validSelectedVersion}"><i class="fa-solid fa-code-branch" aria-hidden="true"></i>${escapeHtml(version)}</button>`,
      ),
    ].join("");
    versionSelected.textContent = validSelectedVersion || "Any version";
    versionSelect.value = validSelectedVersion;
  };

  engineSelect.innerHTML = [
    `<option value="">${defaultLabel}</option>`,
    ...assignableEngines.map(
      ([id, details]) =>
        `<option value="${id}" ${id === mod.engineId ? "selected" : ""}>${escapeHtml(details.name)}</option>`,
    ),
  ].join("");

  const renderEngines = () => {
    const engine = ENGINE_DETAILS[engineSelect.value];
    engineSelected.textContent = engine?.name || defaultLabel;
    engineIcon.innerHTML = engine
      ? `<img src="assets/icons/${engine.icon}" alt="">`
      : defaultIconHtml;
    engineMenu.innerHTML = [
      `<button type="button" data-engine-id="" class="${!engineSelect.value ? "selected" : ""}" role="option" aria-selected="${!engineSelect.value}">${defaultIconHtml}${defaultLabel}</button>`,
      ...assignableEngines.map(
        ([id, details]) =>
          `<button type="button" data-engine-id="${id}" class="${id === engineSelect.value ? "selected" : ""}" role="option" aria-selected="${id === engineSelect.value}"><img src="assets/icons/${details.icon}" alt="">${escapeHtml(details.name)}</button>`,
      ),
    ].join("");
  };

  renderEngines();
  renderVersions(mod.engineVersion || "");
  const engineDropdown = setupDropdown(
    engineTrigger,
    engineTrigger.parentElement,
    {
      menuElement: engineMenu,
    },
  );
  let versionDropdown = null;
  if (versionTrigger && versionMenu) {
    versionDropdown = setupDropdown(
      versionTrigger,
      versionTrigger.parentElement,
      {
        menuElement: versionMenu,
      },
    );
    versionMenu.addEventListener("click", (event) => {
      if (versionTrigger.disabled) return;
      const option = event.target.closest("button[data-version]");
      if (!option || option.disabled) return;
      versionSelect.value = option.dataset.version;
      renderVersions(versionSelect.value);
      versionDropdown.close();
    });
  }
  engineMenu.addEventListener("click", (event) => {
    const option = event.target.closest("button[data-engine-id]");
    if (!option) return;
    engineSelect.value = option.dataset.engineId;
    renderEngines();
    renderVersions(
      mod.engineId === engineSelect.value ? mod.engineVersion || "" : "",
    );
    engineDropdown.close();
  });

  return {
    engineSelect,
    versionSelect,
    destroy: () => {
      engineDropdown.destroy();
      versionDropdown?.destroy();
    },
  };
}
