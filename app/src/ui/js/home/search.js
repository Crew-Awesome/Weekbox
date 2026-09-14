import { homeGrid } from "./grid/index.js";
import { homeSearchDropdown } from "./searchDropdown.js";
import { t } from "../i18n/index.js";
import { setupDropdown } from "../../utils/components/dropdown.component.js";

export const homeSearch = {
  abortController: null,
  searchType: "mods",
  searchTypeDropdown: null,

  init() {
    this.destroy();
    const input = document.getElementById("mod-search-input");
    const hint = document.getElementById("mod-search-hint");
    if (!input || !hint) return;

    this.abortController = new AbortController();
    const { signal } = this.abortController;

    const picker = document.getElementById("search-type-picker");
    const trigger = document.getElementById("search-type-trigger");
    const options = document.getElementById("search-type-options");
    this.searchTypeDropdown = setupDropdown(trigger, picker, {
      menuElement: options,
      onToggle: (isOpen) => {
        if (isOpen) homeSearchDropdown.hideDropdown();
      },
    });
    trigger?.addEventListener(
      "pointerdown",
      () => homeSearchDropdown.hideDropdown(),
      { signal },
    );
    options?.addEventListener(
      "click",
      (event) => {
        const option = event.target.closest("[data-search-type]");
        if (option) this.setSearchType(option.dataset.searchType);
      },
      { signal },
    );
    input.placeholder = "";

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
    this.syncSearchType(input, hint);
  },

  setSearchType(type) {
    if (!type || !["mods", "users"].includes(type)) return;
    this.searchType = type;
    homeGrid.searchType = type;
    const input = document.getElementById("mod-search-input");
    const hint = document.getElementById("mod-search-hint");
    this.syncSearchType(input, hint);
    this.searchTypeDropdown?.close();
    if (input?.value.trim()) this.executeSearch(input.value);
    else homeSearchDropdown.updateDropdown();
  },

  syncSearchType(input, hint) {
    const label = document.getElementById("search-type-selected");
    const triggerIcon = document.querySelector(
      "#search-type-trigger > i:first-child",
    );
    const options = document.querySelectorAll(
      "#search-type-options [data-search-type]",
    );
    const isUsers = this.searchType === "users";
    if (label) label.textContent = t(isUsers ? "common.users" : "common.mods");
    if (triggerIcon)
      triggerIcon.className = isUsers
        ? "fa-solid fa-user"
        : "fa-solid fa-puzzle-piece";
    options.forEach((option) => {
      const selected = option.dataset.searchType === this.searchType;
      option.classList.toggle("selected", selected);
      option.setAttribute("aria-selected", String(selected));
    });
    if (input) {
      input.placeholder = "";
      input.setAttribute(
        "aria-label",
        t(isUsers ? "home.searchGameBananaUsers" : "home.searchGameBanana"),
      );
    }
    if (hint)
      hint.textContent = t(
        isUsers ? "home.searchUsersHint" : "home.searchHint",
      );
    if (input && hint) this.updateHintVisibility(input, hint);
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
    this.searchTypeDropdown?.destroy();
    this.searchTypeDropdown = null;
  },

  async executeSearch(query) {
    query = query.trim().replace(/\s+/g, " ");
    const carousel = document.getElementById("featured-carousel");
    const sectionTitle = document.getElementById("grid-section-title");
    const filters = document.getElementById("grid-filters");
    const input = document.getElementById("mod-search-input");
    const hint = document.getElementById("mod-search-hint");

    homeGrid.isSearchMode = query.length > 0;
    homeGrid.searchQuery = query;
    homeGrid.currentPage = 1;
    if (input && hint) this.updateHintVisibility(input, hint);

    if (query.length > 0) {
      homeSearchDropdown.saveRecent(query);
      if (carousel) carousel.style.display = "none";
      if (filters) filters.style.display = "none";
      if (sectionTitle)
        sectionTitle.textContent = t("home.resultsFor", { query });
    } else {
      if (carousel) carousel.style.display = "flex";
      if (filters) filters.style.display = "flex";
      if (sectionTitle) sectionTitle.textContent = t("common.mods");
    }
    await homeGrid.renderGrid(true);
  },
};
