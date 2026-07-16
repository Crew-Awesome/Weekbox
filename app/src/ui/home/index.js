import { appEvents } from "../../core/events.js";
import { homeCarousel } from "./carousel.js";
import { homeGrid } from "./grid/index.js";
import { homeSearch } from "./search.js";
import { homeSearchDropdown } from "./searchDropdown.js";
import { homeScroll } from "./homeScroll.js";

export const homeView = {
  init() {
    homeScroll.init();

    homeCarousel.init();
    homeGrid.init();
    homeSearch.init();
    homeSearchDropdown.init();
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
    if (event.detail === "home") homeView.init();
    else homeView.destroy();
  });
}
