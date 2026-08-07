import { gameBananaApi } from "../../../../backend/providers/gamebanana/gamebanana.provider.js";
import { gridState } from "./gridState.js";
import { createCard, createFeaturedCard } from "./cardBuilder.js";
import { t } from "../../i18n/index.js";

function selectFeaturedMod(mods, featuredIds, featuredEngineIds) {
  const unseen = mods.filter((mod) => !featuredIds.has(mod.id));
  const candidates = unseen.length ? unseen : mods;
  const varied = candidates.filter(
    (mod) => mod.engineId && !featuredEngineIds.has(mod.engineId),
  );
  const pool = varied.length ? varied : candidates;
  return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
}

function selectFeaturedPosition(grid, cardCount) {
  const columns = Math.max(
    1,
    getComputedStyle(grid).gridTemplateColumns.split(/\s+/).filter(Boolean)
      .length,
  );
  const existingCardCount = [...grid.children].filter((child) =>
    child.matches(".mod-card:not(.mod-card--featured)"),
  ).length;
  const positions = [];
  for (let position = 0; position <= cardCount; position++) {
    const total = existingCardCount + position;
    if (total > 0 && total % columns === 0) positions.push(position);
  }
  return positions.length
    ? positions[Math.floor(Math.random() * positions.length)]
    : null;
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
    if (gridState.engineTooltipAbort) gridState.engineTooltipAbort.abort();
    const abortController = new AbortController();
    gridState.engineTooltipAbort = abortController;
    const { signal } = abortController;

    grid.addEventListener(
      "pointerover",
      (event) => {
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
      },
      { signal },
    );
    grid.addEventListener(
      "pointerout",
      (event) => {
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
      },
      { signal },
    );

    document.addEventListener(
      "locale-changed",
      () => {
        grid.querySelectorAll(".grid-engine-indicator").forEach((indicator) => {
          if (indicator.dataset.labelKey) {
            const text = t(indicator.dataset.labelKey);
            indicator.dataset.label = text;
            indicator.setAttribute("aria-label", text);
          }
        });
        gridState.engineTooltip?.classList.remove("is-visible");
      },
      { signal },
    );
  },

  destroyEngineTooltip() {
    if (gridState.engineTooltipAbort) {
      gridState.engineTooltipAbort.abort();
      gridState.engineTooltipAbort = null;
    }
    gridState.engineTooltipGrid = null;
    if (gridState.engineTooltip) {
      gridState.engineTooltip.remove();
      gridState.engineTooltip = null;
    }
  },

  async renderGrid(isInitial = false, pagesToLoad = 1) {
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
    const pageSize =
      !gridState.isSearchMode &&
      ["ripe", "new", "updated"].includes(gridState.currentFilter)
        ? 24
        : 12;

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
      grid.classList.remove("grid-empty", "grid-error");
    }

    gridState.isLoading = true;
    if (!isInitial) this.showLoadMoreIndicator(grid);

    try {
      let pagesLoaded = 0;
      while (pagesLoaded < pagesToLoad) {
        if (renderVersion !== gridState.renderVersion) break;
        if (!gridState.hasMore && !isInitial) break;

        const requestedPage = isInitial ? 1 : gridState.currentPage + 1;
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
                pageSize,
              },
            );
        const result = Array.isArray(response)
          ? { mods: response, exhausted: response.length < pageSize }
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
          break;
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
          Math.random() < 0.5 &&
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
            )
          : null;
        const featuredPosition = featured
          ? selectFeaturedPosition(grid, mods.length)
          : null;
        const featuredLabelKey =
          gridState.currentFilter === "updated"
            ? "home.recentlyUpdated"
            : gridState.currentFilter === "new"
              ? "home.newRelease"
              : "home.popularCommunityPick";
        if (featured && featuredPosition !== null) {
          gridState.featuredIds.add(featured.id);
          if (featured.engineId)
            gridState.featuredEngineIds.add(featured.engineId);
        }
        const cardElements = mods.map((mod, index) => createCard(mod, index));
        if (featured && featuredPosition !== null) {
          cardElements.splice(
            featuredPosition,
            0,
            createFeaturedCard(featured, featuredLabelKey),
          );
        }
        cards.append(...cardElements);
        grid.appendChild(cards);
        if (result.snapshotId) gridState.discoverySnapshotId = result.snapshotId;
        gridState.currentPage = requestedPage;
        gridState.hasMore = !result.exhausted && mods.length === pageSize;
        gridState.status = result.stale
          ? "stale"
          : result.partial
            ? "partial"
            : result.exhausted
              ? "exhausted"
              : "ready";

        pagesLoaded++;
        if (isInitial) break;
      }
      return true;
    } catch (error) {
      if (error?.kind === "aborted") return false;
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
