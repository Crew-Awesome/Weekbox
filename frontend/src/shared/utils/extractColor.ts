/**
 * Obtiene los colores de fondo CSS para evitar colisiones
 */
let cachedBgColors: number[][] | null = null;
const getBgColors = (): number[][] => {
  if (cachedBgColors) return cachedBgColors;
  if (typeof document === "undefined") return [[14, 20, 21]];

  const styles = getComputedStyle(document.documentElement);
  const vars = ["--wb-bg", "--wb-surface", "--wb-front-bg", "--wb-back-bg"];

  cachedBgColors = vars.map((v) => {
    let val = styles.getPropertyValue(v).trim();
    while (val.startsWith("var(")) {
      const innerVar = val.slice(4, -1).trim();
      val = styles.getPropertyValue(innerVar).trim();
    }
    if (val.startsWith("#")) {
      let hex = val.replace("#", "");
      if (hex.length === 3)
        hex = hex
          .split("")
          .map((c) => c + c)
          .join("");
      const num = parseInt(hex, 16);
      if (!isNaN(num)) return [num >> 16, (num >> 8) & 255, num & 255];
    }
    if (val.startsWith("rgb")) {
      const match = val.match(/\d+/g);
      if (match && match.length >= 3)
        return [Number(match[0]), Number(match[1]), Number(match[2])];
    }
    return [0, 0, 0];
  });
  return cachedBgColors;
};

const colorCache = new Map<string, string>();

// TODO: En un futuro, esto se conectará a las opciones de usuario (Settings/Zustand)
const IS_ACTIVE = false;

/**
 * Extracts the predominant color from an image URL.
 * Uses a hidden canvas to sample the image and find the most frequent color bucket.
 *
 * @param imageUrl The source URL of the image
 * @param opacity Optional opacity to return an RGBA string (e.g., 0.3)
 * @returns A Promise that resolves to a CSS RGB(A) color string
 */
export const extractColor = (
  imageUrl: string,
  opacity?: number,
): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!IS_ACTIVE || typeof document === "undefined") {
      resolve(
        opacity !== undefined
          ? `rgba(255, 255, 255, ${opacity * 0.5})`
          : "var(--wb-surface-variant)",
      );
      return;
    }

    const cacheKey = imageUrl + (opacity ?? "");
    if (colorCache.has(cacheKey)) {
      resolve(colorCache.get(cacheKey)!);
      return;
    }

    const img = new Image();
    img.crossOrigin = "Anonymous";

    img.onload = () => {
      // Ceder el control al hilo principal para evitar el stuttering en el renderizado (yield)
      setTimeout(() => {
        try {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d", { willReadFrequently: true });

          if (!ctx) {
            reject(new Error("Failed to get canvas context"));
            return;
          }

          // Reducción para rendimiento (24px es suficiente para sacar el color predominante)
          const maxDim = 24;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;

          ctx.drawImage(img, 0, 0, width, height);

          const imageData = ctx.getImageData(0, 0, width, height);
          const data = imageData.data;

          const colorCounts: Record<string, { count: number; rgb: number[] }> =
            {};

          // Leer pixeles saltando de a 16 (4 píxeles reales)
          for (let i = 0; i < data.length; i += 16) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];

            if (a < 128) continue;

            const bucketR = Math.round(r / 16) * 16;
            const bucketG = Math.round(g / 16) * 16;
            const bucketB = Math.round(b / 16) * 16;

            const finalR = Math.min(255, bucketR);
            const finalG = Math.min(255, bucketG);
            const finalB = Math.min(255, bucketB);

            const rgbStr = `rgb(${finalR}, ${finalG}, ${finalB})`;

            if (!colorCounts[rgbStr]) {
              colorCounts[rgbStr] = { count: 0, rgb: [finalR, finalG, finalB] };
            }
            colorCounts[rgbStr].count += 1;
          }

          const bgs = [...getBgColors(), [255, 255, 255], [240, 240, 240]];
          const sortedColors = Object.values(colorCounts).sort(
            (a, b) => b.count - a.count,
          );
          let bestColor =
            sortedColors.length > 0 ? sortedColors[0].rgb : [0, 0, 0];

          for (const candidate of sortedColors) {
            let isDifferent = true;
            for (const bg of bgs) {
              const dist = Math.sqrt(
                Math.pow(candidate.rgb[0] - bg[0], 2) +
                  Math.pow(candidate.rgb[1] - bg[1], 2) +
                  Math.pow(candidate.rgb[2] - bg[2], 2),
              );
              if (dist < 50) {
                isDifferent = false;
                break;
              }
            }
            if (isDifferent) {
              bestColor = candidate.rgb;
              break;
            }
          }

          const finalResult =
            opacity !== undefined
              ? `rgba(${bestColor[0]}, ${bestColor[1]}, ${bestColor[2]}, ${opacity})`
              : `rgb(${bestColor[0]}, ${bestColor[1]}, ${bestColor[2]})`;

          colorCache.set(cacheKey, finalResult);
          resolve(finalResult);
        } catch (err) {
          reject(new Error("Canvas image data extraction failed."));
        }
      }, 50); // Yield to allow UI to render first
    };

    img.onerror = () => {
      reject(new Error(`Failed to load image at ${imageUrl}`));
    };

    img.src = imageUrl;
  });
};
