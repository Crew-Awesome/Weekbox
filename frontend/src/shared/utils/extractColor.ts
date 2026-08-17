/**
 * Obtiene los colores de fondo CSS para evitar colisiones
 */
let cachedBgColors: number[][] | null = null;
const getBgColors = (): number[][] => {
  if (cachedBgColors) return cachedBgColors;
  if (typeof document === 'undefined') return [[14, 20, 21]];
  
  const styles = getComputedStyle(document.documentElement);
  const vars = ['--wb-bg', '--wb-surface', '--wb-front-bg', '--wb-back-bg'];
  
  cachedBgColors = vars.map(v => {
    let val = styles.getPropertyValue(v).trim();
    while (val.startsWith('var(')) {
       const innerVar = val.slice(4, -1).trim();
       val = styles.getPropertyValue(innerVar).trim();
    }
    if (val.startsWith('#')) {
       let hex = val.replace('#', '');
       if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
       const num = parseInt(hex, 16);
       if (!isNaN(num)) return [num >> 16, (num >> 8) & 255, num & 255];
    }
    if (val.startsWith('rgb')) {
       const match = val.match(/\d+/g);
       if (match && match.length >= 3) return [Number(match[0]), Number(match[1]), Number(match[2])];
    }
    return [0, 0, 0];
  });
  return cachedBgColors;
};

/**
 * Extracts the predominant color from an image URL.
 * Uses a hidden canvas to sample the image and find the most frequent color bucket.
 * 
 * @param imageUrl The source URL of the image
 * @param opacity Optional opacity to return an RGBA string (e.g., 0.3)
 * @returns A Promise that resolves to a CSS RGB(A) color string
 */
export const extractColor = (imageUrl: string, opacity?: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    // If running in SSR/Node environment, return a fallback immediately
    if (typeof document === 'undefined') {
      resolve(opacity !== undefined ? `rgba(0, 0, 0, ${opacity})` : 'rgb(0, 0, 0)');
      return;
    }

    const img = new Image();
    img.crossOrigin = 'Anonymous'; // Fix CORS
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      // Downscale the image significantly for ultra-fast performance
      const maxDim = 64;
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
      
      // Draw the downscaled image
      ctx.drawImage(img, 0, 0, width, height);
      
      try {
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        
        // Simple color bucketing to find predominant color
        const colorCounts: Record<string, { count: number, rgb: number[] }> = {};
        
        // Iterate over pixels. data array contains [r, g, b, a, r, g, b, a...]
        // We step by 16 (skipping some pixels for speed, sampling every 4th pixel)
        for (let i = 0; i < data.length; i += 16) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];
          
          // Ignore heavily transparent pixels
          if (a < 128) continue;
          
          // Group colors into buckets (round to nearest 16) to group similar shades
          const bucketR = Math.round(r / 16) * 16;
          const bucketG = Math.round(g / 16) * 16;
          const bucketB = Math.round(b / 16) * 16;
          
          // Clamp to 255 just in case
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
        const sortedColors = Object.values(colorCounts).sort((a, b) => b.count - a.count);
        let bestColor = sortedColors.length > 0 ? sortedColors[0].rgb : [0, 0, 0];

        // Reject colors that are too similar to app backgrounds and pure white
        for (const candidate of sortedColors) {
           let isDifferent = true;
           for (const bg of bgs) {
              const dist = Math.sqrt(Math.pow(candidate.rgb[0] - bg[0], 2) + Math.pow(candidate.rgb[1] - bg[1], 2) + Math.pow(candidate.rgb[2] - bg[2], 2));
              if (dist < 50) { // Euclidean distance threshold
                 isDifferent = false;
                 break;
              }
           }
           if (isDifferent) {
              bestColor = candidate.rgb;
              break;
           }
        }
        
        if (opacity !== undefined) {
           resolve(`rgba(${bestColor[0]}, ${bestColor[1]}, ${bestColor[2]}, ${opacity})`);
        } else {
           resolve(`rgb(${bestColor[0]}, ${bestColor[1]}, ${bestColor[2]})`);
        }
      } catch (err) {
        reject(new Error('Canvas image data extraction failed. This is often caused by CORS restrictions on the image.'));
      }
    };
    
    img.onerror = () => {
      reject(new Error(`Failed to load image at ${imageUrl}`));
    };
    
    img.src = imageUrl;
  });
};
