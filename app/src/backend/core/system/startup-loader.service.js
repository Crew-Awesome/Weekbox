var screen, bar, label, title, startupLoader;

screen = document.getElementById("startup-loading-screen");
bar = document.getElementById("startup-loading-progress");
label = document.getElementById("startup-loading-label");
title = document.getElementById("startup-loading-title");
startupLoader = {
  progress: 0,
  setPhase(message, progress) {
    if (label) label.textContent = message;
    if (bar) {
      const value = Math.max(
        this.progress,
        Math.min(100, Number(progress) || 0),
      );
      this.progress = value;
      bar.style.width = `${value}%`;
      bar.parentElement?.setAttribute("aria-valuenow", String(value));
    }
  },
  async complete() {
    this.setPhase("Ready", 100);
    await new Promise((resolve) => requestAnimationFrame(resolve));
    screen?.classList.add("startup-loading--complete");
    window.setTimeout(() => screen?.remove(), 240);
  },
  fail(message = "WeekBox could not start") {
    if (title) title.textContent = "Startup failed";
    this.setPhase(message, 100);
    screen?.classList.remove("startup-loading--complete");
    screen?.classList.add("startup-loading--failed");
    requestAnimationFrame(() =>
      screen?.classList.add("startup-loading--complete"),
    );
    window.setTimeout(() => screen?.remove(), 200);
  },
};

export { startupLoader };
