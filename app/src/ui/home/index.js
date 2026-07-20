import { appEvents } from "../../core/events.js";
import { homeCarousel } from "./carousel.js";
import { homeGrid } from "./grid/index.js";
import { homeSearch } from "./search.js";
import { homeSearchDropdown } from "./searchDropdown.js";
import { homeScroll } from "./homeScroll.js";

export const homeView = {
  hasVisited: false,
  ready: Promise.resolve(),

  async init() {
    homeScroll.init();

    homeSearch.init();
    homeSearchDropdown.init();
    await Promise.all([
      homeCarousel.init(),
      homeGrid.init({ prefetchNextPage: !this.hasVisited }),
    ]);
    this.hasVisited = true;
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
}
