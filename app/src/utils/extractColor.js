const colorJobs = [];
let colorJobScheduled = false;

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

export function applyDominantColor(img, targetElement, options = {}) {
  const {
    cssVar = "--card-color",
    alpha = 0.5,
    fallback = "rgba(128, 128, 128, 0.3)",
  } = options;

  const processColor = () => {
    scheduleColorJob(() => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        const sourceWidth = img.naturalWidth || 64;
        const sourceHeight = img.naturalHeight || 64;
        const scale = Math.min(1, 64 / Math.max(sourceWidth, sourceHeight));
        canvas.width = Math.max(1, Math.round(sourceWidth * scale));
        canvas.height = Math.max(1, Math.round(sourceHeight * scale));

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        const swatches = new Map();

        for (let index = 0; index < data.length; index += 64) {
          const r = data[index];
          const g = data[index + 1];
          const b = data[index + 2];
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const luma = 0.299 * r + 0.587 * g + 0.114 * b;
          const saturation = max ? (max - min) / max : 0;
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
          (best, swatch) =>
            !best || swatch.weight > best.weight ? swatch : best,
          null,
        );
        if (!strongest) {
          targetElement.style.setProperty(cssVar, fallback);
          return;
        }

        let r = (strongest.r / strongest.count) * 0.76;
        let g = (strongest.g / strongest.count) * 0.76;
        let b = (strongest.b / strongest.count) * 0.76;

        // A colored cover should never become a bright enough backdrop to
        // compete with the card's white title or muted metadata.
        while (getRelativeLuminance(r, g, b) > 0.09) {
          r *= 0.92;
          g *= 0.92;
          b *= 0.92;
        }
        targetElement.style.setProperty(
          cssVar,
          `rgba(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)}, ${alpha})`,
        );
      } catch {
        targetElement.style.setProperty(cssVar, fallback);
      }
    });
  };

  if (img.complete) processColor();
  else img.addEventListener("load", processColor, { once: true });
}
