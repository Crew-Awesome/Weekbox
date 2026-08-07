import { gameBananaApi } from "../../../backend/providers/gamebanana/gamebanana.provider.js";
import { homeSearch } from "./search.js";
import { t } from "../i18n/index.js";

export const homeSearchDropdown = {
  recentSearches: [],
  maxRecent: 5,
  fetchTimeout: null,
  suggestionVersion: 0,

  init() {
    this.loadRecent();
    this.input = document.getElementById("mod-search-input");
    this.dropdown = document.getElementById("search-dropdown");
    if (!this.input || !this.dropdown) return;

    this.input.addEventListener("focus", () => this.showDropdown());
    this.input.addEventListener("input", () => this.updateDropdown());

    document.addEventListener("click", (e) => {
      if (!e.target.closest(".search-container")) {
        this.hideDropdown();
      }
    });
  },

  loadRecent() {
    try {
      const saved = localStorage.getItem("weekbox_recent_searches");
      this.recentSearches = saved ? JSON.parse(saved) : [];
    } catch (e) {
      this.recentSearches = [];
    }
  },

  saveRecent(query) {
    if (!query) return;
    this.recentSearches = this.recentSearches.filter(
      (q) => q.toLowerCase() !== query.toLowerCase(),
    );
    this.recentSearches.unshift(query);
    if (this.recentSearches.length > this.maxRecent) this.recentSearches.pop();
    localStorage.setItem(
      "weekbox_recent_searches",
      JSON.stringify(this.recentSearches),
    );
  },

  showDropdown() {
    if (!this.input || !this.dropdown) return;
    this.updateDropdown();
    this.dropdown.style.display = "flex";
  },

  hideDropdown() {
    if (!this.dropdown) return;
    this.dropdown.style.display = "none";
  },

  async updateDropdown() {
    if (!this.input || !this.dropdown) return;
    const suggestionVersion = ++this.suggestionVersion;
    const query = this.input.value.trim().toLowerCase();
    this.dropdown.replaceChildren();

    let filteredRecent = this.recentSearches;
    if (query) {
      filteredRecent = this.recentSearches.filter((q) =>
        q.toLowerCase().includes(query),
      );
    }

    if (filteredRecent.length > 0) {
      this.renderSection(
        t("search.recent"),
        filteredRecent,
        "fa-clock-rotate-left",
        true,
      );
    }

    if (query.length > 2) {
      clearTimeout(this.fetchTimeout);

      const relatedSection = document.createElement("div");
      relatedSection.className = "dropdown-section";
      const relTitle = document.createElement("div");
      relTitle.className = "dropdown-title";
      relTitle.textContent = t("search.related");
      const loadingTpl = document.getElementById("tpl-search-loading-item");
      let loadingItem;
      if (loadingTpl) {
        loadingItem = loadingTpl.content.firstElementChild.cloneNode(true);
      } else {
        loadingItem = document.createElement("div");
        loadingItem.className = "dropdown-item";
        loadingItem.style.cursor = "default";
        const spinIcon = document.createElement("i");
        spinIcon.className = "fa-solid fa-spinner fa-spin";
        const loadingText = document.createTextNode(" " + t("common.loading"));
        loadingItem.append(spinIcon, loadingText);
      }
      relatedSection.append(relTitle, loadingItem);
      this.dropdown.appendChild(relatedSection);

      this.fetchTimeout = setTimeout(async () => {
        const related = await this.fetchRelated(query);
        if (suggestionVersion !== this.suggestionVersion) return;
        if (related.length > 0) {
          relatedSection.replaceChildren();
          const suggestionsTitle = document.createElement("div");
          suggestionsTitle.className = "dropdown-title";
          suggestionsTitle.textContent = t("search.relatedSuggestions");
          relatedSection.appendChild(suggestionsTitle);

          const itemTpl = document.getElementById("tpl-search-item");
          related.forEach((title) => {
            let item;
            if (itemTpl) {
              item = itemTpl.content.firstElementChild.cloneNode(true);
              const iconEl = item.querySelector("i");
              if (iconEl) iconEl.className = "fa-solid fa-magnifying-glass";
              const textSpan = item.querySelector(".search-item-text") || item.querySelector("span");
              if (textSpan) textSpan.textContent = title;
            } else {
              item = document.createElement("div");
              item.className = "dropdown-item";
              const iconEl = document.createElement("i");
              iconEl.className = "fa-solid fa-magnifying-glass";
              const textSpan = document.createElement("span");
              textSpan.textContent = title;
              item.append(iconEl, document.createTextNode(" "), textSpan);
            }
            item.addEventListener("click", () => {
              this.input.value = title;
              this.hideDropdown();
              homeSearch.executeSearch(title);
            });
            relatedSection.appendChild(item);
          });
        } else {
          relatedSection.style.display = "none";
        }
      }, 500);
    }

    if (!this.dropdown.hasChildNodes()) {
      const emptyTpl = document.getElementById("tpl-search-empty-state");
      if (emptyTpl) {
        this.dropdown.appendChild(emptyTpl.content.cloneNode(true));
      } else {
        const emptyItem = document.createElement("div");
        emptyItem.className = "dropdown-item empty-state";
        emptyItem.dataset.i18n = "search.noRecent";
        emptyItem.textContent = t("search.noRecent");
        this.dropdown.appendChild(emptyItem);
      }
    }
  },

  removeRecent(query) {
    this.recentSearches = this.recentSearches.filter(
      (item) => item.toLowerCase() !== query.toLowerCase(),
    );
    localStorage.setItem(
      "weekbox_recent_searches",
      JSON.stringify(this.recentSearches),
    );
    this.updateDropdown();
  },

  renderSection(title, items, icon, removable = false) {
    const section = document.createElement("div");
    section.className = "dropdown-section";
    const titleEl = document.createElement("div");
    titleEl.className = "dropdown-title";
    titleEl.textContent = title;
    section.appendChild(titleEl);

    const itemTpl = document.getElementById("tpl-search-item");
    const removeBtnTpl = document.getElementById("tpl-search-remove-btn");

    items.forEach((text) => {
      let item;
      if (itemTpl) {
        item = itemTpl.content.firstElementChild.cloneNode(true);
        const iconEl = item.querySelector("i");
        if (iconEl) iconEl.className = `fa-solid ${icon}`;
        const textSpan = item.querySelector(".search-item-text") || item.querySelector("span");
        if (textSpan) textSpan.textContent = text;
      } else {
        item = document.createElement("div");
        item.className = "dropdown-item";
        const iconEl = document.createElement("i");
        iconEl.className = `fa-solid ${icon}`;
        const textSpan = document.createElement("span");
        textSpan.textContent = text;
        item.append(iconEl, document.createTextNode(" "), textSpan);
      }

      item.addEventListener("click", () => {
        this.input.value = text;
        this.hideDropdown();
        homeSearch.executeSearch(text);
      });

      if (removable) {
        let removeButton;
        if (removeBtnTpl) {
          removeButton = removeBtnTpl.content.firstElementChild.cloneNode(true);
        } else {
          removeButton = document.createElement("button");
          removeButton.className = "history-remove";
          removeButton.type = "button";
          const xIcon = document.createElement("i");
          xIcon.className = "fa-solid fa-xmark";
          removeButton.appendChild(xIcon);
        }
        removeButton.setAttribute(
          "aria-label",
          t("search.removeFromHistory", { text }),
        );
        removeButton.addEventListener("click", (event) => {
          event.stopPropagation();
          this.removeRecent(text);
        });
        item.appendChild(removeButton);
      }
      section.appendChild(item);
    });

    this.dropdown.appendChild(section);
  },

  async fetchRelated(query) {
    return gameBananaApi.getSearchSuggestions(query);
  },
};
