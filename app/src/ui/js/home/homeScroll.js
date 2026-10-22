export const homeScroll = {
  frame: null,
  scrollAnimationFrame: null,

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

  scrollToTop() {
    const mainContent = this.mainContent;
    if (!mainContent || mainContent.scrollTop <= 0) return;
    if (this.scrollAnimationFrame) {
      cancelAnimationFrame(this.scrollAnimationFrame);
    }
    const start = mainContent.scrollTop;
    const startedAt = performance.now();
    const duration = 180;
    const animate = (now) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - (1 - progress) ** 3;
      mainContent.scrollTop = start * (1 - eased);
      if (progress < 1) {
        this.scrollAnimationFrame = requestAnimationFrame(animate);
      } else {
        this.scrollAnimationFrame = null;
      }
    };
    this.scrollAnimationFrame = requestAnimationFrame(animate);
  },

  destroy() {
    this.mainContent?.removeEventListener("scroll", this.handler);
    if (this.frame) cancelAnimationFrame(this.frame);
    if (this.scrollAnimationFrame) cancelAnimationFrame(this.scrollAnimationFrame);
    this.frame = null;
    this.scrollAnimationFrame = null;
    this.mainContent = null;
    this.container = null;
  },
};
