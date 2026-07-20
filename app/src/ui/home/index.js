import { appEvents } from "../../core/events.js";
import { homeCarousel } from "./carousel.js";
import { homeGrid } from "./grid/index.js";
import { homeSearch } from "./search.js";
import { homeSearchDropdown } from "./searchDropdown.js";
import { homeScroll } from "./homeScroll.js";
import { networkStatus } from "../../core/networkStatus.js";

export const homeView = {
  hasVisited: false,
  ready: Promise.resolve(),

  async init() {
    if (!networkStatus.online) {
      this.renderOffline();
      this.hasVisited = true;
      return;
    }

    homeScroll.init();

    homeSearch.init();
    homeSearchDropdown.init();
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
    this.hasVisited = true;
  },

  renderOffline() {
    const container = document.querySelector(".home-container");
    if (!container) return;
    container.replaceChildren();
    const panel = document.createElement("section");
    panel.className = "home-offline-panel";
    panel.setAttribute("role", "status");
    panel.innerHTML = `
      <i class="fa-solid fa-wifi" aria-hidden="true"></i>
      <h2>You are offline</h2>
      <p>Discover, search, downloads, and engine release checks need an internet connection. Your local mods and engines are still available from their managers.</p>
    `;
    container.appendChild(panel);
  },

  destroy() {
    homeScroll.destroy();
    homeCarousel.stopAutoSlide();
    homeGrid.destroy();
    homeSearch.destroy();
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
