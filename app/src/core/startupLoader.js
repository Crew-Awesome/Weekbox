const screen = document.getElementById("startup-loading-screen");
const bar = document.getElementById("startup-loading-progress");
const label = document.getElementById("startup-loading-label");

export const startupLoader = {
  setPhase(message, progress) {
    if (label) label.textContent = message;
    if (bar) {
      const value = Math.max(0, Math.min(100, Number(progress) || 0));
      bar.style.width = `${value}%`;
      bar.parentElement?.setAttribute("aria-valuenow", String(value));
    }
  },

  async complete() {
    this.setPhase("Ready", 100);
    await new Promise((resolve) => requestAnimationFrame(resolve));
    screen?.classList.add("startup-loading-screen--complete");
    window.setTimeout(() => screen?.remove(), 240);
  },
};
