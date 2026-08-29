var screen, bar, label, title, percentage, versionEl, startupLoader;
import { t } from "../../../ui/js/i18n/index.js";

screen = document.getElementById("startup-loading-screen");
bar = document.getElementById("startup-loading-progress");
label = document.getElementById("startup-loading-label");
title = document.getElementById("startup-loading-title");
percentage = document.getElementById("startup-loading-percentage");
versionEl = document.getElementById("startup-loading-version");

async function readConfigVersion() {
  try {
    const res = await fetch("neutralino.config.json");
    if (res.ok) return (await res.json())?.version || "";
  } catch {}
  return "";
}

async function readNeutralinoVersion() {
  if (
    typeof window === "undefined" ||
    !window.NL_TOKEN ||
    typeof Neutralino === "undefined" ||
    !Neutralino.app?.getConfig
  )
    return "";
  try {
    return (await Neutralino.app.getConfig())?.version || "";
  } catch {
    return "";
  }
}

async function initVersion() {
  if (!versionEl) return;
  const ver =
    (typeof window !== "undefined" && window.NL_APPVERSION) ||
    (await readConfigVersion()) ||
    (await readNeutralinoVersion());
  if (ver) versionEl.textContent = ver.startsWith("v") ? ver : `v${ver}`;
}

initVersion();

startupLoader = {
  progress: 0,
  isComplete: false,
  initVersion,
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
      if (percentage) {
        percentage.textContent = `${Math.round(value)}%`;
      }
    }
  },
  async complete() {
    this.setPhase(t("startup.ready"), 100);
    await new Promise((resolve) => requestAnimationFrame(resolve));
    this.isComplete = true;
    screen?.classList.add("startup-loading--complete");
    if (typeof document !== "undefined") {
      document.dispatchEvent(new CustomEvent("startup-loader:complete"));
    }
    window.setTimeout(() => screen?.remove(), 240);
  },
  fail(message = t("startup.couldNotStart")) {
    if (title) title.textContent = t("startup.failed");
    this.setPhase(message, 100);
    this.isComplete = true;
    screen?.classList.remove("startup-loading--complete");
    screen?.classList.add("startup-loading--failed");
    if (typeof document !== "undefined") {
      document.dispatchEvent(new CustomEvent("startup-loader:complete"));
    }
    requestAnimationFrame(() =>
      screen?.classList.add("startup-loading--complete"),
    );
    window.setTimeout(() => screen?.remove(), 200);
  },
};

export { startupLoader };
