import { ENGINE_DETAILS } from "../../../backend/config/engines.config.js";
import { setupDropdown } from "../../utils/index-utils.js";
import { escapeHtml } from "./modSettingsTemplates.js";
import { getEngineLabel, t } from "../i18n/index.js";

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
  const typeSelect = overlay.querySelector(".mod-settings-type");
  const typeTrigger = overlay.querySelector(".mod-settings-type-trigger");
  const typeMenu = overlay.querySelector(".mod-settings-type-menu");
  const typeSelected = overlay.querySelector(".mod-settings-type-selected");

  const typeOptions = [
    ["mod", "Mod", "fa-layer-group"],
    ...(mod.engineId === "codename" || mod.kind === "addon"
      ? [["addon", "Addon", "fa-cubes"]]
      : []),
    ...(mod.kind === "dependency" ||
    (mod.engineId !== "codename" && mod.kind !== "addon")
      ? [["dependency", "Dependency", "fa-puzzle-piece"]]
      : []),
  ];

  const renderType = () => {
    if (!typeSelect || !typeMenu || !typeSelected) return;
    const current =
      typeOptions.find(([value]) => value === typeSelect.value) ||
      typeOptions[0];
    typeSelected.textContent = current[1];
    typeMenu.querySelectorAll("button[data-type]").forEach((button) => {
      const selected = button.dataset.type === typeSelect.value;
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-selected", String(selected));
    });
  };

  const defaultLabel = isExecutable
    ? t("home.executables")
    : t("import.unassigned");
  const defaultIconHtml = isExecutable
    ? '<img src="assets/icons/exe.png" alt="">'
    : '<i class="fa-solid fa-question-circle" aria-hidden="true"></i>';

  if (typeSelect && typeMenu) {
    typeSelect.innerHTML = typeOptions
      .map(
        ([value, label]) =>
          `<option value="${value}" ${value === (mod.kind || "mod") ? "selected" : ""}>${label}</option>`,
      )
      .join("");
    typeMenu.innerHTML = typeOptions
      .map(
        ([value, label, icon]) =>
          `<button type="button" data-type="${value}" role="option" aria-selected="${value === (mod.kind || "mod")}"><i class="fa-solid ${icon}" aria-hidden="true"></i>${label}</button>`,
      )
      .join("");
    renderType();
  }

  const updateVersionVisibility = (hasEngine) => {
    if (versionField) {
      if (hasEngine) {
        versionField.removeAttribute("hidden");
        versionField.hidden = false;
      } else {
        versionField.setAttribute("hidden", "hidden");
        versionField.hidden = true;
      }
    }
    if (engineContainer) {
      engineContainer.classList.toggle("has-version", Boolean(hasEngine));
    }
  };

  const renderVersions = (selectedVersion = mod.engineVersion || "") => {
    if (!versionSelect || !versionMenu || !versionSelected || !versionTrigger)
      return;

    const selectedEngineId = engineSelect.value;
    if (!selectedEngineId || selectedEngineId === "executable") {
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
      versionSelect.innerHTML = `<option value="">${t("modSettings.requiresInstalledVersion")}</option>`;
      versionMenu.innerHTML = `<button type="button" data-version="" class="selected" disabled role="option" aria-selected="true"><i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>${t("modSettings.requiresInstalledVersion")}</button>`;
      versionSelected.textContent = t("modSettings.requiresInstalledVersion");
      return;
    }

    versionTrigger.disabled = false;
    versionTrigger.removeAttribute("disabled");

    const validSelectedVersion =
      selectedVersion && versions.includes(selectedVersion)
        ? selectedVersion
        : "";

    versionSelect.innerHTML = [
      `<option value="">${t("import.anyVersion")}</option>`,
      ...versions.map(
        (version) =>
          `<option value="${escapeHtml(version)}" ${version === validSelectedVersion ? "selected" : ""}>${escapeHtml(version)}</option>`,
      ),
    ].join("");
    versionMenu.innerHTML = [
      `<button type="button" data-version="" class="${!validSelectedVersion ? "selected" : ""}" role="option" aria-selected="${!validSelectedVersion}"><i class="fa-solid fa-code-branch" aria-hidden="true"></i>${t("import.anyVersion")}</button>`,
      ...versions.map(
        (version) =>
          `<button type="button" data-version="${escapeHtml(version)}" class="${version === validSelectedVersion ? "selected" : ""}" role="option" aria-selected="${version === validSelectedVersion}"><i class="fa-solid fa-code-branch" aria-hidden="true"></i>${escapeHtml(version)}</button>`,
      ),
    ].join("");
    versionSelected.textContent =
      validSelectedVersion || t("import.anyVersion");
    versionSelect.value = validSelectedVersion;
  };

  const initialEngineId =
    mod.engineId &&
    mod.engineId !== "executable" &&
    ENGINE_DETAILS[mod.engineId]
      ? mod.engineId
      : "";

  engineSelect.innerHTML = [
    `<option value="">${defaultLabel}</option>`,
    ...assignableEngines.map(
      ([id, details]) =>
        `<option value="${id}" ${id === initialEngineId ? "selected" : ""}>${escapeHtml(getEngineLabel(id, details.name))}</option>`,
    ),
  ].join("");

  const renderEngines = () => {
    const selectedEngineId = engineSelect.value;
    const isCustomEngine =
      selectedEngineId &&
      selectedEngineId !== "executable" &&
      ENGINE_DETAILS[selectedEngineId];
    const engine = isCustomEngine ? ENGINE_DETAILS[selectedEngineId] : null;
    engineSelected.textContent = engine
      ? getEngineLabel(selectedEngineId, engine.name)
      : defaultLabel;
    engineIcon.innerHTML = engine
      ? `<img src="assets/icons/${engine.icon}" alt="">`
      : defaultIconHtml;
    engineMenu.innerHTML = [
      `<button type="button" data-engine-id="" class="${!selectedEngineId ? "selected" : ""}" role="option" aria-selected="${!selectedEngineId}">${defaultIconHtml}${defaultLabel}</button>`,
      ...assignableEngines.map(
        ([id, details]) =>
          `<button type="button" data-engine-id="${id}" class="${id === selectedEngineId ? "selected" : ""}" role="option" aria-selected="${id === selectedEngineId}"><img src="assets/icons/${details.icon}" alt="">${escapeHtml(getEngineLabel(id, details.name))}</button>`,
      ),
    ].join("");
  };

  renderEngines();
  renderVersions(initialEngineId ? mod.engineVersion || "" : "");
  const typeDropdown =
    typeTrigger && typeMenu
      ? setupDropdown(typeTrigger, typeTrigger.parentElement, {
          menuElement: typeMenu,
        })
      : null;
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
  typeMenu?.addEventListener("click", (event) => {
    const option = event.target.closest("button[data-type]");
    if (!option || !typeSelect) return;
    typeSelect.value = option.dataset.type;
    renderType();
    typeDropdown?.close();
  });
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
    typeSelect,
    destroy: () => {
      engineDropdown.destroy();
      versionDropdown?.destroy();
      typeDropdown?.destroy();
    },
  };
}
