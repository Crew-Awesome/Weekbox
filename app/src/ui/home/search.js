import { homeGrid } from "./grid/index.js";
import { homeSearchDropdown } from "./searchDropdown.js";

export const homeSearch = {
  timeoutId: null,
  hintIntervalId: null,
  hintTransitionId: null,
  hintIndex: 0,
  hints: [
    "Search mods (e.g. Sonic, Tricky, Indie...)",
    "Paste a GameBanana mod link",
    "Enter a GameBanana mod ID",
  ],

  init() {
    this.destroy();
    const input = document.getElementById("mod-search-input");
    if (!input) return;

    const newInput = input.cloneNode(true);
    input.parentNode.replaceChild(newInput, input);

    newInput.addEventListener("input", (e) => {
      const query = e.target.value.trim().replace(/\s+/g, " ");
      clearTimeout(this.timeoutId);

      this.timeoutId = setTimeout(() => {
        this.executeSearch(query);
      }, 300);
    });

    newInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        clearTimeout(this.timeoutId);
        this.executeSearch(e.target.value.trim());
        homeSearchDropdown.hideDropdown();
        newInput.blur();
      }
    });

    this.startHintRotation(newInput);
  },

  startHintRotation(input) {
    input.placeholder = this.hints[this.hintIndex];
    this.hintIntervalId = setInterval(() => {
      if (input.value || document.activeElement === input) return;
      input.classList.add("search-hint-fading");
      this.hintTransitionId = setTimeout(() => {
        this.hintIndex = (this.hintIndex + 1) % this.hints.length;
        input.placeholder = this.hints[this.hintIndex];
        input.classList.remove("search-hint-fading");
      }, 180);
    }, 3600);
  },

  destroy() {
    clearTimeout(this.timeoutId);
    clearTimeout(this.hintTransitionId);
    clearInterval(this.hintIntervalId);
    this.timeoutId = null;
    this.hintTransitionId = null;
    this.hintIntervalId = null;
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
