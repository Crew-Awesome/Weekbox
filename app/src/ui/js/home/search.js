import { homeGrid } from "./grid/index.js";
import { homeSearchDropdown } from "./searchDropdown.js";

export const homeSearch = {
  abortController: null,

  init() {
    this.destroy();
    const input = document.getElementById("mod-search-input");
    const hint = document.getElementById("mod-search-hint");
    if (!input || !hint) return;

    this.abortController = new AbortController();
    const { signal } = this.abortController;
    input.placeholder = "";
    hint.textContent =
      "Search mods, paste a GameBanana link, or enter a mod ID";

    input.addEventListener(
      "focus",
      () => {
        this.updateHintVisibility(input, hint);
      },
      { signal },
    );

    input.addEventListener(
      "blur",
      () => {
        this.updateHintVisibility(input, hint);
      },
      { signal },
    );

    input.addEventListener(
      "input",
      () => {
        this.updateHintVisibility(input, hint);
      },
      { signal },
    );

    input.addEventListener(
      "keydown",
      (event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        this.executeSearch(input.value.trim());
        homeSearchDropdown.hideDropdown();
        input.blur();
      },
      { signal },
    );

    this.updateHintVisibility(input, hint);
  },

  shouldShowHint(input) {
    return !input.value && document.activeElement !== input;
  },

  updateHintVisibility(input, hint) {
    hint.classList.toggle("is-hidden", !this.shouldShowHint(input));
  },

  destroy() {
    this.abortController?.abort();
    this.abortController = null;
  },

  async executeSearch(query) {
    query = query.trim().replace(/\s+/g, " ");
    const carousel = document.getElementById("featured-carousel");
    const sectionTitle = document.getElementById("grid-section-title");
    const filters = document.getElementById("grid-filters");

    homeGrid.isSearchMode = query.length > 0;
    homeGrid.searchQuery = query;
    homeGrid.currentPage = 1;

    if (query.length > 0) {
      homeSearchDropdown.saveRecent(query);
      if (carousel) carousel.style.display = "none";
      if (filters) filters.style.display = "none";
      if (sectionTitle) sectionTitle.textContent = `Results for "${query}"`;
    } else {
      if (carousel) carousel.style.display = "flex";
      if (filters) filters.style.display = "flex";
      if (sectionTitle) sectionTitle.textContent = "Mods";
    }
    await homeGrid.renderGrid(true);
  },
};
