import { gridState } from "./gridState.js";
import { gridRender } from "./gridRender.js";

export const scrollManager = {
  scrollHandler: null,

  setup() {
    const mainContent = document.getElementById("main-content");
    if (!mainContent) return;
    this.remove();

    this.scrollHandler = () => {
      if (
        mainContent.scrollTop + mainContent.clientHeight >=
          mainContent.scrollHeight - 300 &&
        !gridState.isLoading &&
        gridState.hasMore
      ) {
        gridRender.renderGrid(false);
      }
    };
    mainContent.addEventListener("scroll", this.scrollHandler);
  },

  remove() {
    const mainContent = document.getElementById("main-content");
    if (mainContent && this.scrollHandler)
      mainContent.removeEventListener("scroll", this.scrollHandler);
    this.scrollHandler = null;
  },
};
