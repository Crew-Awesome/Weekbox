import { gameBananaApi } from "../../../../backend/providers/gamebanana/gamebanana.provider.js";
import { gridState } from "./gridState.js";
import { createCard, createFeaturedCard } from "./cardBuilder.js";
import { networkStatus } from "../../../../backend/core/system/network-status.service.js";
import { t } from "../../i18n/index.js";

function selectFeaturedMod(mods, featuredIds, featuredEngineIds, offset) {
  const unseen = mods.filter((mod) => !featuredIds.has(mod.id));
  const candidates = unseen.length ? unseen : mods;
  const varied = candidates.filter(
    (mod) => mod.engineId && !featuredEngineIds.has(mod.engineId),
  );
  const pool = varied.length ? varied : candidates;
  return pool.length ? pool[offset % Math.min(pool.length, 6)] : null;
}

export const gridRender = {
  ensureEngineTooltip(grid) {
    if (!gridState.engineTooltip) {
      gridState.engineTooltip = document.createElement("div");
      gridState.engineTooltip.className =
        "mod-manager-engine-tooltip home-engine-tooltip";
      gridState.engineTooltip.setAttribute("role", "tooltip");
      document.body.appendChild(gridState.engineTooltip);
    }
    if (gridState.engineTooltipGrid === grid) return;

    gridState.engineTooltipGrid = grid;
    grid.addEventListener("pointerover", (event) => {
      const indicator = event.target.closest(".grid-engine-indicator");
      if (!indicator || !grid.contains(indicator)) return;
      const tooltip = gridState.engineTooltip;
      if (!tooltip) return;

      const labelKey = indicator.dataset.labelKey;
      const text = labelKey ? t(labelKey) : indicator.dataset.label;
      if (!text) return;

      tooltip.textContent = text;
      const rect = indicator.getBoundingClientRect();
      const halfWidth = tooltip.offsetWidth / 2;
      const left = Math.min(
        Math.max(rect.left + rect.width / 2, halfWidth + 8),
        window.innerWidth - halfWidth - 8,
      );
      const belowTop = rect.bottom + 8;
      const top =
        belowTop + tooltip.offsetHeight <= window.innerHeight - 8
          ? belowTop
          : rect.top - tooltip.offsetHeight - 8;
      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${Math.max(8, top)}px`;
      tooltip.classList.toggle("is-above", top < rect.top);
      tooltip.classList.add("is-visible");
    });
    grid.addEventListener("pointerout", (event) => {
      const indicator = event.target.closest(".grid-engine-indicator");
      if (
        indicator &&
        !(
          event.relatedTarget instanceof Node &&
          indicator.contains(event.relatedTarget)
        )
      ) {
        gridState.engineTooltip?.classList.remove("is-visible");
      }
    });

    document.addEventListener("locale-changed", () => {
      grid.querySelectorAll(".grid-engine-indicator").forEach((indicator) => {
        if (indicator.dataset.labelKey) {
          const text = t(indicator.dataset.labelKey);
          indicator.dataset.label = text;
          indicator.setAttribute("aria-label", text);
        }
      });
      gridState.engineTooltip?.classList.remove("is-visible");
    });
  },

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
    this.ensureEngineTooltip(grid);
    const renderVersion = ++gridState.renderVersion;
    const requestedPage = isInitial ? 1 : gridState.currentPage + 1;

    if (isInitial) {
      gridState.discoveryController?.abort();
      gridState.discoveryController = new AbortController();
      gridState.discoverySnapshotId = null;
      gridState.currentPage = 1;
      gridState.hasMore = true;
      grid.replaceChildren();
      gridState.featuredCandidates = [];
      gridState.featuredIds.clear();
      gridState.featuredEngineIds.clear();
      gridState.featuredOffset = Math.floor(Math.random() * 3);
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
          grid.textContent = t("home.discoveryUnavailable");
          grid.classList.add("grid-error");
          gridState.status = "error";
        } else {
          grid.textContent = t("home.noModsFound");
          grid.classList.add("grid-empty");
        }
        return;
      }

      grid.classList.remove("grid-empty", "grid-error");
      if (mods.length === 0) {
        gridState.hasMore = false;
        return;
      }

      if (
        isInitial &&
        !gridState.isSearchMode &&
        gridState.currentFilter === "popular"
      ) {
        gridState.featuredCandidates = mods;
      }

      const cards = document.createDocumentFragment();
      const showFeatured =
        !gridState.isSearchMode &&
        ((isInitial && gridState.currentFilter === "popular") ||
          requestedPage % 3 === 0);
      const featuredSource =
        gridState.currentFilter === "popular" &&
        gridState.featuredCandidates.length
          ? gridState.featuredCandidates
          : mods;
      const featured = showFeatured
        ? selectFeaturedMod(
            featuredSource,
            gridState.featuredIds,
            gridState.featuredEngineIds,
            gridState.featuredOffset,
          )
        : null;
      const featuredLabel =
        gridState.currentFilter === "updated"
          ? "Recently updated"
          : gridState.currentFilter === "new"
            ? "New release"
            : "Popular community pick";
      if (featured) {
        gridState.featuredIds.add(featured.id);
        if (featured.engineId)
          gridState.featuredEngineIds.add(featured.engineId);
        cards.appendChild(createFeaturedCard(featured, featuredLabel));
      }
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
        grid.textContent = t("home.failedToLoadMods");
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
    loader.innerHTML = `<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i><span>${t("home.loadingMoreMods")}</span>`;
    grid.appendChild(loader);
  },

  hideLoadMoreIndicator(grid) {
    grid?.querySelector(".chunk-loader")?.remove();
  },
};
