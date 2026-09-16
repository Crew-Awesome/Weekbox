/**
 * Utility for client-side image processing and WebP base64 compression (SRP).
 * Keeps visual and canvas manipulations decoupled from low-level platform adapters.
 */
export async function compressImageToWebpBase64(
  imageUrl: string,
  maxWidth: number = 400,
  quality: number = 0.6
): Promise<string> {
  if (typeof window === "undefined" || !imageUrl) return "";

  try {
    const res = await fetch(imageUrl);
    const blob = await res.blob();

    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement("canvas");
    let width = bitmap.width;
    let height = bitmap.height;

    if (width > maxWidth) {
      height = Math.round((height * maxWidth) / width);
      width = maxWidth;
    }

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(bitmap, 0, 0, width, height);
      return canvas.toDataURL("image/webp", quality);
    }
  } catch (err) {
    console.warn("[ImageProcessor] Failed to compress thumbnail:", err);
  }

  return "";
}
