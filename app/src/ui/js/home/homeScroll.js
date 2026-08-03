export const homeScroll = {
  frame: null,

  init() {
    this.mainContent = document.getElementById("main-content");
    this.container = document.querySelector(".home-container");
    this.handler ??= () => {
      if (this.frame) return;
      this.frame = requestAnimationFrame(() => {
        this.frame = null;
        if (!this.container || !this.mainContent) return;
        const isScrolled = this.container.classList.contains("scrolled");
        const threshold = isScrolled ? 30 : 70;
        this.container.classList.toggle(
          "scrolled",
          this.mainContent.scrollTop > threshold,
        );
      });
    };
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = null;
    this.mainContent?.removeEventListener("scroll", this.handler);
    this.mainContent?.addEventListener("scroll", this.handler, {
      passive: true,
    });
  },

  destroy() {
    this.mainContent?.removeEventListener("scroll", this.handler);
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = null;
    this.mainContent = null;
    this.container = null;
  },
};
