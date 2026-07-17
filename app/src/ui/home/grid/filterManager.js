import { gridState } from "./gridState.js";
import { gridRender } from "./gridRender.js";
import { setupDropdown } from "../../../utils/dropdown.js";

export const filterManager = {
  filterClickHandler: null,
  filterContainer: null,
  engineDropdownCtrl: null,
  sortDropdownCtrl: null,

  setup() {
    this.remove();

    const engineDropdown = document.getElementById("engine-filter-dropdown");
    const engineTrigger = document.getElementById("engine-filter-trigger");
    const sortDropdown = document.getElementById("sort-filter-dropdown");
    const sortTrigger = document.getElementById("sort-filter-trigger");

    this.engineDropdownCtrl = setupDropdown(engineTrigger, engineDropdown);
    this.sortDropdownCtrl = setupDropdown(sortTrigger, sortDropdown);

    const filters = document.getElementById("grid-filters");
    if (!filters) return;
    this.filterContainer = filters;

    this.filterClickHandler = (event) => {
      const option = event.target.closest("#engine-filter-options .custom-option");
      if (option) this.selectCategoryFilter(option);

      const sortOption = event.target.closest("#sort-filter-options .custom-option");
      if (sortOption) this.selectSortFilter(sortOption);
    };

    filters.addEventListener("click", this.filterClickHandler);

    this.syncCategoryFilter();
    this.syncSortFilter();
  },

  selectSortFilter(option) {
    const filter = option.dataset.filter;
    if (!filter) return;
    if (filter === gridState.currentFilter) {
      this.sortDropdownCtrl?.close();
      return;
    }
    gridState.currentFilter = filter;
    this.syncSortFilter();
    this.sortDropdownCtrl?.close();
    gridRender.renderGrid(true);
  },

  selectCategoryFilter(option) {
    const value = option.dataset.categoryId;
    const categoryId = value ? Number(value) : null;
    if (categoryId === gridState.currentCategoryId) {
      this.engineDropdownCtrl?.close();
      return;
    }
    gridState.currentCategoryId = categoryId;
    this.syncCategoryFilter();
    this.engineDropdownCtrl?.close();
    gridRender.renderGrid(true);
  },

  syncCategoryFilter() {
    const selectedText = document.getElementById("engine-filter-selected");
    const selectedIcon = document.getElementById("engine-filter-icon");
    const options = [...document.querySelectorAll("#engine-filter-options .custom-option")];
    
    const selectedOption = options.find((option) => {
      const value = option.dataset.categoryId;
      return (value ? Number(value) : null) === gridState.currentCategoryId;
    }) || options[0];

    if (!selectedOption) return;

    options.forEach((option) => {
      const isSelected = option === selectedOption;
      option.classList.toggle("selected", isSelected);
      option.setAttribute("aria-selected", String(isSelected));
    });

    if (selectedText) selectedText.textContent = selectedOption.dataset.label;
    if (selectedIcon) {
      const icon = selectedOption.querySelector(".filter-engine-icon");
      selectedIcon.replaceChildren(...[...icon.childNodes].map((node) => node.cloneNode(true)));
    }
  },

  syncSortFilter() {
    const selectedText = document.getElementById("sort-filter-selected");
    const options = [...document.querySelectorAll("#sort-filter-options .custom-option")];
    const selectedOption = options.find((option) => option.dataset.filter === gridState.currentFilter) || options[0];

    if (!selectedOption) return;

    options.forEach((option) => {
      const isSelected = option === selectedOption;
      option.classList.toggle("selected", isSelected);
      option.setAttribute("aria-selected", String(isSelected));
    });

    if (selectedText) selectedText.textContent = selectedOption.dataset.label;
  },

  remove() {
    this.engineDropdownCtrl?.destroy();
    this.sortDropdownCtrl?.destroy();
    this.filterContainer?.removeEventListener("click", this.filterClickHandler);
    this.filterContainer = null;
    this.filterClickHandler = null;
  }
};