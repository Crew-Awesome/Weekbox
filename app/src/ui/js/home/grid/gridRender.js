import { gameBananaApi } from "../../../../backend/api/gamebanana.js";
import { gridState } from "./gridState.js";
import { createCard } from "./cardBuilder.js";
import { networkStatus } from "../../../../backend/core/networkStatus.js";

export const gridRender = {
  async renderGrid(isInitial = false) {
    if (gridState.isLoading) {
      if (isInitial) {
        gridState.discoveryController?.abort();
        gridState.renderVersion++;
        gridState.pendingInitialRender = true;
      }
      return;
    }

    const grid = document.getElementById("popular-grid");
    if (!grid) return;
    const renderVersion = ++gridState.renderVersion;
    const requestedPage = isInitial ? 1 : gridState.currentPage + 1;

    if (isInitial) {
      gridState.discoveryController?.abort();
      gridState.discoveryController = new AbortController();
      gridState.discoverySnapshotId = null;
      gridState.currentPage = 1;
      gridState.hasMore = true;
      grid.replaceChildren();
      grid.classList.remove("grid-empty", "grid-error");
    }

    gridState.isLoading = true;
    if (!isInitial) this.showLoadMoreIndicator(grid);

    try {
      const response = gridState.isSearchMode
        ? await gameBananaApi.searchMods(
            gridState.searchQuery,
            requestedPage,
            12,
          )
        : await gameBananaApi.getGridMods(
            gridState.currentFilter,
            requestedPage,
            gridState.currentCategoryId,
            {
              snapshotId: gridState.discoverySnapshotId,
              signal: gridState.discoveryController?.signal,
            },
          );
      const result = Array.isArray(response)
        ? { mods: response, exhausted: response.length < 12 }
        : response;
      const mods = result.mods;

      if (renderVersion !== gridState.renderVersion) return;

      if (mods.length === 0 && isInitial) {
        if (result.sourceErrors?.length) {
          grid.textContent = "Discovery is temporarily unavailable.";
          grid.classList.add("grid-error");
          gridState.status = "error";
        } else {
          grid.textContent = "No mods found.";
          grid.classList.add("grid-empty");
        }
        return;
      }

      grid.classList.remove("grid-empty", "grid-error");
      if (mods.length === 0) {
        gridState.hasMore = false;
        return;
      }

      const cards = document.createDocumentFragment();
      mods.forEach((mod, index) => cards.appendChild(createCard(mod, index)));
      grid.appendChild(cards);
      if (result.snapshotId) gridState.discoverySnapshotId = result.snapshotId;
      gridState.currentPage = requestedPage;
      gridState.hasMore = !result.exhausted && mods.length === 12;
      gridState.status = result.stale
        ? "stale"
        : result.partial
          ? "partial"
          : result.exhausted
            ? "exhausted"
            : "ready";
      return true;
    } catch (error) {
      if (error?.kind === "aborted") return false;
      networkStatus.setOnline(false);
      if (isInitial && renderVersion === gridState.renderVersion) {
        grid.textContent = "Failed to load mods.";
        grid.classList.add("grid-error");
      }
      return false;
    } finally {
      this.hideLoadMoreIndicator(grid);
      gridState.isLoading = false;
      if (gridState.pendingInitialRender) {
        gridState.pendingInitialRender = false;
        this.renderGrid(true);
      }
    }
  },

  showLoadMoreIndicator(grid) {
    if (grid.querySelector(".chunk-loader")) return;
    const loader = document.createElement("div");
    loader.className = "chunk-loader";
    loader.setAttribute("role", "status");
    loader.setAttribute("aria-live", "polite");
    loader.innerHTML =
      '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i><span>Loading more mods...</span>';
    grid.appendChild(loader);
  },

  hideLoadMoreIndicator(grid) {
    grid?.querySelector(".chunk-loader")?.remove();
  },
};
