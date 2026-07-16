/**
 * Extrae el color dominante de una imagen y lo aplica como una variable CSS a un elemento.
 * @param {HTMLImageElement} img - El elemento de imagen.
 * @param {HTMLElement} targetElement - El elemento al que se le aplicará la variable CSS.
 * @param {Object} options - Opciones de personalización.
 */
export function applyDominantColor(img, targetElement, options = {}) {
  const {
    cssVar = "--card-color",
    alpha = 0.7,
    fallback = "rgba(255, 255, 255, 0.3)",
  } = options;

  const processColor = () => {
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const sourceWidth = img.naturalWidth || 64;
      const sourceHeight = img.naturalHeight || 64;
      const scale = Math.min(1, 64 / Math.max(sourceWidth, sourceHeight));
      canvas.width = Math.max(1, Math.round(sourceWidth * scale));
      canvas.height = Math.max(1, Math.round(sourceHeight * scale));
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let r = 0,
        g = 0,
        b = 0,
        count = 0;

      // Saltamos píxeles para ser más rápidos y filtramos colores muy oscuros o muy claros
      for (let i = 0; i < data.length; i += 16) {
        const pr = data[i],
          pg = data[i + 1],
          pb = data[i + 2];
        if (pr > 20 && pr < 240 && pg > 20 && pg < 240 && pb > 20 && pb < 240) {
          r += pr;
          g += pg;
          b += pb;
          count++;
        }
      }

      if (count === 0) {
        // Si todos fueron ignorados, promediamos todo
        for (let i = 0; i < data.length; i += 16) {
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          count++;
        }
      }

      if (count > 0) {
        r = Math.floor(r / count);
        g = Math.floor(g / count);
        b = Math.floor(b / count);
        targetElement.style.setProperty(
          cssVar,
          `rgba(${r}, ${g}, ${b}, ${alpha})`,
        );
      }
    } catch (e) {
      // Fallback si la imagen no permite lectura por CORS u otro error
      targetElement.style.setProperty(cssVar, fallback);
    }
  };

  if (img.complete) processColor();
  else img.addEventListener("load", processColor);
}
