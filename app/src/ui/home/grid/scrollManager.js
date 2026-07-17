import { gridState } from "./gridState.js";
import { gridRender } from "./gridRender.js";

export const scrollManager = {
  scrollHandler: null,
  scrollFrame: null,

  setup() {
    const mainContent = document.getElementById("main-content");
    if (!mainContent) return;
    this.remove();

    const checkForMore = () => {
      this.scrollFrame = null;
      if (
        mainContent.scrollTop + mainContent.clientHeight >=
          mainContent.scrollHeight - 300 &&
        !gridState.isLoading &&
        gridState.hasMore
      ) {
        gridRender.renderGrid(false);
      }
    };
    this.scrollHandler = () => {
      if (this.scrollFrame) return;
      this.scrollFrame = requestAnimationFrame(checkForMore);
    };
    mainContent.addEventListener("scroll", this.scrollHandler, {
      passive: true,
    });
  },

  remove() {
    const mainContent = document.getElementById("main-content");
    if (mainContent && this.scrollHandler)
      mainContent.removeEventListener("scroll", this.scrollHandler);
    if (this.scrollFrame) cancelAnimationFrame(this.scrollFrame);
    this.scrollFrame = null;
    this.scrollHandler = null;
  },
};
