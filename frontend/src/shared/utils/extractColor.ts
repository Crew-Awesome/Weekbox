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
        const colorCounts: Record<string, number> = {};
        let maxCount = 0;
        let dominantColor = 'rgb(0, 0, 0)';
        
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
          
          const rgb = `rgb(${finalR}, ${finalG}, ${finalB})`;
          
          colorCounts[rgb] = (colorCounts[rgb] || 0) + 1;
          
          if (colorCounts[rgb] > maxCount) {
            maxCount = colorCounts[rgb];
            if (opacity !== undefined) {
              dominantColor = `rgba(${finalR}, ${finalG}, ${finalB}, ${opacity})`;
            } else {
              dominantColor = rgb;
            }
          }
        }
        
        resolve(dominantColor);
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
