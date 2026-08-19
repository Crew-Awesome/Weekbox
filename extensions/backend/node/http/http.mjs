import fs from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { Readable, Transform } from 'node:stream';

/**
 * Realiza un fetch nativo con límite de tiempo (timeout).
 * @param {string} url - URL a solicitar.
 * @param {RequestInit} options - Opciones de fetch.
 * @param {number} timeoutMs - Milisegundos antes de abortar.
 * @returns {Promise<Response>} 
 */
const fetchWithTimeout = async (url, options = {}, timeoutMs = 30000, retries = 1) => {
  let lastError;
  for (let i = 0; i <= retries; i++) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(id);
      if (!response.ok) {
        if (response.status === 429 || response.status >= 500) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response; // Si es 404 o 403 que lo maneje el caller
      }
      return response;
    } catch (error) {
      clearTimeout(id);
      lastError = error;
      if (i < retries) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Esperar 2s antes de reintentar
      }
    }
  }
  throw lastError;
};

/**
 * API de cliente HTTP para Node.js.
 */
export const httpApi = {
  /**
   * Obtiene una respuesta JSON.
   * @param {{url: string, options?: RequestInit}} params
   * @returns {Promise<any>}
   */
  async fetchJson({ url, options = {} }) {
    const res = await fetchWithTimeout(url, options);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return await res.json();
  },

  /**
   * Obtiene texto crudo de una URL.
   * @param {{url: string, options?: RequestInit}} params
   * @returns {Promise<string>}
   */
  async fetchText({ url, options = {} }) {
    const res = await fetchWithTimeout(url, options);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return await res.text();
  },

  /**
   * Descarga un archivo y lo guarda directamente en disco usando Streams, emitiendo progreso opcionalmente.
   * @param {{url: string, destPath: string, options?: RequestInit, onProgress?: (downloaded: number, total: number) => void}} params
   * @returns {Promise<void>}
   */
  async downloadToFile({ url, destPath, options = {}, onProgress }) {
    // 5 min timeout para descargas grandes
    const res = await fetchWithTimeout(url, options, 300000);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    
    const total = Number(res.headers.get('content-length')) || 0;
    let downloaded = 0;
    
    // Stream intermedio para reportar progreso
    const progressStream = new Transform({
      transform(chunk, encoding, callback) {
        downloaded += chunk.length;
        if (onProgress) onProgress(downloaded, total);
        callback(null, chunk);
      }
    });

    const nodeStream = Readable.fromWeb(res.body);
    await pipeline(nodeStream, progressStream, fs.createWriteStream(destPath));
  }
};
