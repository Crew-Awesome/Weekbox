import { gridState } from "./gridState.js";
import { gridRender } from "./gridRender.js";
import { setupDropdown } from "../../../utils/components/dropdown.component.js";
import { BACKSTAGE_CATEGORIES } from "../../../../backend/providers/backstage/backstage.provider.js";
import { activateCheckoutDialog, deactivateCheckoutDialog } from "../modal/dialogFocus.js";

const SORTS = [
  ["activity", "Recently Active"],
  ["downloads", "Most Downloaded"],
  ["likes", "Most Liked"],
  ["views", "Most Viewed"],
  ["added", "Recently Added"],
  ["stars", "Most Starred"],
];

function makeOption(label, value, key) {
  const option = document.createElement("button");
  option.type = "button";
  option.className = "custom-option";
  option.dataset[key] = value;
  option.dataset.label = label;
  option.setAttribute("role", "option");
  option.setAttribute("aria-selected", "false");
  const text = document.createElement("span");
  text.textContent = label;
  option.append(text);
  return option;
}

export const backstageFilters = {
  controller: null,
  dropdowns: [],
  overlay: null,
  draft: null,
  previousFocus: null,

  setup() {
    this.controller?.abort();
    this.controller = new AbortController();
    document.getElementById("backstage-filters-button")?.addEventListener(
      "click",
      () => this.open(),
      { signal: this.controller.signal },
    );
    this.syncIndicator();
  },

  syncIndicator() {
    const button = document.getElementById("backstage-filters-button");
    const indicator = button?.querySelector(".backstage-filters-indicator");
    const active = gridState.currentFilter !== "activity" || Boolean(gridState.backstageCategory) || gridState.backstageReverse;
    indicator?.toggleAttribute("hidden", !active);
    button?.classList.toggle("has-active-filters", active);
    button?.setAttribute("aria-label", active ? "Filters (active)" : "Filters");
  },

  renderOptions(key) {
    const container = this.overlay?.querySelector(`#backstage-filter-${key}-options`);
    if (!container) return;
    const values = key === "sort" ? SORTS : [["", "All categories"], ...BACKSTAGE_CATEGORIES];
    container.replaceChildren(...values.map(([value, label]) => makeOption(label, value, key)));
    this.syncDropdown(key);
  },

  syncDropdown(key) {
    const value = key === "sort" ? this.draft?.sort : this.draft?.category;
    const items = [...(this.overlay?.querySelectorAll(`#backstage-filter-${key}-options [role="option"]`) || [])];
    const selected = items.find((item) => item.dataset[key] === value) || items[0];
    items.forEach((item) => {
      const active = item === selected;
      item.classList.toggle("selected", active);
      item.setAttribute("aria-selected", String(active));
    });
    const label = selected?.dataset.label;
    const text = this.overlay?.querySelector(`#backstage-filter-${key}-selected`);
    if (text && label) text.textContent = label;
  },

  open() {
    if (gridState.service !== "backstage" || this.overlay) return;
    this.draft = {
      sort: gridState.currentFilter,
      category: gridState.backstageCategory,
      reverse: gridState.backstageReverse,
    };
    this.previousFocus = document.activeElement;
    const overlay = document.createElement("dialog");
    overlay.id = "backstage-filters-modal";
    overlay.className = "backstage-filters-dialog mod-settings-overlay";
    overlay.setAttribute("aria-labelledby", "backstage-filters-title");
    overlay.innerHTML = `
      <section class="mod-settings-modal backstage-filters-modal">
        <header class="mod-settings-header">
          <h2 id="backstage-filters-title">Filters</h2>
          <button type="button" class="mod-settings-close" data-close aria-label="Close filters"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
        </header>
        <div class="mod-settings-body backstage-filters-body">
          <section class="backstage-filter-section" aria-label="Mod filters">
            <label class="backstage-filter-field">Sort by
              <span class="pill-dropdown" id="backstage-filter-sort-dropdown">
                <button type="button" class="pill-btn dropdown-trigger backstage-filter-select" id="backstage-filter-sort-trigger" aria-haspopup="listbox" aria-expanded="false" aria-controls="backstage-filter-sort-options"><span id="backstage-filter-sort-selected"></span><i class="fa-solid fa-chevron-down filter-dropdown-chevron" aria-hidden="true"></i></button>
                <span class="custom-options-container" id="backstage-filter-sort-options" role="listbox" aria-label="Sort mods"></span>
              </span>
            </label>
            <label class="backstage-filter-field">Category
              <span class="pill-dropdown" id="backstage-filter-category-dropdown">
                <button type="button" class="pill-btn dropdown-trigger backstage-filter-select" id="backstage-filter-category-trigger" aria-haspopup="listbox" aria-expanded="false" aria-controls="backstage-filter-category-options"><span id="backstage-filter-category-selected"></span><i class="fa-solid fa-chevron-down filter-dropdown-chevron" aria-hidden="true"></i></button>
                <span class="custom-options-container" id="backstage-filter-category-options" role="listbox" aria-label="Filter by category"></span>
              </span>
            </label>
            <label class="backstage-reverse-control"><span>Reverse order</span><input type="checkbox" role="switch" data-reverse><span class="backstage-reverse-track" aria-hidden="true"><span></span></span></label>
          </section>
        </div>
        <footer class="mod-settings-footer backstage-filters-footer">
          <button type="button" class="mod-settings-reset" data-reset>Reset</button>
          <span class="mod-settings-status" role="status" aria-live="polite"></span>
          <button type="button" class="mod-settings-cancel" data-close>Cancel</button>
          <button type="button" class="mod-settings-save" data-apply>Apply filters</button>
        </footer>
      </section>`;
    document.body.append(overlay);
    this.overlay = overlay;
    this.renderOptions("sort");
    this.renderOptions("category");
    this.dropdowns = ["sort", "category"].map((key) => setupDropdown(
      overlay.querySelector(`#backstage-filter-${key}-trigger`),
      overlay.querySelector(`#backstage-filter-${key}-dropdown`),
      { menuElement: overlay.querySelector(`#backstage-filter-${key}-options`), portalHost: overlay },
    ));
    const reverse = overlay.querySelector("[data-reverse]");
    reverse.checked = this.draft.reverse;
    overlay.addEventListener("click", (event) => {
      const option = event.target.closest("[role=option]");
      if (option) {
        const key = option.dataset.sort !== undefined ? "sort" : "category";
        this.draft[key] = option.dataset[key];
        this.syncDropdown(key);
        this.dropdowns[key === "sort" ? 0 : 1]?.close();
      }
      if (event.target.closest("[data-close]")) this.close();
      if (event.target.closest("[data-reset]")) {
        this.draft = { sort: "activity", category: "", reverse: false };
        reverse.checked = false;
        this.syncDropdown("sort");
        this.syncDropdown("category");
      }
      if (event.target.closest("[data-apply]")) this.apply();
    });
    reverse.addEventListener("change", () => { this.draft.reverse = reverse.checked; });
    overlay.addEventListener("cancel", (event) => { event.preventDefault(); this.close(); });
    overlay.addEventListener("click", (event) => {
      if (event.target !== overlay) return;
      const rect = overlay.querySelector(".backstage-filters-modal").getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) this.close();
    });
    overlay.showModal();
    activateCheckoutDialog(overlay, overlay, overlay.querySelector("#backstage-filter-sort-trigger"), () => this.close());
    requestAnimationFrame(() => overlay.classList.add("show"));
  },

  apply() {
    if (!this.draft) return;
    const changed = this.draft.sort !== gridState.currentFilter || this.draft.category !== gridState.backstageCategory || this.draft.reverse !== gridState.backstageReverse;
    gridState.currentFilter = this.draft.sort;
    gridState.serviceSorts.backstage = this.draft.sort;
    gridState.backstageCategory = this.draft.category;
    gridState.backstageReverse = this.draft.reverse;
    this.syncIndicator();
    this.close();
    if (changed) gridRender.renderGrid(true);
  },

  close() {
    const overlay = this.overlay;
    if (!overlay) return;
    this.dropdowns.forEach((dropdown) => dropdown?.destroy());
    this.dropdowns = [];
    this.overlay = null;
    this.draft = null;
    this.previousFocus = null;
    overlay.classList.remove("show");
    setTimeout(() => {
      if (overlay.open) overlay.close();
      deactivateCheckoutDialog(overlay);
      overlay.remove();
    }, 260);
  },
};
