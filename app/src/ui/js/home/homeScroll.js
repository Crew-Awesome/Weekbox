export const homeScroll = {
  init() {
    this.mainContent = document.getElementById("main-content");
    this.container = document.querySelector(".home-container");
    this.handler ??= () => {
      if (!this.container) return;
      const isScrolled = this.container.classList.contains("scrolled");
      const threshold = isScrolled ? 30 : 70;
      this.container.classList.toggle(
        "scrolled",
        this.mainContent.scrollTop > threshold,
      );
    };
    this.mainContent?.removeEventListener("scroll", this.handler);
    this.mainContent?.addEventListener("scroll", this.handler);
  },

  destroy() {
    this.mainContent?.removeEventListener("scroll", this.handler);
    this.mainContent = null;
    this.container = null;
  },
};
