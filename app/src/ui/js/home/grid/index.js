import { gridState } from "./gridState.js";
import { filterManager } from "./filterManager.js";
import { scrollManager } from "./scrollManager.js";
import { gridRender } from "./gridRender.js";

export const homeGrid = {
  // Getters y Setters para exponer el estado a dependencias externas (como search.js)
  get currentPage() {
    return gridState.currentPage;
  },
  set currentPage(val) {
    gridState.currentPage = val;
  },

  get isSearchMode() {
    return gridState.isSearchMode;
  },
  set isSearchMode(val) {
    gridState.isSearchMode = val;
  },

  get searchQuery() {
    return gridState.searchQuery;
  },
  set searchQuery(val) {
    gridState.searchQuery = val;
  },

  async init({ prefetchNextPage = false } = {}) {
    gridState.currentPage = 1;
    gridState.isSearchMode = false;
    gridState.hasMore = true;
    gridState.pendingInitialRender = false;

    filterManager.setup();
    await gridRender.renderGrid(true);
    if (prefetchNextPage && gridState.hasMore) {
      await gridRender.renderGrid(false);
    }
    scrollManager.setup();
  },

  renderGrid(isInitial) {
    return gridRender.renderGrid(isInitial);
  },

  destroy() {
    scrollManager.remove();
    filterManager.remove();
  },
};
