import { setupDropdown } from "../../utils/components/dropdown.component.js";
import { ENGINE_DETAILS } from "../../../backend/config/engines.config.js";
import { getEngineLabel, t } from "../i18n/index.js";

const SORT_OPTIONS = [
  ["added-desc", "modManager.lastAdded", "fa-clock"],
  ["added-asc", "modManager.firstAdded", "fa-clock-rotate-left"],
  ["name-asc", "modManager.nameAsc", "fa-arrow-down-a-z"],
  ["name-desc", "modManager.nameDesc", "fa-arrow-down-z-a"],
  ["engine-asc", "modManager.engineAsc", "fa-microchip"],
  ["engine-desc", "modManager.engineDesc", "fa-microchip"],
];

function createIcon(iconClass, iconPath) {
  if (iconPath) return Object.assign(document.createElement("img"), { src: iconPath, alt: "" });
  const icon = document.createElement("i");
  icon.className = `fa-solid ${iconClass || "fa-filter"}`;
  icon.setAttribute("aria-hidden", "true");
  return icon;
}

function text(value) {
  return value.includes(".") ? t(value) : value;
}

function createMultiDropdown(label, options, selectedFilters, emptyLabel) {
  const dropdown = document.createElement("div");
  dropdown.className = "pill-dropdown mod-manager-multi-dropdown";
  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "pill-btn";
  const menu = document.createElement("div");
  menu.className = "custom-options-container";
  menu.hidden = true;

  const sync = () => {
    const selected = options.filter(([value]) =>
      selectedFilters.include.has(value) || selectedFilters.exclude.has(value),
    );
    trigger.innerHTML = `<i class="fa-solid fa-filter" aria-hidden="true"></i><span>${label}${selected.length ? ` (${selected.length})` : ""}</span><i class="fa-solid fa-chevron-down" aria-hidden="true"></i>`;
    menu.querySelectorAll("[data-value]").forEach((option) => {
      option.classList.toggle("is-included", selectedFilters.include.has(option.dataset.value));
      option.classList.toggle("is-excluded", selectedFilters.exclude.has(option.dataset.value));
    });
  };

  if (!options.length) menu.innerHTML = `<span class="mod-manager-filter-empty">${emptyLabel}</span>`;
  options.forEach(([value, labelText, iconClass, iconPath]) => {
    const option = document.createElement("div");
    option.className = "custom-option mod-manager-filter-option";
    option.dataset.value = value;
    option.innerHTML = `${iconPath ? `<img src="${iconPath}" alt="">` : `<i class="fa-solid ${iconClass || "fa-filter"}" aria-hidden="true"></i>`}<span>${text(labelText)}</span><span class="mod-manager-filter-option-actions"><button type="button" data-action="include" title="Include ${text(labelText)}"><i class="fa-solid fa-check" aria-hidden="true"></i></button><button type="button" data-action="exclude" title="Exclude ${text(labelText)}"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button></span>`;
    option.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button) return;
      const target = button.dataset.action;
      const other = target === "include" ? "exclude" : "include";
      if (selectedFilters[target].has(value)) selectedFilters[target].delete(value);
      else {
        selectedFilters[target].add(value);
        selectedFilters[other].delete(value);
      }
      sync();
    });
    menu.append(option);
  });

  const control = setupDropdown(trigger, dropdown, { menuElement: menu });
  dropdown.append(trigger, menu);
  sync();
  return { dropdown, sync, destroy: control.destroy };
}

function createSortDropdown(sort, onSelect) {
  const dropdown = document.createElement("div");
  dropdown.className = "pill-dropdown mod-manager-multi-dropdown";
  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "pill-btn";
  const menu = document.createElement("div");
  menu.className = "custom-options-container";
  menu.hidden = true;
  let selected = sort;

  const sync = (value = selected) => {
    selected = value;
    const option = SORT_OPTIONS.find(([id]) => id === selected) || SORT_OPTIONS[0];
    trigger.innerHTML = `<i class="fa-solid ${option[2]}" aria-hidden="true"></i><span>${t("modManager.sortBy")}: ${t(option[1])}</span><i class="fa-solid fa-chevron-down" aria-hidden="true"></i>`;
    menu.querySelectorAll("button").forEach((button) => button.classList.toggle("selected", button.dataset.value === selected));
  };
  SORT_OPTIONS.forEach(([value, label, icon]) => {
    const option = document.createElement("button");
    option.type = "button";
    option.className = "custom-option";
    option.dataset.value = value;
    option.innerHTML = `<i class="fa-solid ${icon}" aria-hidden="true"></i><span>${t(label)}</span>`;
    option.addEventListener("click", () => {
      sync(value);
      onSelect(value);
      control.close();
    });
    menu.append(option);
  });
  const control = setupDropdown(trigger, dropdown, { menuElement: menu });
  dropdown.append(trigger, menu);
  sync();
  return { dropdown, sync, destroy: control.destroy };
}

export function openFilterSortModal({
  filters = { include: [], exclude: [] },
  sort = "added-desc",
  engineIds = [],
  hasMods = false,
  hasDependencies = false,
  hasAddons = false,
  hasExecutables = false,
  hasUnassigned = false,
  onApply,
}) {
  document.getElementById("mod-manager-filter-modal")?.remove();
  const overlay = document.createElement("section");
  overlay.id = "mod-manager-filter-modal";
  overlay.className = "mod-manager-filter-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-labelledby", "mod-manager-filter-title");
  const panel = document.createElement("form");
  panel.className = "mod-manager-filter-panel";
  panel.innerHTML = `<div class="mod-manager-filter-heading"><h3 id="mod-manager-filter-title">${t("modManager.filterSort")}</h3><button type="button" class="mod-manager-filter-dismiss" aria-label="${t("modManager.closeFilterSort")}"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button></div><div class="mod-manager-filter-dropdowns"></div><div class="mod-manager-filter-footer"><button type="button" class="mod-manager-filter-reset">${t("common.reset")}</button><button type="submit" class="mod-manager-filter-apply">${t("common.apply")}</button></div>`;

  const selectedFilters = {
    include: new Set(Array.isArray(filters) ? filters : filters.include || []),
    exclude: new Set(Array.isArray(filters) ? [] : filters.exclude || []),
  };
  let selectedSort = sort;
  const typeOptions = [
    ...(hasMods ? [["kind:mod", "common.mods", "fa-layer-group"]] : []),
    ...(hasDependencies ? [["kind:dependency", "modManager.dependencies", "fa-puzzle-piece"]] : []),
    ...(hasAddons ? [["kind:addon", "Addons", "fa-cubes"]] : []),
  ];
  const engineOptions = [
    ...(hasExecutables ? [["executable", "home.executables", "fa-file-code", "assets/icons/exe.png"]] : []),
    ...(hasUnassigned ? [["unassigned", "import.unassigned", "fa-circle-question"]] : []),
    ...engineIds.map((id) => [`engine:${id}`, getEngineLabel(id, ENGINE_DETAILS[id]?.name || id), "fa-microchip", ENGINE_DETAILS[id] ? `assets/icons/${ENGINE_DETAILS[id].icon}` : null]),
  ];
  const controls = panel.querySelector(".mod-manager-filter-dropdowns");
  const typeDropdown = createMultiDropdown(t("modManager.type"), typeOptions, selectedFilters, "No types available");
  const engineDropdown = createMultiDropdown(t("nav.engineManager"), engineOptions, selectedFilters, "No engines available");
  const sortDropdown = createSortDropdown(selectedSort, (value) => (selectedSort = value));
  controls.append(typeDropdown.dropdown, engineDropdown.dropdown, sortDropdown.dropdown);

  const close = () => {
    typeDropdown.destroy();
    engineDropdown.destroy();
    sortDropdown.destroy();
    overlay.remove();
  };
  panel.querySelector(".mod-manager-filter-dismiss").addEventListener("click", close);
  panel.querySelector(".mod-manager-filter-reset").addEventListener("click", () => {
    selectedFilters.include.clear();
    selectedFilters.exclude.clear();
    selectedSort = "added-desc";
    typeDropdown.sync();
    engineDropdown.sync();
    sortDropdown.sync(selectedSort);
  });
  panel.addEventListener("submit", (event) => {
    event.preventDefault();
    onApply({ filters: { include: [...selectedFilters.include], exclude: [...selectedFilters.exclude] }, sort: selectedSort });
    close();
  });
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) close();
  });
  overlay.addEventListener("keydown", (event) => {
    if (event.key === "Escape") close();
  });
  overlay.append(panel);
  document.body.append(overlay);
  requestAnimationFrame(() => overlay.classList.add("show"));
  panel.querySelector(".mod-manager-filter-dismiss").focus();
}
