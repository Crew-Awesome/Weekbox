import { homeGrid } from "./grid/index.js";
import { homeSearchDropdown } from "./searchDropdown.js";

export const homeSearch = {
  timeoutId: null,
  hintIntervalId: null,
  isHintAnimating: false,
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
      document
        .getElementById("mod-search-hint")
        ?.classList.toggle("is-hidden", Boolean(e.target.value));
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
    const hint = document.getElementById("mod-search-hint");
    if (!hint) return;
    input.placeholder = "";
    hint.textContent = this.hints[this.hintIndex];
    this.hintIntervalId = setInterval(() => {
      this.rotateHint(input, hint);
    }, 3600);
  },

  async rotateHint(input, hint) {
    if (input.value || document.activeElement === input || this.isHintAnimating)
      return;
    this.isHintAnimating = true;
    try {
      const fadeOut = hint.animate(
        [
          { opacity: 1, transform: "translateY(-50%)" },
          { opacity: 0, transform: "translateY(calc(-50% - 3px))" },
        ],
        { duration: 260, easing: "ease-out", fill: "forwards" },
      );
      await fadeOut.finished;
      this.hintIndex = (this.hintIndex + 1) % this.hints.length;
      hint.textContent = this.hints[this.hintIndex];
      const fadeIn = hint.animate(
        [
          { opacity: 0, transform: "translateY(calc(-50% + 3px))" },
          { opacity: 1, transform: "translateY(-50%)" },
        ],
        { duration: 320, easing: "ease-out", fill: "forwards" },
      );
      await fadeIn.finished;
      fadeOut.cancel();
      fadeIn.cancel();
    } finally {
      this.isHintAnimating = false;
    }
  },

  destroy() {
    clearTimeout(this.timeoutId);
    clearInterval(this.hintIntervalId);
    this.timeoutId = null;
    this.hintIntervalId = null;
    this.isHintAnimating = false;
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
