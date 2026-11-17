import { gridState } from "./gridState.js";
import { gridRender } from "./gridRender.js";
import { setupDropdown } from "../../../utils/components/dropdown.component.js";
import { t } from "../../i18n/index.js";
import { BACKSTAGE_CATEGORIES, BACKSTAGE_ENGINES } from "../../../../backend/providers/backstage/backstage.provider.js";
import { backstageFilters } from "./backstageFilters.js";
import { gameJoltFilters } from "./gamejoltFilters.js";
import { GAMEJOLT_SECTIONS } from "../../../../backend/providers/gamejolt/gamejolt.provider.js";

const labelKeys = {
  "All engines": "home.allEngines", "Base Game": "home.baseGame", "Psych Engine": "home.psychEngine",
  "Codename Engine": "home.codenameEngine", Executables: "home.executables", "P-Slice": "home.pSlice",
  "FPS Plus": "home.fpsPlus", "Psych Online": "home.psychOnline", Ripe: "home.ripe", Discovery: "home.discovery",
  New: "home.newest", Updated: "home.updated", "Other/Misc": "home.otherMisc",
};

const backstageSorts = [
  ["activity", "Recently Active"], ["downloads", "Most Downloaded"], ["likes", "Most Liked"],
  ["views", "Most Viewed"], ["added", "Recently Added"], ["stars", "Most Starred"],
];
const peoSorts = [
  ["newest", "Newest Submitted"], ["oldest", "Oldest Submitted"], ["az", "A–Z"], ["za", "Z–A"],
  ["liked", "Most Liked"], ["leastLiked", "Least Liked"], ["downloaded", "Most Downloaded"],
  ["leastDownloaded", "Least Downloaded"],
];

function option(label, value, attribute = "filter") {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "custom-option";
  button.dataset[attribute] = value;
  button.dataset.label = label;
  button.setAttribute("role", "option");
  button.setAttribute("aria-selected", "false");
  if (attribute === "engine") {
    const icon = document.createElement("span");
    icon.className = "filter-engine-icon";
    const iconFiles = { "base-game": "vslice", "codename-engine": "codename", "psych-engine": "psych", "kade-engine": "kade", "fps-plus": "fpsplus" };
    if (iconFiles[value]) {
      const image = document.createElement("img");
      image.src = `assets/icons/${iconFiles[value]}.png`;
      image.alt = "";
      icon.append(image);
    } else {
      const glyph = document.createElement("i");
      glyph.className = "fa-solid fa-layer-group";
      glyph.setAttribute("aria-hidden", "true");
      icon.append(glyph);
    }
    button.append(icon);
  }
  const text = document.createElement("span");
  text.textContent = label;
  button.appendChild(text);
  return button;
}

export const filterManager = {
  filterClickHandler: null, filterContainer: null, engineDropdownCtrl: null, sortDropdownCtrl: null,
  categoryDropdownCtrl: null, localeChangeHandler: null, reverseClickHandler: null,
  originalEngineOptions: "", originalSortOptions: "", activeService: null,

  setup() {
    this.remove();
    const engineDropdown = document.getElementById("engine-filter-dropdown");
    const sortDropdown = document.getElementById("sort-filter-dropdown");
    this.engineDropdownCtrl = setupDropdown(document.getElementById("engine-filter-trigger"), engineDropdown);
    this.sortDropdownCtrl = setupDropdown(document.getElementById("sort-filter-trigger"), sortDropdown);
    const categoryDropdown = document.getElementById("backstage-category-dropdown");
    this.categoryDropdownCtrl = setupDropdown(document.getElementById("backstage-category-trigger"), categoryDropdown, {
      menuElement: document.getElementById("backstage-category-options"),
    });
    const filters = document.getElementById("grid-filters");
    if (!filters) return;
    this.filterContainer = filters;
    if (!this.originalEngineOptions) this.originalEngineOptions = document.getElementById("engine-filter-options")?.innerHTML || "";
    if (!this.originalSortOptions) this.originalSortOptions = document.getElementById("sort-filter-options")?.innerHTML || "";
    this.localeChangeHandler = () => { this.syncCategoryFilter(); this.syncSortFilter(); };
    document.addEventListener("locale-changed", this.localeChangeHandler);
    this.filterClickHandler = (event) => {
      const option = event.target.closest("#engine-filter-options .custom-option");
      if (option) this.selectEngine(option);
      const category = event.target.closest("#backstage-category-options .custom-option");
      if (category) this.selectBackstageCategory(category);
      const sortOption = event.target.closest("#sort-filter-options .custom-option");
      if (sortOption) this.selectSortFilter(sortOption);
    };
    filters.addEventListener("click", this.filterClickHandler);
    const reverse = document.getElementById("backstage-reverse-sort");
    this.reverseClickHandler = () => {
      gridState.backstageReverse = !gridState.backstageReverse;
      reverse?.setAttribute("aria-pressed", String(gridState.backstageReverse));
      reverse?.classList.toggle("selected", gridState.backstageReverse);
      gridRender.renderGrid(true);
    };
    reverse?.addEventListener("click", this.reverseClickHandler);
    this.setService(gridState.isBookmarksMode ? "gamebanana" : gridState.service);
    backstageFilters.setup();
    gameJoltFilters.setup();
  },

  setService(service) {
    this.engineDropdownCtrl?.close();
    this.sortDropdownCtrl?.close();
    this.categoryDropdownCtrl?.close();
    if (!this.originalEngineOptions) this.originalEngineOptions = document.getElementById("engine-filter-options")?.innerHTML || "";
    if (!this.originalSortOptions) this.originalSortOptions = document.getElementById("sort-filter-options")?.innerHTML || "";
    if (this.activeService !== service) {
      if (this.activeService) gridState.serviceSorts[this.activeService] = gridState.currentFilter;
      this.activeService = service;
      gridState.currentFilter = gridState.serviceSorts[service] || ({ psychonline: "newest", backstage: "activity", gamejolt: "hot", gamebanana: "popular" }[service]);
    }
    const engineDropdown = document.getElementById("engine-filter-dropdown");
    const categoryDropdown = document.getElementById("backstage-category-dropdown");
    const categoryOptions = document.getElementById("backstage-category-options");
    const sortOptions = document.getElementById("sort-filter-options");
    const reverse = document.getElementById("backstage-reverse-sort");
    const sortDropdown = document.getElementById("sort-filter-dropdown");
    const filterButton = document.getElementById("backstage-filters-button");
    const gameJoltFilterButton = document.getElementById("gamejolt-filters-button");
    if (!engineDropdown || !sortOptions) return;
    if (service === "psychonline") {
      engineDropdown.hidden = true;
      categoryDropdown.hidden = true;
      reverse.hidden = true;
      sortDropdown.hidden = false;
      filterButton.hidden = true;
      gameJoltFilterButton.hidden = true;
      sortOptions.replaceChildren(...peoSorts.map(([key, label]) => option(label, key)));
    } else if (service === "backstage") {
      engineDropdown.hidden = false;
      categoryDropdown.hidden = true;
      reverse.hidden = true;
      sortDropdown.hidden = true;
      filterButton.hidden = false;
      gameJoltFilterButton.hidden = true;
      const engineOptions = document.getElementById("engine-filter-options");
      engineOptions.replaceChildren(option("All engines", "", "engine"));
      for (const [id, label] of BACKSTAGE_ENGINES) engineOptions.append(option(label, id, "engine"));
      categoryOptions.replaceChildren(option("All categories", "", "category"));
      for (const [id, label] of BACKSTAGE_CATEGORIES) categoryOptions.append(option(label, id, "category"));
      sortOptions.replaceChildren(...backstageSorts.map(([key, label]) => option(label, key)));
    } else if (service === "gamejolt") {
      engineDropdown.hidden = true;
      categoryDropdown.hidden = true;
      reverse.hidden = true;
      sortDropdown.hidden = false;
      filterButton.hidden = true;
      gameJoltFilterButton.hidden = false;
      sortOptions.replaceChildren(...GAMEJOLT_SECTIONS.map(([key, label]) => option(label, key)));
    } else {
      engineDropdown.hidden = false;
      categoryDropdown.hidden = true;
      reverse.hidden = true;
      sortDropdown.hidden = false;
      filterButton.hidden = true;
      gameJoltFilterButton.hidden = true;
      document.getElementById("engine-filter-options").innerHTML = this.originalEngineOptions;
      sortOptions.innerHTML = this.originalSortOptions;
    }
    this.syncCategoryFilter();
    this.syncSortFilter();
    backstageFilters.syncIndicator();
    gameJoltFilters.syncIndicator();
  },

  selectSortFilter(optionElement) {
    if (gridState.isBookmarksMode) return;
    const filter = optionElement.dataset.filter;
    if (!filter || filter === gridState.currentFilter) { this.sortDropdownCtrl?.close(); return; }
    gridState.currentFilter = filter;
    this.syncSortFilter();
    this.sortDropdownCtrl?.close();
    gridRender.renderGrid(true);
  },

  selectEngine(optionElement) {
    const service = gridState.service;
    if (service === "backstage") {
      const value = optionElement.dataset.engine || "";
      if (value === gridState.backstageEngine) return this.engineDropdownCtrl?.close();
      gridState.backstageEngine = value;
    } else {
      const value = optionElement.dataset.categoryId;
      const categoryId = value ? Number(value) : null;
      if (categoryId === gridState.currentCategoryId) return this.engineDropdownCtrl?.close();
      gridState.currentCategoryId = categoryId;
    }
    this.syncCategoryFilter();
    this.engineDropdownCtrl?.close();
    if (gridState.isBookmarksMode) document.dispatchEvent(new CustomEvent("home-bookmark-filter-changed"));
    else gridRender.renderGrid(true);
  },

  selectBackstageCategory(optionElement) {
    const category = optionElement.dataset.category || "";
    if (category === gridState.backstageCategory) return this.categoryDropdownCtrl?.close();
    gridState.backstageCategory = category;
    this.syncCategoryFilter();
    this.categoryDropdownCtrl?.close();
    gridRender.renderGrid(true);
  },

  syncCategoryFilter() {
    const service = gridState.service;
    const options = [...document.querySelectorAll("#engine-filter-options .custom-option")];
    const selectedOption = service === "backstage"
      ? options.find((item) => (item.dataset.engine || "") === gridState.backstageEngine)
      : options.find((item) => { const value = item.dataset.categoryId; return (value ? Number(value) : null) === gridState.currentCategoryId; });
    this.markSelected(options, selectedOption);
    const selectedText = document.getElementById("engine-filter-selected");
    const selectedIcon = document.getElementById("engine-filter-icon");
    if (selectedText && selectedOption) selectedText.textContent = selectedOption.dataset.label || selectedOption.textContent.trim();
    if (selectedIcon && selectedOption) selectedIcon.replaceChildren(...[...selectedOption.querySelector(".filter-engine-icon")?.childNodes || []].map((node) => node.cloneNode(true)));
    const catOptions = [...document.querySelectorAll("#backstage-category-options .custom-option")];
    const catSelected = catOptions.find((item) => (item.dataset.category || "") === gridState.backstageCategory);
    this.markSelected(catOptions, catSelected);
    const categoryText = document.getElementById("backstage-category-selected");
    if (categoryText && catSelected) categoryText.textContent = catSelected.dataset.label || catSelected.textContent.trim();
  },

  syncSortFilter() {
    const options = [...document.querySelectorAll("#sort-filter-options .custom-option")];
    const selectedOption = options.find((item) => item.dataset.filter === gridState.currentFilter) || options[0];
    this.markSelected(options, selectedOption);
    const selectedText = document.getElementById("sort-filter-selected");
    if (selectedText && selectedOption) {
      const labelKey = labelKeys[selectedOption.dataset.label];
      selectedText.textContent = labelKey ? t(labelKey) : selectedOption.dataset.label;
    }
  },

  markSelected(options, selectedOption) {
    options.forEach((item) => {
      const selected = item === selectedOption;
      item.classList.toggle("selected", selected);
      item.setAttribute("aria-selected", String(selected));
    });
  },

  remove() {
    this.engineDropdownCtrl?.destroy(); this.sortDropdownCtrl?.destroy(); this.categoryDropdownCtrl?.destroy();
    backstageFilters.controller?.abort();
    gameJoltFilters.controller?.abort();
    this.filterContainer?.removeEventListener("click", this.filterClickHandler);
    document.getElementById("backstage-reverse-sort")?.removeEventListener("click", this.reverseClickHandler);
    if (this.localeChangeHandler) document.removeEventListener("locale-changed", this.localeChangeHandler);
    this.filterContainer = null; this.filterClickHandler = null; this.localeChangeHandler = null;
  },
};
