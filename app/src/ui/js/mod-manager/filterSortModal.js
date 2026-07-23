import { setupDropdown } from "../../../utils/dropdown.js";
import { ENGINE_DETAILS } from "../../../backend/config/engines.js";

const BASE_TYPE_OPTIONS = [
  ["all", "All mods", "fa-layer-group"],
  ["executable", "Executables", "fa-file-code", "assets/icons/exe.png"],
];

function getTypeOptions(engineIds) {
  return [
    ...BASE_TYPE_OPTIONS,
    ...engineIds.map((engineId) => [
      `engine:${engineId}`,
      ENGINE_DETAILS[engineId]?.name || engineId,
      "fa-microchip",
      ENGINE_DETAILS[engineId]
        ? `assets/icons/${ENGINE_DETAILS[engineId].icon}`
        : null,
    ]),
    ["unassigned", "Unassigned", "fa-circle-question"],
  ];
}

const SORT_OPTIONS = [
  ["added-desc", "Last added", "fa-clock"],
  ["added-asc", "First added", "fa-clock-rotate-left"],
  ["name-asc", "Name: A-Z", "fa-arrow-down-a-z"],
  ["name-desc", "Name: Z-A", "fa-arrow-down-z-a"],
  ["engine-asc", "Engine: A-Z", "fa-microchip"],
  ["engine-desc", "Engine: Z-A", "fa-microchip"],
];

function createIcon(iconClass, iconPath) {
  if (iconPath) {
    return Object.assign(document.createElement("img"), {
      src: iconPath,
      alt: "",
    });
  }
  const icon = document.createElement("i");
  icon.className = `fa-solid ${iconClass || "fa-filter"}`;
  icon.setAttribute("aria-hidden", "true");
  return icon;
}

function createDropdown({ label, options, selected, onSelect }) {
  const dropdown = document.createElement("div");
  dropdown.className = "mod-manager-modal-dropdown";

  const labelElement = document.createElement("span");
  labelElement.className = "mod-manager-modal-dropdown-label";
  labelElement.textContent = label;

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "mod-manager-modal-dropdown-trigger";
  trigger.setAttribute("aria-expanded", "false");
  trigger.innerHTML = `<span data-selected-icon></span><span class="mod-manager-dropdown-value"></span><i class="fa-solid fa-chevron-down" aria-hidden="true"></i>`;

  const menu = document.createElement("div");
  menu.className = "mod-manager-modal-dropdown-menu";
  menu.setAttribute("role", "listbox");
  menu.hidden = true;

  const sync = (value) => {
    const selectedOption = options.find(
      ([optionValue]) => optionValue === value,
    );
    trigger.querySelector(".mod-manager-dropdown-value").textContent =
      selectedOption?.[1] || "";
    trigger
      .querySelector("[data-selected-icon]")
      .replaceChildren(createIcon(selectedOption?.[2], selectedOption?.[3]));
    menu.querySelectorAll("button").forEach((button) => {
      const isSelected = button.dataset.value === value;
      button.classList.toggle("selected", isSelected);
      button.setAttribute("aria-selected", String(isSelected));
    });
  };

  const dropdownCtrl = setupDropdown(trigger, dropdown, { menuElement: menu });
  options.forEach(([value, optionLabel, iconClass, iconPath]) => {
    const option = document.createElement("button");
    option.type = "button";
    option.dataset.value = value;
    option.setAttribute("role", "option");
    option.append(
      createIcon(iconClass, iconPath),
      document.createElement("span"),
    );
    option.querySelector("span").textContent = optionLabel;
    option.addEventListener("click", () => {
      sync(value);
      onSelect(value);
      dropdownCtrl.close();
    });
    menu.append(option);
  });
  sync(selected);
  dropdown.append(labelElement, trigger, menu);
  return { dropdown, sync, destroy: dropdownCtrl.destroy };
}

export function openFilterSortModal({ filter, sort, engineIds = [], onApply }) {
  document.getElementById("mod-manager-filter-modal")?.remove();

  const overlay = document.createElement("section");
  overlay.id = "mod-manager-filter-modal";
  overlay.className = "mod-manager-filter-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-labelledby", "mod-manager-filter-title");

  const panel = document.createElement("form");
  panel.className = "mod-manager-filter-panel";
  panel.innerHTML = `
    <div class="mod-manager-filter-heading">
      <h3 id="mod-manager-filter-title">Filter and sort</h3>
      <button type="button" class="mod-manager-filter-dismiss" aria-label="Close filter and sort"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
    </div>
    <div class="mod-manager-filter-dropdowns"></div>
    <div class="mod-manager-filter-footer">
      <button type="button" class="mod-manager-filter-reset">Reset</button>
      <button type="submit" class="mod-manager-filter-apply">Apply</button>
    </div>`;

  let selectedFilter = filter;
  let selectedSort = sort;
  const controls = panel.querySelector(".mod-manager-filter-dropdowns");
  const typeDropdown = createDropdown({
    label: "Type",
    options: getTypeOptions(engineIds),
    selected: filter,
    onSelect: (value) => (selectedFilter = value),
  });
  const sortDropdown = createDropdown({
    label: "Sort by",
    options: SORT_OPTIONS,
    selected: sort,
    onSelect: (value) => (selectedSort = value),
  });
  controls.append(typeDropdown.dropdown, sortDropdown.dropdown);

  const close = () => {
    typeDropdown.destroy();
    sortDropdown.destroy();
    overlay.remove();
  };
  panel
    .querySelector(".mod-manager-filter-dismiss")
    .addEventListener("click", close);
  panel
    .querySelector(".mod-manager-filter-reset")
    .addEventListener("click", () => {
      selectedFilter = "all";
      selectedSort = "added-desc";
      typeDropdown.sync(selectedFilter);
      sortDropdown.sync(selectedSort);
    });
  panel.addEventListener("submit", (event) => {
    event.preventDefault();
    onApply({ filter: selectedFilter, sort: selectedSort });
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
