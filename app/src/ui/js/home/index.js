import { appEvents } from "../../../backend/core/routing/events.service.js";
import { homeCarousel } from "./carousel.js";
import { homeGrid } from "./grid/index.js";
import { homeSearch } from "./search.js";
import { homeSearchDropdown } from "./searchDropdown.js";
import { homeScroll } from "./homeScroll.js";
import { networkStatus } from "../../../backend/core/system/network-status.service.js";
import { i18n, t } from "../i18n/index.js";

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
