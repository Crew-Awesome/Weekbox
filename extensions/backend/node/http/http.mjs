import fs from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { Readable, Transform } from 'node:stream';
import { httpCache } from './http-cache.mjs';

/**
 * Realiza un fetch nativo con límite de tiempo (timeout).
 * @param {string} url - URL a solicitar.
 * @param {RequestInit} options - Opciones de fetch.
 * @param {number} timeoutMs - Milisegundos antes de abortar.
 * @returns {Promise<Response>} 
 */
const fetchWithTimeout = async (url, options = {}, timeoutMs = 30000, retries = 1, externalSignal = null) => {
  let lastError;
  for (let i = 0; i <= retries; i++) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    
    if (externalSignal) {
      if (externalSignal.aborted) controller.abort();
      externalSignal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(id);
      if (!response.ok) {
        if (response.status === 429 || response.status >= 500) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response;
      }
      return response;
    } catch (error) {
      clearTimeout(id);
      lastError = error;
      if (i < retries) {
        await new Promise(resolve => setTimeout(resolve, 2000));
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
   * Obtiene una respuesta JSON (implementa caché en memoria para peticiones GET).
   * @param {{url: string, options?: RequestInit}} params
   * @returns {Promise<any>}
   */
  async fetchJson({ url, options = {}, signal }) {
    const isGet = !options.method || options.method.toUpperCase() === 'GET';
    
    if (isGet) {
      const cached = httpCache.get(url);
      if (cached) return cached;
    }

    const timeoutMs = options.timeoutMs || 30000;
    const retries = options.retries !== undefined ? options.retries : 1;
    const res = await fetchWithTimeout(url, options, timeoutMs, retries, signal);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    
    if (isGet) {
      httpCache.set(url, data);
    }
    
    return data;
  },

  /**
   * Obtiene texto crudo de una URL.
   * @param {{url: string, options?: RequestInit, signal?: AbortSignal}} params
   * @returns {Promise<string>}
   */
  async fetchText({ url, options = {}, signal }) {
    const res = await fetchWithTimeout(url, options, 30000, 1, signal);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return await res.text();
  },

  /**
   * Descarga un archivo y lo guarda directamente en disco usando Streams, emitiendo progreso opcionalmente.
   * @param {{url: string, destPath: string, options?: RequestInit, signal?: AbortSignal, onProgress?: (downloaded: number, total: number) => void}} params
   * @returns {Promise<void>}
   */
  async downloadToFile({ url, destPath, options = {}, signal, onProgress }) {
    const res = await fetchWithTimeout(url, options, 300000, 1, signal);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    
    const total = Number(res.headers.get('content-length')) || 0;
    
    const nodeStream = Readable.fromWeb(res.body);
    const writeStream = fs.createWriteStream(destPath);

    let downloaded = 0;
    let lastReportTime = 0;

    nodeStream.on('data', (chunk) => {
      downloaded += chunk.length;
      const now = Date.now();
      if (onProgress && now - lastReportTime > 250) {
        onProgress(downloaded, total);
        lastReportTime = now;
      }
    });
    
    try {
      await pipeline(nodeStream, writeStream);
      if (onProgress) onProgress(downloaded, downloaded);
    } catch (error) {
      await fs.promises.rm(destPath, { force: true }).catch(() => {});
      throw error;
    }
  }
};
