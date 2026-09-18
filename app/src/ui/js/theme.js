const DEFAULT_HUE = 190;
const THEME_CACHE_KEY = "weekbox-theme-dark-mode";
const HUE_CACHE_KEY = "weekbox-accent-hue";

function normalizeHue(value) {
  const hue = Number(value);
  if (!Number.isFinite(hue)) return DEFAULT_HUE;
  return Math.min(360, Math.max(0, Math.round(hue)));
}

export function getCachedTheme() {
  try {
    const value = localStorage.getItem(THEME_CACHE_KEY);
    if (value === "true") return true;
    if (value === "false") return false;
  } catch {}
  return null;
}

export function getCachedHue() {
  try {
    const value = localStorage.getItem(HUE_CACHE_KEY);
    if (/^\d{1,3}$/.test(value || "")) return normalizeHue(value);
  } catch {}
  return null;
}

function hueToHex(value) {
  const hue = normalizeHue(value) / 60;
  const saturation = 0.72;
  const lightness =
    document.documentElement.dataset.theme === "light" ? 0.26 : 0.74;
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const x = chroma * (1 - Math.abs((hue % 2) - 1));
  const match = lightness - chroma / 2;
  const channels =
    hue < 1
      ? [chroma, x, 0]
      : hue < 2
        ? [x, chroma, 0]
        : hue < 3
          ? [0, chroma, x]
          : hue < 4
            ? [0, x, chroma]
            : hue < 5
              ? [x, 0, chroma]
              : [chroma, 0, x];
  return `#${channels
    .map((channel) =>
      Math.round((channel + match) * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

export function setAccentHue(value) {
  const hue = normalizeHue(value);
  document.documentElement.style.setProperty(
    "--accent-hue",
    hue,
  );
  try {
    localStorage.setItem(HUE_CACHE_KEY, String(hue));
  } catch {}
  return hue;
}

export { hueToHex };

export function setTheme(darkMode, { animate = true, hue } = {}) {
  const root = document.documentElement;

  if (animate) root.classList.add("theme-switching");
  if (hue !== undefined) setAccentHue(hue);
  root.dataset.theme = darkMode ? "dark" : "light";
  try {
    localStorage.setItem(THEME_CACHE_KEY, String(Boolean(darkMode)));
  } catch {}

  if (animate) {
    requestAnimationFrame(() => root.classList.remove("theme-switching"));
  }
}
