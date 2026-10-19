import { gridState } from "./gridState.js";
import { filterManager } from "./filterManager.js";
import { scrollManager } from "./scrollManager.js";
import { gridRender } from "./gridRender.js";

export const homeGrid = {

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

  get searchType() {
    return gridState.searchType;
  },
  set searchType(val) {
    gridState.searchType = val;
  },

  get currentCategoryId() {
    return gridState.currentCategoryId;
  },
  set currentCategoryId(val) {
    gridState.currentCategoryId = val;
  },

  get isBookmarksMode() {
    return gridState.isBookmarksMode;
  },
  set isBookmarksMode(val) {
    gridState.isBookmarksMode = val;
  },

  async init({ prefetchNextPage = false } = {}) {
    gridState.currentPage = 1;
    gridState.isSearchMode = false;
    gridState.hasMore = true;
    gridState.pendingInitialRender = false;

    filterManager.setup();
    await gridRender.renderGrid(true);
    if (prefetchNextPage && gridState.hasMore) {
      gridRender.renderGrid(false).catch(() => {});
    }
    scrollManager.setup();
  },

  renderGrid(isInitial, pagesToLoad) {
    return gridRender.renderGrid(isInitial, pagesToLoad);
  },

  destroy() {
    gridState.discoveryController?.abort();
    gridState.discoveryController = null;
    gridState.renderVersion++;
    gridState.pendingInitialRender = false;
    scrollManager.remove();
    filterManager.remove();
    gridRender.destroyEngineTooltip();
  },
};
