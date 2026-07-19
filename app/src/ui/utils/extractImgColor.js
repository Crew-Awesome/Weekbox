/**
 * Converts RGB color values to HSL.
 * @param {number} r - Red (0-255)
 * @param {number} g - Green (0-255)
 * @param {number} b - Blue (0-255)
 * @returns {Array<number>} [hue, saturation, lightness]
 */
function rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0; // achromatic
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return [h * 360, s * 100, l * 100];
}

/**
 * Converts an RGB array to a Hex string.
 * @param {number} r 
 * @param {number} g 
 * @param {number} b 
 * @returns {string} Hex color string
 */
function rgbToHex(r, g, b) {
    return "#" + [r, g, b].map(x => {
        const hex = Math.round(x).toString(16);
        return hex.length === 1 ? "0" + hex : hex;
    }).join('');
}

/**
 * Calculates perceived brightness (luma) of an RGB color.
 * Used to determine contrasting text color (white or black).
 * @param {number} r 
 * @param {number} g 
 * @param {number} b 
 * @returns {number} Brightness value between 0 and 255
 */
export function getLuminance(r, g, b) {
    return (r * 299 + g * 587 + b * 114) / 1000;
}

/**
 * Extracts the most dominant vibrant color from an image URL.
 * Filters out dark colors, whites, and grays.
 * @param {string} src - Image URL
 * @returns {Promise<Object>} Resolves to an object with { hex, r, g, b, isDark }
 */
export function extractImageColor(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Downscale for performance
            const maxDimension = 64;
            let width = img.width;
            let height = img.height;
            
            if (width > height) {
                if (width > maxDimension) {
                    height *= maxDimension / width;
                    width = maxDimension;
                }
            } else {
                if (height > maxDimension) {
                    width *= maxDimension / height;
                    height = maxDimension;
                }
            }
            
            canvas.width = Math.floor(width);
            canvas.height = Math.floor(height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            let data;
            try {
                data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
            } catch (e) {
                return reject(e);
            }
            
            const colorCounts = {};
            let maxCount = 0;
            let dominantRGB = [0, 0, 0];
            
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                const a = data[i + 3];
                
                // Skip transparent pixels
                if (a < 128) continue;
                
                const [h, s, l] = rgbToHsl(r, g, b);
                
                // Filter out very dark, very light, and unsaturated colors (grays)
                if (l < 15 || l > 85 || s < 20) continue;
                
                // Bucket the colors to group similar hues and brightness
                const rBucket = Math.round(r / 10) * 10;
                const gBucket = Math.round(g / 10) * 10;
                const bBucket = Math.round(b / 10) * 10;
                
                const key = `${rBucket},${gBucket},${bBucket}`;
                
                if (!colorCounts[key]) {
                    colorCounts[key] = { r: rBucket, g: gBucket, b: bBucket, count: 0 };
                }
                colorCounts[key].count++;
                
                if (colorCounts[key].count > maxCount) {
                    maxCount = colorCounts[key].count;
                    dominantRGB = [colorCounts[key].r, colorCounts[key].g, colorCounts[key].b];
                }
            }
            
            // Fallback if no vibrant color found
            if (maxCount === 0) {
                resolve({
                    hex: '#333333',
                    r: 51, g: 51, b: 51,
                    isDark: true
                });
                return;
            }
            
            const [r, g, b] = dominantRGB;
            const luminance = getLuminance(r, g, b);
            
            resolve({
                hex: rgbToHex(r, g, b),
                r, g, b,
                isDark: luminance < 128
            });
        };
        
        img.onerror = reject;
        img.src = src;
    });
}
