import { FS } from "../../../backend/services/filesystem.js";
import { setupDropdown } from "../../utils/components/dropdown.component.js";
import { escapeHtml } from "./modSettingsTemplates.js";
import { getEngineLabel, t } from "../i18n/index.js";
import {
  getEngineVersionName,
  getEngineVersionOrder,
} from "../../../backend/config/engine-preferences.js";

export function setupModSettingsDropdowns(overlay, mod, installedEngines) {
  const assignableEngines = Object.entries(FS.getAllEngineDetails()).filter(
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

  const getTypeOptions = () => [
    ["mod", "common.mods", "fa-layer-group"],
    ...(engineSelect.value === "codename" ||
    mod.engineId === "codename" ||
    FS.isCustomEngine(engineSelect.value) ||
    FS.isCustomEngine(mod.engineId) ||
    mod.kind === "addon"
      ? [["addon", "engineManager.customAddons", "fa-cubes"]]
      : []),
    ...(mod.kind === "dependency" ||
    (engineSelect.value !== "codename" &&
      mod.engineId !== "codename" &&
      mod.kind !== "addon")
      ? [["dependency", "modManager.dependencies", "fa-puzzle-piece"]]
      : []),
  ];

  const renderType = () => {
    if (!typeSelect || !typeMenu || !typeSelected) return;
    const typeOptions = getTypeOptions();
    const current =
      typeOptions.find(([value]) => value === typeSelect.value) ||
      typeOptions[0];
    typeSelected.textContent = t(current[1]);
    typeMenu.querySelectorAll("button[data-type]").forEach((button) => {
      const selected = button.dataset.type === typeSelect.value;
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-selected", String(selected));
    });
  };

  const defaultLabel = t("import.unassigned");
  const defaultIconHtml =
    '<i class="fa-solid fa-question-circle" aria-hidden="true"></i>';

  const renderTypeOptions = () => {
    if (!typeSelect || !typeMenu) return;
    const typeOptions = getTypeOptions();
    if (!typeOptions.some(([value]) => value === typeSelect.value))
      typeSelect.value = "mod";
    typeSelect.innerHTML = typeOptions
      .map(
        ([value, label]) =>
          `<option value="${value}" ${value === (mod.kind || "mod") ? "selected" : ""}>${t(label)}</option>`,
      )
      .join("");
    typeMenu.innerHTML = typeOptions
      .map(
        ([value, label, icon]) =>
          `<button type="button" data-type="${value}" role="option" aria-selected="${value === (mod.kind || "mod")}"><i class="fa-solid ${icon}" aria-hidden="true"></i>${t(label)}</button>`,
      )
      .join("");
  };

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
    const getVersionLabel = (version) => {
      const name = getEngineVersionName(selectedEngineId, version, version);
      return name === version ? version : `${name} (${version})`;
    };
    if (!selectedEngineId || selectedEngineId === "executable") {
      updateVersionVisibility(false);
      versionSelect.value = "";
      versionSelect.innerHTML = "";
      versionMenu.innerHTML = "";
      versionSelected.textContent = "";
      return;
    }

    updateVersionVisibility(true);
    const versions = getEngineVersionOrder(
      selectedEngineId,
      installedEngines
        .filter((item) => item.id === selectedEngineId)
        .map((item) => item.version),
    );

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
          `<option value="${escapeHtml(version)}" ${version === validSelectedVersion ? "selected" : ""}>${escapeHtml(getVersionLabel(version))}</option>`,
      ),
    ].join("");
    versionMenu.innerHTML = [
      `<button type="button" data-version="" class="${!validSelectedVersion ? "selected" : ""}" role="option" aria-selected="${!validSelectedVersion}"><i class="fa-solid fa-code-branch" aria-hidden="true"></i>${t("import.anyVersion")}</button>`,
      ...versions.map(
        (version) =>
          `<button type="button" data-version="${escapeHtml(version)}" class="${version === validSelectedVersion ? "selected" : ""}" role="option" aria-selected="${version === validSelectedVersion}"><i class="fa-solid fa-code-branch" aria-hidden="true"></i>${escapeHtml(getVersionLabel(version))}</button>`,
      ),
    ].join("");
    versionSelected.textContent = validSelectedVersion
      ? getVersionLabel(validSelectedVersion)
      : t("import.anyVersion");
    versionSelect.value = validSelectedVersion;
  };

  const initialEngineId =
    mod.engineId &&
    mod.engineId !== "executable" &&
    FS.getEngineDetails(mod.engineId)
      ? mod.engineId
      : "";

  engineSelect.innerHTML = [
    `<option value="">${defaultLabel}</option>`,
    ...assignableEngines.map(
      ([id, details]) =>
        `<option value="${id}" ${id === initialEngineId ? "selected" : ""}>${escapeHtml(getEngineLabel(id, details.name))}</option>`,
    ),
  ].join("");
  renderTypeOptions();
  renderType();

  const renderEngines = () => {
    const selectedEngineId = engineSelect.value;
    const isCustomEngine =
      selectedEngineId &&
      selectedEngineId !== "executable" &&
      FS.getEngineDetails(selectedEngineId);
    const engine = isCustomEngine
      ? FS.getEngineDetails(selectedEngineId)
      : null;
    engineSelected.textContent = engine
      ? getEngineLabel(selectedEngineId, engine.name)
      : defaultLabel;
    engineIcon.innerHTML = engine
      ? `<img src="${FS.getEngineIconSource(selectedEngineId)}" alt="">`
      : defaultIconHtml;
    engineMenu.innerHTML = [
      `<button type="button" data-engine-id="" class="${!selectedEngineId ? "selected" : ""}" role="option" aria-selected="${!selectedEngineId}">${defaultIconHtml}${defaultLabel}</button>`,
      ...assignableEngines.map(
        ([id, details]) =>
          `<button type="button" data-engine-id="${id}" class="${id === selectedEngineId ? "selected" : ""}" role="option" aria-selected="${id === selectedEngineId}"><img src="${FS.getEngineIconSource(id)}" alt="">${escapeHtml(getEngineLabel(id, details.name))}</button>`,
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
    renderTypeOptions();
    renderType();
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
    refresh: ({ engineId, version, type } = {}) => {
      if (engineId !== undefined) engineSelect.value = engineId || "";
      if (type !== undefined && typeSelect) typeSelect.value = type;
      renderTypeOptions();
      renderType();
      renderEngines();
      renderVersions(version ?? "");
    },
    destroy: () => {
      engineDropdown.destroy();
      versionDropdown?.destroy();
      typeDropdown?.destroy();
    },
  };
}
