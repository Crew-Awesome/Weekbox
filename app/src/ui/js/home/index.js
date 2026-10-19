import { appEvents } from "../../../backend/core/routing/events.service.js";
import { homeCarousel } from "./carousel.js";
import { homeGrid } from "./grid/index.js";
import { homeSearch } from "./search.js";
import { homeSearchDropdown } from "./searchDropdown.js";
import { homeScroll } from "./homeScroll.js";
import { networkStatus } from "../../../backend/core/system/network-status.service.js";
import { i18n, t } from "../i18n/index.js";
import { modBookmarks } from "../../../backend/core/state/mod-bookmarks.service.js";
import { createCard } from "./grid/cardBuilder.js";
import { gridRender } from "./grid/gridRender.js";
import { filterManager } from "./grid/filterManager.js";

const BOOKMARK_ENGINE_BY_CATEGORY = {
  29202: "vslice",
  28367: "psych",
  34764: "codename",
  3827: "executable",
  43798: "pslice",
  43850: "fpsplus",
  43788: "psychonline",
};
const BOOKMARK_ENGINE_IDS = new Set(Object.values(BOOKMARK_ENGINE_BY_CATEGORY));

export const homeView = {
  hasVisited: false,
  ready: Promise.resolve(),
  mode: "mods",
  bookmarkQuery: "",
  switcherController: null,
  bookmarkUpdatedListener: null,
  bookmarkFilterListener: null,

  async init() {
    if (!networkStatus.online) {
      this.renderOffline();
      this.hasVisited = true;
      return;
    }

    homeScroll.init();

    this.mode = "mods";
    this.bookmarkQuery = "";
    homeGrid.isBookmarksMode = false;
    homeSearch.init();
    homeSearchDropdown.init();
    homeSearch.mode = "mods";
    homeSearch.onBookmarkSearch = (query) => this.searchBookmarks(query);
    this.bookmarkFilterListener = () => {
      if (this.mode === "bookmarks") this.renderBookmarks();
    };
    document.addEventListener(
      "home-bookmark-filter-changed",
      this.bookmarkFilterListener,
    );
    this.bindModeSwitcher();
    this.updateModeUi();
    await Promise.all([
      homeCarousel.init(),
      homeGrid.init({ prefetchNextPage: !this.hasVisited }),
    ]);
    if (!networkStatus.online) {
      homeScroll.destroy();
      homeGrid.destroy();
      this.renderOffline();
      return;
    }
    this.bookmarkUpdatedListener = () => {
      if (this.mode === "bookmarks") this.renderBookmarks();
    };
    document.addEventListener(
      "mod-bookmarks-updated",
      this.bookmarkUpdatedListener,
    );
    this.hasVisited = true;
  },

  bindModeSwitcher() {
    this.switcherController?.abort();
    this.switcherController = new AbortController();
    document
      .querySelector("[data-home-mode-switcher]")
      ?.addEventListener(
        "click",
        (event) => {
          const button = event.target.closest("[data-home-mode]");
          if (button) void this.setMode(button.dataset.homeMode);
        },
        { signal: this.switcherController.signal },
      );
  },

  updateModeUi() {
    const isBookmarks = this.mode === "bookmarks";
    document.querySelectorAll("[data-home-mode]").forEach((button) => {
      const selected = button.dataset.homeMode === this.mode;
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-selected", String(selected));
    });
    document.getElementById("featured-carousel")?.toggleAttribute("hidden", isBookmarks);
    document.getElementById("grid-filters")?.removeAttribute("hidden");
    document.getElementById("sort-filter-dropdown")?.toggleAttribute("hidden", isBookmarks);
    document.getElementById("search-type-picker")?.toggleAttribute("hidden", isBookmarks);
    const title = document.getElementById("grid-section-title");
    if (title) title.textContent = isBookmarks ? t("home.bookmarks") : t("common.mods");
  },

  async setMode(mode) {
    if (!['mods', 'bookmarks'].includes(mode) || mode === this.mode) return;
    this.mode = mode;
    this.bookmarkQuery = "";
    const input = document.getElementById("mod-search-input");
    if (input) input.value = "";
    homeSearchDropdown.hideDropdown();
    homeSearch.setMode(mode);
    this.updateModeUi();
    if (mode === "bookmarks") {
      homeGrid.isBookmarksMode = true;
      homeGrid.currentCategoryId = null;
      homeGrid.destroy();
      filterManager.setup();
      this.renderBookmarks();
    } else {
      homeGrid.isBookmarksMode = false;
      homeGrid.searchQuery = "";
      homeGrid.isSearchMode = false;
      await homeGrid.init({ prefetchNextPage: false });
    }
  },

  searchBookmarks(query) {
    this.bookmarkQuery = query;
    this.renderBookmarks();
  },

  renderBookmarks() {
    const grid = document.getElementById("popular-grid");
    const empty = document.getElementById("home-bookmarks-empty");
    if (!grid) return;
    gridRender.ensureEngineTooltip(grid);
    const query = this.bookmarkQuery.toLowerCase();
    const categoryId = homeGrid.currentCategoryId;
    const selectedEngine = BOOKMARK_ENGINE_BY_CATEGORY[categoryId];
    const bookmarks = modBookmarks
      .getAll()
      .filter((bookmark) => {
        if (categoryId === null || categoryId === undefined) return true;
        if (categoryId === 43773)
          return !BOOKMARK_ENGINE_IDS.has(bookmark.engineId);
        return bookmark.engineId === selectedEngine;
      })
      .filter((bookmark) =>
        `${bookmark.title} ${bookmark.author}`.toLowerCase().includes(query),
      )
      .map((bookmark) => ({
        ...bookmark,
        id: bookmark.source === "peo" ? bookmark.id : Number(bookmark.id),
        source: bookmark.source === "peo" ? "peo" : "gamebanana",
        image: bookmark.image || "assets/img/placeholder-mini.jpg",
        author: bookmark.author || "",
        timeAgo: bookmark.timeAgo || "",
      }));
    grid.replaceChildren(...bookmarks.map((bookmark, index) => createCard(bookmark, index)));
    grid.classList.toggle("grid-empty", bookmarks.length === 0);
    if (empty) {
      empty.hidden = bookmarks.length !== 0 || Boolean(query);
      if (query && !bookmarks.length) grid.textContent = t("home.noModsFound");
    }
  },

  renderOffline() {
    const container = document.querySelector(".home-container");
    if (!container) return;
    container.replaceChildren();
    const tpl = document.getElementById("tpl-home-offline-panel");
    if (tpl) {
      container.appendChild(tpl.content.cloneNode(true));
      i18n.apply(container);
      return;
    }
    const panel = document.createElement("section");
    panel.className = "home-offline-panel";
    panel.setAttribute("role", "status");
    const icon = document.createElement("i");
    icon.className = "fa-solid fa-wifi";
    icon.setAttribute("aria-hidden", "true");
    const h2 = document.createElement("h2");
    h2.dataset.i18n = "network.youAreOffline";
    h2.textContent = t("network.youAreOffline");
    const p = document.createElement("p");
    p.dataset.i18n = "network.offlineDetails";
    p.textContent = t("network.offlineDetails");
    panel.append(icon, h2, p);
    container.appendChild(panel);
  },

  destroy() {
    homeScroll.destroy();
    homeCarousel.stopAutoSlide();
    homeGrid.destroy();
    homeSearch.destroy();
    homeSearchDropdown.destroy();
    this.switcherController?.abort();
    this.switcherController = null;
    homeSearch.onBookmarkSearch = null;
    if (this.bookmarkUpdatedListener) {
      document.removeEventListener("mod-bookmarks-updated", this.bookmarkUpdatedListener);
      this.bookmarkUpdatedListener = null;
    }
    if (this.bookmarkFilterListener) {
      document.removeEventListener(
        "home-bookmark-filter-changed",
        this.bookmarkFilterListener,
      );
      this.bookmarkFilterListener = null;
    }
  },
};

export function registerHomeView() {
  appEvents.addEventListener("view:loaded", (event) => {
    if (event.detail === "home") homeView.ready = homeView.init();
    else {
      homeView.destroy();
      homeView.ready = Promise.resolve();
    }
  });
  networkStatus.addEventListener("change", () => {
    if (!document.querySelector(".home-container")) return;
    homeView.destroy();
    homeView.ready = homeView.init();
  });
}
