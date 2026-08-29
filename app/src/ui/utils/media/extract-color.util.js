var colorJobs = [];
var colorJobScheduled = false;
var MAX_COLOR_CACHE_SIZE = 500;
var dominantColorCache = new Map();

function getCachedDominantColor(url) {
  if (!url) return null;
  return dominantColorCache.get(url) || null;
}

function hasCachedDominantColor(url) {
  return Boolean(url && dominantColorCache.has(url));
}

function setCachedDominantColor(url, colorData) {
  if (!url || !colorData) return;
  if (dominantColorCache.size >= MAX_COLOR_CACHE_SIZE) {
    const firstKey = dominantColorCache.keys().next().value;
    if (firstKey) dominantColorCache.delete(firstKey);
  }
  dominantColorCache.set(url, colorData);
}

function scheduleNextColorJob() {
  colorJobScheduled = true;
  const runNextJob = () => {
    colorJobScheduled = false;
    colorJobs.shift()?.();
    if (colorJobs.length) scheduleNextColorJob();
  };
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(runNextJob, { timeout: 400 });
  } else {
    setTimeout(runNextJob, 32);
  }
}

function scheduleColorJob(job) {
  colorJobs.push(job);
  if (!colorJobScheduled) scheduleNextColorJob();
}

function getRelativeLuminance(r, g, b) {
  const linear = [r, g, b].map((value) => {
    const channel = value / 255;
    return channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function applyColorToElement(targetElement, colorData, options = {}) {
  const { cssVar = "--card-color", alpha = 0.5, accentVar = "" } = options;
  const { r, g, b, accentR, accentG, accentB } = colorData;
  targetElement.style.setProperty(
    cssVar,
    `rgba(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)}, ${alpha})`,
  );
  if (accentVar) {
    const lighten = 0.42;
    const finalAccentR = Math.round(accentR + (255 - accentR) * lighten);
    const finalAccentG = Math.round(accentG + (255 - accentG) * lighten);
    const finalAccentB = Math.round(accentB + (255 - accentB) * lighten);
    targetElement.style.setProperty(
      accentVar,
      `rgb(${finalAccentR}, ${finalAccentG}, ${finalAccentB})`,
    );
  }
}

function readDominantColor(img) {
  const canvas = document.createElement("canvas");
  try {
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const sourceWidth = img.naturalWidth || 64;
    const sourceHeight = img.naturalHeight || 64;
    const scale = Math.min(1, 64 / Math.max(sourceWidth, sourceHeight));
    canvas.width = Math.max(1, Math.round(sourceWidth * scale));
    canvas.height = Math.max(1, Math.round(sourceHeight * scale));
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const swatches = /* @__PURE__ */ new Map();
    let accentR = 0;
    let accentG = 0;
    let accentB = 0;
    let accentWeight = 0;
    for (let index = 0; index < data.length; index += 64) {
      const r = data[index];
      const g = data[index + 1];
      const b = data[index + 2];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const luma = 0.299 * r + 0.587 * g + 0.114 * b;
      const saturation = max ? (max - min) / max : 0;
      if (luma >= 35 && luma <= 225 && saturation >= 0.18) {
        const weight = 0.35 + saturation;
        accentR += r * weight;
        accentG += g * weight;
        accentB += b * weight;
        accentWeight += weight;
      }
      if (luma < 35 || luma > 225 || saturation < 0.18) continue;
      const key = `${Math.floor(r / 32)}:${Math.floor(g / 32)}:${Math.floor(b / 32)}`;
      const swatch = swatches.get(key) || {
        weight: 0,
        r: 0,
        g: 0,
        b: 0,
        count: 0,
      };
      const weight = 0.2 + saturation ** 3 * 2;
      swatch.weight += weight;
      swatch.r += r * weight;
      swatch.g += g * weight;
      swatch.b += b * weight;
      swatch.count += weight;
      swatches.set(key, swatch);
    }
    const strongest = [...swatches.values()].reduce(
      (best, swatch) => (!best || swatch.weight > best.weight ? swatch : best),
      null,
    );
    if (!strongest) return null;
    const sourceR = strongest.r / strongest.count;
    const sourceG = strongest.g / strongest.count;
    const sourceB = strongest.b / strongest.count;
    let r = sourceR * 0.76;
    let g = sourceG * 0.76;
    let b = sourceB * 0.76;
    while (getRelativeLuminance(r, g, b) > 0.09) {
      r *= 0.92;
      g *= 0.92;
      b *= 0.92;
    }
    return {
      r,
      g,
      b,
      accentR: accentWeight ? accentR / accentWeight : sourceR,
      accentG: accentWeight ? accentG / accentWeight : sourceG,
      accentB: accentWeight ? accentB / accentWeight : sourceB,
    };
  } finally {
    canvas.width = 0;
    canvas.height = 0;
  }
}

function applyDominantColor(img, targetElement, options = {}) {
  const {
    cssVar = "--card-color",
    alpha = 0.5,
    fallback = "rgba(128, 128, 128, 0.3)",
    accentVar = "",
    accentFallback = "var(--primary)",
  } = options;
  const setFallback = () => {
    targetElement.style.setProperty(cssVar, fallback);
    if (accentVar) targetElement.style.setProperty(accentVar, accentFallback);
  };

  const src = img?.src || "";
  if (src && dominantColorCache.has(src)) {
    applyColorToElement(targetElement, dominantColorCache.get(src), options);
    return;
  }

  const processColor = () => {
    scheduleColorJob(() => {
      try {
        if (src && dominantColorCache.has(src)) {
          applyColorToElement(
            targetElement,
            dominantColorCache.get(src),
            options,
          );
          return;
        }
        const colorData = readDominantColor(img);
        if (!colorData) {
          setFallback();
          return;
        }
        if (src) {
          setCachedDominantColor(src, colorData);
        }
        applyColorToElement(targetElement, colorData, options);
      } catch {
        setFallback();
      }
    });
  };
  if (img.complete) {
    if (img.naturalWidth) processColor();
    else setFallback();
  } else {
    img.addEventListener("load", processColor, { once: true });
    img.addEventListener("error", setFallback, { once: true });
  }
}

export { applyDominantColor, getCachedDominantColor, hasCachedDominantColor };
