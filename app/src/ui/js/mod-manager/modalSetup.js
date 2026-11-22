import { localModImportModal } from "./localModImportModal.js";
import { modManagerTemplates } from "./templates.js";
import { openFilterSortModal } from "./filterSortModal.js";
import { i18n } from "../i18n/index.js";

export function setupModManagerModal(manager) {
  if (!document.getElementById("mod-manager-modal")) {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = modManagerTemplates.mainModal();
    const modalElement = wrapper.firstElementChild;
    if (!modalElement)
      throw new Error("WeekBox mod manager template is unavailable.");
    document.body.appendChild(modalElement);
    i18n.apply(document.getElementById("mod-manager-modal"));

    const modal = document.getElementById("mod-manager-modal");
    manager.engineTooltip = document.createElement("div");
    manager.engineTooltip.className = "mod-manager-engine-tooltip";
    manager.engineTooltip.setAttribute("role", "tooltip");
    document.body.appendChild(manager.engineTooltip);
    modal?.addEventListener("pointerover", (event) => {
      const indicator = event.target.closest(".mod-manager-engine-indicator");
      if (!indicator || !manager.engineTooltip) return;
      manager.engineTooltip.textContent = indicator.dataset.label || "";
      const rect = indicator.getBoundingClientRect();
      const halfWidth = manager.engineTooltip.offsetWidth / 2;
      const left = Math.min(
        Math.max(rect.left + rect.width / 2, halfWidth + 8),
        window.innerWidth - halfWidth - 8,
      );
      const belowTop = rect.bottom + 8;
      const top =
        belowTop + manager.engineTooltip.offsetHeight <= window.innerHeight - 8
          ? belowTop
          : rect.top - manager.engineTooltip.offsetHeight - 8;
      manager.engineTooltip.style.left = `${left}px`;
      manager.engineTooltip.style.top = `${Math.max(8, top)}px`;
      manager.engineTooltip.classList.toggle("is-above", top < rect.top);
      manager.engineTooltip.classList.add("is-visible");
    });
    modal?.addEventListener("pointerout", (event) => {
      const indicator = event.target.closest(".mod-manager-engine-indicator");
      if (
        indicator &&
        !(
          event.relatedTarget instanceof Node &&
          indicator.contains(event.relatedTarget)
        )
      ) {
        manager.engineTooltip?.classList.remove("is-visible");
      }
    });

    document
      .getElementById("mod-manager-close-btn")
      ?.addEventListener("click", () => manager.close());
    document
      .getElementById("mod-manager-modal")
      ?.addEventListener("click", (e) => {
        if (
          e.target.id === "mod-manager-modal" &&
          performance.now() >= manager.openingGuardUntil
        ) {
          manager.close();
        }
      });

    const toggleBtn = document.getElementById("mod-manager-view-toggle");
    if (toggleBtn) {
      toggleBtn.addEventListener("click", () => {
        const grid = document.getElementById("mod-manager-grid-container");
        if (!grid) return;
        const isListView = grid.classList.toggle("list-view");
        manager.gridRenderer?.refreshLayout();
        localStorage.setItem(
          manager.activeView === "dependencies"
            ? "weekbox_dependency_view"
            : "weekbox_mod_manager_view",
          isListView ? "list" : "grid",
        );
        const icon = toggleBtn.querySelector("i");
        if (icon) {
          icon.className = isListView
            ? "fa-solid fa-table-cells-large"
            : "fa-solid fa-list";
        }
      });
    }

    const depToggle = document.getElementById(
      "mod-manager-dependencies-toggle",
    );
    if (depToggle) {
      depToggle.addEventListener("click", () => {
        manager.activeView =
          manager.activeView === "mods" ? "dependencies" : "mods";
        if (!manager.showCachedView()) {
          manager.render(
            manager.cachedMods || [],
            manager.cachedStandaloneMods || [],
            manager.cachedInstalledEngines || [],
            { preserveOtherView: true },
          );
        }
      });
    }

    const searchInput = document.getElementById("mod-manager-search-input");
    const searchSuggestions = document.getElementById(
      "mod-manager-search-suggestions",
    );
    if (searchInput) {
      searchInput.setAttribute("aria-autocomplete", "list");
      searchInput.setAttribute(
        "aria-controls",
        "mod-manager-search-suggestions",
      );
      searchInput.setAttribute("aria-expanded", "false");
      searchInput.addEventListener("input", (event) => {
        manager.searchQuery = event.target.value.trim().toLocaleLowerCase();
        if (!manager.searchFilterFrame) {
          manager.searchFilterFrame = requestAnimationFrame(() => {
            manager.searchFilterFrame = 0;
            manager.applySearchFilter();
          });
        }
      });
      searchInput.addEventListener("focus", () =>
        manager.updateSearchSuggestions(),
      );
      searchInput.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          manager.hideSearchSuggestions();
          return;
        }
        if (event.key !== "ArrowDown") return;
        const firstSuggestion = searchSuggestions?.querySelector("button");
        if (!firstSuggestion) return;
        event.preventDefault();
        firstSuggestion.focus();
      });
      searchInput.addEventListener("focusout", () => {
        setTimeout(() => {
          if (!searchSuggestions?.contains(document.activeElement))
            manager.hideSearchSuggestions();
        }, 0);
      });
    }
    if (searchSuggestions && searchInput) {
      searchSuggestions.setAttribute("role", "listbox");
      searchSuggestions.addEventListener("mousedown", (event) => {
        if (event.target.closest("button[data-tag]")) event.preventDefault();
      });
      searchSuggestions.addEventListener("click", (event) => {
        const button = event.target.closest("button[data-tag]");
        if (!button) return;
        searchInput.value = button.dataset.tag || "";
        manager.searchQuery = searchInput.value.toLocaleLowerCase();
        manager.applySearchFilter();
        manager.hideSearchSuggestions();
        searchInput.focus();
      });
      searchSuggestions.addEventListener("keydown", (event) => {
        const buttons = [
          ...searchSuggestions.querySelectorAll("button[data-tag]"),
        ];
        const currentIndex = buttons.indexOf(document.activeElement);
        if (event.key === "Escape") {
          manager.hideSearchSuggestions();
          searchInput.focus();
        } else if (event.key === "ArrowDown" && buttons.length) {
          event.preventDefault();
          buttons[(currentIndex + 1) % buttons.length].focus();
        } else if (event.key === "ArrowUp") {
          event.preventDefault();
          if (currentIndex <= 0) searchInput.focus();
          else buttons[currentIndex - 1].focus();
        }
      });
    }

    const filterToggle = document.getElementById("mod-manager-filter-toggle");
    if (filterToggle) {
      filterToggle.addEventListener("click", () => {
        openFilterSortModal({
          filters: manager.typeFilters,
          sort: manager.sortMode,
          engineIds: [
            ...new Set(
              (manager.cachedMods || [])
                .filter((mod) => mod.engineId && mod.engineId !== "executable")
                .map((mod) => mod.engineId),
            ),
          ],
          hasMods: (manager.cachedMods || []).some(
            (mod) =>
              !["dependency", "addon"].includes(mod.kind) &&
              !(manager.cachedStandaloneMods || []).some(
                (standalone) => String(standalone.id) === String(mod.id),
              ),
          ),
          hasDependencies: (manager.cachedMods || []).some(
            (mod) => mod.kind === "dependency",
          ),
          hasAddons: (manager.cachedMods || []).some(
            (mod) => mod.kind === "addon",
          ),
          hasExecutables: (manager.cachedStandaloneMods || []).length > 0,
          hasUnassigned: (manager.cachedMods || []).some(
            (mod) => !mod.engineId,
          ),
          onApply: ({ filters, sort }) => {
            manager.typeFilters = filters;
            manager.sortMode = sort;
            if (!manager.syncModGrid()) {
              void manager.render(
                manager.cachedMods || [],
                manager.cachedStandaloneMods || [],
              );
            }
          },
        });
      });
    }

    const addLocalBtn = document.getElementById("mod-manager-add-local-btn");
    if (addLocalBtn) {
      addLocalBtn.addEventListener("click", async () => {
        if (addLocalBtn.disabled) return;
        addLocalBtn.disabled = true;
        try {
          await localModImportModal.open({
            onImported: () => manager.loadInstalledMods(true),
          });
        } finally {
          addLocalBtn.disabled = false;
        }
      });
    }

    if (!manager.eventBound) {
      document.addEventListener("mods-updated", (event) => {
        if (
          document
            .getElementById("mod-manager-modal")
            ?.classList.contains("show")
        ) {
          if (event.detail?.source === "mod-manager") return;
          void manager.loadInstalledMods(true);
        } else {
          manager.cachedMods = null;
          manager.searchTagCounts = null;
          manager.cachedStandaloneMods = null;
          manager.cachedInstalledEngines = null;
          manager.cachedViews = { mods: null, dependencies: null };
          manager.preloaded = false;
          manager.preloadPromise = null;
        }
      });
      document.addEventListener("mod-install-progress", (event) => {
        const install = event.detail;
        if (!install?.modId) return;
        if (install.status === "complete" || install.status === "cancelled") {
          manager.pendingInstalls.delete(String(install.modId));
          document
            .querySelectorAll(".mod-manager-installing-card")
            .forEach((card) => {
              if (card.dataset.modId === String(install.modId)) card.remove();
            });
          return;
        }
        manager.pendingInstalls.set(String(install.modId), install);
        manager.updatePendingInstallCard(install);
      });
      manager.eventBound = true;
    }
  }
}
