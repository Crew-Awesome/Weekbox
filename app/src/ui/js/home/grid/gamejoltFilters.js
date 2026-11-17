import { GAMEJOLT_FILTERS } from "../../../../backend/providers/gamejolt/gamejolt.provider.js";
import { gridState } from "./gridState.js";
import { gridRender } from "./gridRender.js";
import { activateCheckoutDialog, deactivateCheckoutDialog } from "../modal/dialogFocus.js";

const GROUP_LABELS = {
  browser: "Browser",
  partners: "Partner games",
  status: "Development status",
  maturity: "Maturity",
  os: "Platform",
};

function cloneFilters(filters) {
  return {
    os: [...(filters?.os || [])],
    browser: [...(filters?.browser || [])],
    maturity: [...(filters?.maturity || [])],
    status: [...(filters?.status || [])],
    partners: [...(filters?.partners || [])],
  };
}

function sameFilters(a, b) {
  return Object.keys(a).every((key) => {
    const left = Array.isArray(a[key]) ? [...a[key]].sort() : a[key];
    const right = Array.isArray(b[key]) ? [...b[key]].sort() : b[key];
    return JSON.stringify(left) === JSON.stringify(right);
  });
}

export const gameJoltFilters = {
  controller: null,
  dropdowns: [],
  overlay: null,
  draft: null,
  previousFocus: null,

  setup() {
    this.controller?.abort();
    this.controller = new AbortController();
    document.getElementById("gamejolt-filters-button")?.addEventListener(
      "click",
      () => this.open(),
      { signal: this.controller.signal },
    );
    this.syncIndicator();
  },

  syncIndicator() {
    const button = document.getElementById("gamejolt-filters-button");
    const indicator = button?.querySelector(".gamejolt-filters-indicator");
    const filters = gridState.gamejoltFilters;
    const active = Boolean(gridState.gamejoltDate) ||
      Object.values(filters).some((value) => Array.isArray(value) && value.length);
    indicator?.toggleAttribute("hidden", !active);
    button?.classList.toggle("has-active-filters", active);
    button?.setAttribute("aria-label", active ? "GameJolt filters (active)" : "GameJolt filters");
  },

  renderGroups() {
    const root = this.overlay?.querySelector("[data-gamejolt-filter-groups]");
    if (!root) return;
    root.replaceChildren(...Object.entries(GROUP_LABELS).map(([key, label]) => {
      const fieldset = document.createElement("fieldset");
      fieldset.className = "gamejolt-filter-group";
      const legend = document.createElement("legend");
      legend.textContent = label;
      const options = document.createElement("div");
      options.className = "gamejolt-filter-options";
      for (const [value, optionLabel] of GAMEJOLT_FILTERS[key]) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "gamejolt-filter-chip";
        button.dataset.filterGroup = key;
        button.dataset.filterValue = value;
        button.setAttribute("role", "checkbox");
        button.setAttribute("aria-checked", String(this.draft.filters[key].includes(value)));
        button.classList.toggle("selected", this.draft.filters[key].includes(value));
        button.textContent = optionLabel;
        options.append(button);
      }
      fieldset.append(legend, options);
      return fieldset;
    }));
  },

  open() {
    if (gridState.service !== "gamejolt" || this.overlay) return;
    this.draft = {
      date: gridState.gamejoltDate,
      filters: cloneFilters(gridState.gamejoltFilters),
    };
    this.previousFocus = document.activeElement;
    const overlay = document.createElement("dialog");
    overlay.id = "gamejolt-filters-modal";
    overlay.className = "gamejolt-filters-dialog mod-settings-overlay";
    overlay.setAttribute("aria-labelledby", "gamejolt-filters-title");
    overlay.innerHTML = `
      <section class="mod-settings-modal gamejolt-filters-modal">
        <header class="mod-settings-header">
          <h2 id="gamejolt-filters-title">GameJolt filters</h2>
          <button type="button" class="mod-settings-close" data-close aria-label="Close filters"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
        </header>
        <div class="mod-settings-body gamejolt-filters-body">
          <div class="gamejolt-filter-selects">
            <label class="gamejolt-filter-field gamejolt-date-field">Published on
              <input type="date" data-gamejolt-date aria-label="Published on date">
            </label>
          </div>
          <div class="gamejolt-filter-groups" data-gamejolt-filter-groups></div>
        </div>
        <footer class="mod-settings-footer gamejolt-filters-footer">
          <button type="button" class="mod-settings-reset" data-reset>Reset</button>
          <span class="mod-settings-status" role="status" aria-live="polite"></span>
          <button type="button" class="mod-settings-cancel" data-close>Cancel</button>
          <button type="button" class="mod-settings-save" data-apply>Apply filters</button>
        </footer>
      </section>`;
    document.body.append(overlay);
    this.overlay = overlay;
    this.renderGroups();
    this.dropdowns = [];
    const date = overlay.querySelector("[data-gamejolt-date]");
    date.value = this.draft.date;
    date.addEventListener("input", () => { this.draft.date = date.value; });
    overlay.addEventListener("click", (event) => {
      const chip = event.target.closest("[data-filter-group]");
      if (chip) {
        const values = this.draft.filters[chip.dataset.filterGroup];
        const index = values.indexOf(chip.dataset.filterValue);
        if (index < 0) values.push(chip.dataset.filterValue);
        else values.splice(index, 1);
        const selected = index < 0;
        chip.classList.toggle("selected", selected);
        chip.setAttribute("aria-checked", String(selected));
      }
      if (event.target.closest("[data-close]")) this.close();
      if (event.target.closest("[data-reset]")) {
        this.draft = { date: "", filters: cloneFilters({}) };
        date.value = "";
        this.renderGroups();
      }
      if (event.target.closest("[data-apply]")) this.apply();
    });
    overlay.addEventListener("cancel", (event) => { event.preventDefault(); this.close(); });
    overlay.addEventListener("click", (event) => {
      if (event.target !== overlay) return;
      const rect = overlay.querySelector(".gamejolt-filters-modal").getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) this.close();
    });
    overlay.showModal();
    activateCheckoutDialog(overlay, overlay, overlay.querySelector("[data-gamejolt-date]"), () => this.close());
    requestAnimationFrame(() => overlay.classList.add("show"));
  },

  apply() {
    if (!this.draft) return;
    const nextFilters = cloneFilters(this.draft.filters);
    const changed = this.draft.date !== gridState.gamejoltDate || !sameFilters(nextFilters, gridState.gamejoltFilters);
    gridState.gamejoltDate = this.draft.date;
    gridState.gamejoltFilters = nextFilters;
    this.syncIndicator();
    this.close();
    if (changed) gridRender.renderGrid(true);
  },

  close() {
    if (!this.overlay) return;
    this.dropdowns.forEach((dropdown) => dropdown.destroy());
    this.dropdowns = [];
    deactivateCheckoutDialog(this.overlay);
    this.overlay.close();
    this.overlay.remove();
    this.overlay = null;
    this.draft = null;
    this.previousFocus?.focus?.();
    this.previousFocus = null;
  },
};
