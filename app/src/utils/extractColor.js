export function applyDominantColor(img, targetElement, options = {}) {
  const {
    cssVar = "--card-color",
    alpha = 0.5,
    fallback = "rgba(128, 128, 128, 0.3)",
  } = options;

  const processColor = () => {
    setTimeout(() => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const sourceWidth = img.naturalWidth || 64;
        const sourceHeight = img.naturalHeight || 64;
        const scale = Math.min(1, 64 / Math.max(sourceWidth, sourceHeight));
        canvas.width = Math.max(1, Math.round(sourceWidth * scale));
        canvas.height = Math.max(1, Math.round(sourceHeight * scale));

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let r = 0;
        let g = 0;
        let b = 0;
        let count = 0;

        for (let i = 0; i < data.length; i += 16) {
          const pr = data[i];
          const pg = data[i + 1];
          const pb = data[i + 2];
          const luma = 0.299 * pr + 0.587 * pg + 0.114 * pb;
          if (luma > 50 && luma < 190) {
            r += pr;
            g += pg;
            b += pb;
            count++;
          }
        }

        if (count > 0) {
          targetElement.style.setProperty(
            cssVar,
            `rgba(${Math.floor(r / count)}, ${Math.floor(g / count)}, ${Math.floor(b / count)}, ${alpha})`,
          );
        } else {
          targetElement.style.setProperty(cssVar, fallback);
        }
      } catch {
        targetElement.style.setProperty(cssVar, fallback);
      }
    }, 0);
  };

  if (img.complete) processColor();
  else img.addEventListener("load", processColor);
}
