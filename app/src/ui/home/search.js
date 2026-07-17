import { homeGrid } from "./grid/index.js";
import { homeSearchDropdown } from "./searchDropdown.js";

export const homeSearch = {
  timeoutId: null,
  hintTimeoutId: null,
  currentHintAnimation: null,
  abortController: null,
  hintIndex: 0,
  hints: [
    "Search mods (e.g. Sonic, Tricky, Indie...)",
    "Paste a GameBanana mod link",
    "Enter a GameBanana mod ID",
  ],

  init() {
    this.destroy();
    const input = document.getElementById("mod-search-input");
    const hint = document.getElementById("mod-search-hint");
    if (!input || !hint) return;

    this.abortController = new AbortController();
    const { signal } = this.abortController;
    input.placeholder = "";
    hint.textContent = this.hints[this.hintIndex];

    input.addEventListener(
      "focus",
      () => {
        this.cancelHintRotation();
        this.updateHintVisibility(input, hint);
      },
      { signal },
    );

    input.addEventListener(
      "blur",
      () => {
        this.updateHintVisibility(input, hint);
        this.scheduleHintRotation(input, hint);
      },
      { signal },
    );

    input.addEventListener(
      "input",
      (event) => {
        const query = event.target.value.trim().replace(/\s+/g, " ");
        this.cancelHintRotation();
        this.updateHintVisibility(input, hint);

        clearTimeout(this.timeoutId);
        this.timeoutId = setTimeout(() => this.executeSearch(query), 300);
      },
      { signal },
    );

    input.addEventListener(
      "keydown",
      (event) => {
        if (event.key !== "Enter") return;
        clearTimeout(this.timeoutId);
        this.executeSearch(input.value.trim());
        homeSearchDropdown.hideDropdown();
        input.blur();
      },
      { signal },
    );

    this.updateHintVisibility(input, hint);
    this.scheduleHintRotation(input, hint);
  },

  canRotateHint(input) {
    return !input.value && document.activeElement !== input;
  },

  updateHintVisibility(input, hint) {
    hint.classList.toggle("is-hidden", !this.canRotateHint(input));
  },

  scheduleHintRotation(input, hint) {
    this.cancelHintRotation();
    if (!this.canRotateHint(input)) return;
    this.hintTimeoutId = setTimeout(() => {
      this.rotateHint(input, hint);
    }, 3600);
  },

  async rotateHint(input, hint) {
    if (!this.canRotateHint(input)) return;

    try {
      this.currentHintAnimation = hint.animate(
        [
          { opacity: 1, transform: "translateY(-50%)" },
          { opacity: 0, transform: "translateY(calc(-50% - 5px))" },
        ],
        { duration: 180, easing: "ease-in", fill: "forwards" },
      );
      await this.currentHintAnimation.finished;

      if (this.canRotateHint(input)) {
        this.hintIndex = (this.hintIndex + 1) % this.hints.length;
        hint.textContent = this.hints[this.hintIndex];
      }
      if (!this.canRotateHint(input)) return;

      this.currentHintAnimation = hint.animate(
        [
          { opacity: 0, transform: "translateY(calc(-50% + 5px))" },
          { opacity: 1, transform: "translateY(-50%)" },
        ],
        { duration: 240, easing: "ease-out", fill: "forwards" },
      );
      await this.currentHintAnimation.finished;
    } catch {
      // The input was focused or edited while the hint was changing.
    } finally {
      this.currentHintAnimation?.cancel();
      this.currentHintAnimation = null;
      this.scheduleHintRotation(input, hint);
    }
  },

  cancelHintRotation() {
    clearTimeout(this.hintTimeoutId);
    this.hintTimeoutId = null;
    this.currentHintAnimation?.cancel();
    this.currentHintAnimation = null;
  },

  destroy() {
    clearTimeout(this.timeoutId);
    this.cancelHintRotation();
    this.abortController?.abort();
    this.timeoutId = null;
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
