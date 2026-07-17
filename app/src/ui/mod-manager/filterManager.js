import { ENGINE_DETAILS } from "../../config/engines.js";
import { setupDropdown } from "../../utils/dropdown.js";

export const filterManager = {
  setup(engineFilterElement, onFilterChange) {
    const trigger = engineFilterElement.querySelector(".mod-manager-filter-trigger");
    const menu = engineFilterElement.querySelector(".mod-manager-filter-menu");

    const filterDropdownCtrl = setupDropdown(trigger, engineFilterElement, {
      menuElement: menu,
    });

    menu.addEventListener("click", (event) => {
      const option = event.target.closest("button[data-engine-filter]");
      if (!option) return;
      filterDropdownCtrl?.close();
      onFilterChange(option.dataset.engineFilter);
    });

    return filterDropdownCtrl;
  },

  syncEngineFilterOptions(currentFilter, mods, standaloneMods) {
    const filter = document.getElementById("mod-manager-engine-filter");
    if (!filter) return currentFilter;

    const triggerLabel = filter.querySelector(".mod-manager-filter-label");
    const triggerIcon = filter.querySelector(".mod-manager-filter-icon");
    const menu = filter.querySelector(".mod-manager-filter-menu");

    // FIX: String matching para prevenir fallos en la detección del standalones 
    const standaloneIds = new Set(standaloneMods.map((mod) => String(mod.id)));

    const engineIds = [
      ...new Set(
        mods
          .filter((mod) => !standaloneIds.has(String(mod.id)) && mod.engineId)
          .map((mod) => mod.engineId),
      ),
    ];

    const supportedFilters = new Set(["all", "executable", ...engineIds]);
    if (!supportedFilters.has(currentFilter)) currentFilter = "all";

    const options = [
      { value: "all", label: "All mods", iconClass: "fa-layer-group" },
      ...(standaloneIds.size
        ? [
            {
              value: "executable",
              label: "Executables",
              iconPath: "assets/icons/exe.png",
            },
          ]
        : []),
      ...engineIds.map((engineId) => ({
        value: engineId,
        label: ENGINE_DETAILS[engineId]?.name || engineId,
        iconPath: ENGINE_DETAILS[engineId]
          ? `assets/icons/${ENGINE_DETAILS[engineId].icon}`
          : null,
        iconClass: "fa-microchip",
      })),
    ];

    const selected = options.find((option) => option.value === currentFilter);
    if (triggerLabel) triggerLabel.textContent = selected?.label || "All mods";

    if (triggerIcon) {
      triggerIcon.replaceChildren();
      const icon = selected?.iconPath
        ? Object.assign(document.createElement("img"), {
            src: selected.iconPath,
            alt: "",
          })
        : document.createElement("i");
      if (!selected?.iconPath) {
        icon.className = `fa-solid ${selected?.iconClass || "fa-layer-group"}`;
      }
      triggerIcon.append(icon);
    }

    menu.replaceChildren(
      ...options.map((option) => {
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.engineFilter = option.value;
        button.setAttribute("role", "menuitem");
        button.classList.toggle("selected", option.value === currentFilter);

        const icon = option.iconPath
          ? Object.assign(document.createElement("img"), {
              src: option.iconPath,
              alt: "",
            })
          : document.createElement("i");

        if (!option.iconPath) {
          icon.className = `fa-solid ${option.iconClass || "fa-microchip"}`;
          icon.setAttribute("aria-hidden", "true");
        }

        const label = document.createElement("span");
        label.textContent = option.label;
        button.append(icon, label);

        return button;
      }),
    );

    return currentFilter;
  }
};