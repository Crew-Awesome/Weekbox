import fs from 'node:fs';
import https from 'node:https';
import http from 'node:http';
import { URL } from 'node:url';
import { spawn } from 'node:child_process';
import { pipeline } from 'node:stream/promises';
import { Transform } from 'node:stream';
import { httpCache } from './http-cache.mjs';

const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const httpsAgent = new https.Agent({ keepAlive: true, timeout: 60000 });
const httpAgent = new http.Agent({ keepAlive: true, timeout: 60000 });

/**
 * Realiza un fetch nativo con límite de tiempo (timeout).
 * @param {string} url - URL a solicitar.
 * @param {RequestInit} options - Opciones de fetch.
 * @param {number} timeoutMs - Milisegundos antes de abortar.
 * @returns {Promise<Response>} 
 */
const fetchWithTimeout = async (url, options = {}, timeoutMs = 30000, retries = 1, externalSignal = null) => {
  let lastError;
  const mergedHeaders = {
    'User-Agent': BROWSER_USER_AGENT,
    'Accept': '*/*',
    ...(options.headers || {}),
  };

  for (let i = 0; i <= retries; i++) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);

    if (externalSignal) {
      if (externalSignal.aborted) controller.abort();
      externalSignal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers: mergedHeaders,
        signal: controller.signal,
      });
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

function getCurlBin() {
  if (process.platform === 'darwin' && fs.existsSync('/usr/bin/curl')) {
    return '/usr/bin/curl';
  }
  if (process.platform === 'win32') {
    const sysCurl = `${process.env.SystemRoot || 'C:\\Windows'}\\System32\\curl.exe`;
    if (fs.existsSync(sysCurl)) return sysCurl;
  }
  return 'curl';
}

/**
 * Descarga archivos de alta velocidad utilizando el binario nativo curl del sistema operativo.
 * Ofrece soporte para HTTP/2, multiplexación y buffers directos de red del kernel.
 */
async function curlDownload(targetUrl, destPath, options = {}, signal = null, onProgress = null) {
  const headerPath = `${destPath}.headers.${Date.now()}`;
  const curlBin = getCurlBin();

  return new Promise((resolve, reject) => {
    const args = [
      '-L',
      '-s',
      '-S',
      '-f',
      '--connect-timeout',
      '15',
      '-D',
      headerPath,
      '-A',
      options.headers?.['User-Agent'] || BROWSER_USER_AGENT,
      '--retry',
      '2',
      '--retry-delay',
      '1',
      '--speed-time',
      '60',
      '--speed-limit',
      '1',
      '-o',
      destPath,
      targetUrl,
    ];

    let child = null;
    let stderr = '';
    let interval = null;
    let settled = false;
    let total = 0;
    let lastProgress = 0;

    const cleanup = () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };

    const parseTotalFromHeaders = async () => {
      if (total > 0) return total;
      try {
        const txt = await fs.promises.readFile(headerPath, 'utf8');
        const matches = [...txt.matchAll(/content-length:\s*(\d+)/gi)];
        if (matches.length > 0) {
          total = Number(matches[matches.length - 1][1]) || 0;
        }
      } catch {}
      return total;
    };

    try {
      child = spawn(curlBin, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    } catch (spawnErr) {
      cleanup();
      fs.promises.rm(headerPath, { force: true }).catch(() => {});
      return reject(spawnErr);
    }

    if (onProgress) {
      onProgress(0, 0);
    }

    child.stderr?.on('data', (d) => {
      stderr += d.toString();
    });

    interval = setInterval(async () => {
      try {
        if (!total) {
          await parseTotalFromHeaders();
        }
        const stat = await fs.promises.stat(destPath);
        const now = Date.now();
        if (now - lastProgress > 250) {
          lastProgress = now;
          if (onProgress) onProgress(stat.size, total);
        }
      } catch {
        if (!total) {
          await parseTotalFromHeaders();
        }
        if (onProgress && total > 0 && lastProgress === 0) {
          lastProgress = Date.now();
          onProgress(0, total);
        }
      }
    }, 150);

    const abortHandler = () => {
      if (settled) return;
      settled = true;
      cleanup();
      try { child.kill('SIGTERM'); } catch {}
      fs.promises.rm(headerPath, { force: true }).catch(() => {});
      fs.promises.rm(destPath, { force: true }).catch(() => {});
      reject(new Error('Cancelled'));
    };

    if (signal) {
      if (signal.aborted) {
        return abortHandler();
      }
      signal.addEventListener('abort', abortHandler, { once: true });
    }

    child.on('close', async (code) => {
      if (settled) return;
      settled = true;
      cleanup();
      await fs.promises.rm(headerPath, { force: true }).catch(() => {});

      if (code === 0) {
        try {
          const stat = await fs.promises.stat(destPath);
          if (onProgress) onProgress(stat.size, stat.size);
          resolve();
        } catch {
          resolve();
        }
      } else {
        await fs.promises.rm(destPath, { force: true }).catch(() => {});
        reject(new Error(`curl falló con código ${code}: ${stderr.trim()}`));
      }
    });

    child.on('error', async (err) => {
      if (settled) return;
      settled = true;
      cleanup();
      await fs.promises.rm(headerPath, { force: true }).catch(() => {});
      await fs.promises.rm(destPath, { force: true }).catch(() => {});
      reject(err);
    });
  });
}

/**
 * Realiza la descarga directa a disco mediante streams nativos de Node.js,
 * siguiendo redirecciones y gestionando contrapresión con buffers amplios.
 */
async function streamDownload(initialUrl, destPath, options = {}, signal = null, onProgress = null) {
  let currentUrl = initialUrl;
  let redirectCount = 0;

  while (redirectCount <= 10) {
    if (signal?.aborted) {
      await fs.promises.rm(destPath, { force: true }).catch(() => {});
      throw new Error('Cancelled');
    }

    const parsed = new URL(currentUrl);
    const isHttps = parsed.protocol === 'https:';
    const client = isHttps ? https : http;
    const agent = isHttps ? httpsAgent : httpAgent;

    const requestHeaders = {
      'User-Agent': BROWSER_USER_AGENT,
      'Accept': '*/*',
      'Accept-Encoding': 'identity',
      ...(options.headers || {}),
    };

    const res = await new Promise((resolve, reject) => {
      let req = client.get(
        currentUrl,
        {
          headers: requestHeaders,
          agent,
        },
        resolve
      );

      req.setTimeout(30000, () => {
        req.destroy(new Error('Request timeout'));
      });

      const abortListener = () => {
        req.destroy();
        reject(new Error('Cancelled'));
      };

      if (signal) {
        signal.addEventListener('abort', abortListener, { once: true });
      }

      req.on('error', (err) => {
        if (signal) signal.removeEventListener('abort', abortListener);
        reject(err);
      });
    });

    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
      res.resume();
      currentUrl = new URL(res.headers.location, currentUrl).toString();
      redirectCount++;
      continue;
    }

    if (res.statusCode < 200 || res.statusCode >= 300) {
      res.resume();
      await fs.promises.rm(destPath, { force: true }).catch(() => {});
      throw new Error(`HTTP error! status: ${res.statusCode}`);
    }

    const total = Number(res.headers['content-length']) || 0;
    if (onProgress) onProgress(0, total);
    let downloaded = 0;
    let lastReportTime = 0;
    let idleTimeout = null;

    const resetIdleTimeout = () => {
      if (idleTimeout) clearTimeout(idleTimeout);
      idleTimeout = setTimeout(() => {
        if (res && res.destroy) res.destroy(new Error('Download stalled (idle timeout)'));
      }, 60000);
    };

    const progressTransform = new Transform({
      highWaterMark: 1024 * 1024,
      transform(chunk, _encoding, callback) {
        resetIdleTimeout();
        downloaded += chunk.length;
        const now = Date.now();
        if (onProgress && (now - lastReportTime > 250 || downloaded === total)) {
          onProgress(downloaded, total);
          lastReportTime = now;
        }
        callback(null, chunk);
      },
    });

    const writeStream = fs.createWriteStream(destPath, { highWaterMark: 1024 * 1024 });

    try {
      resetIdleTimeout();
      await pipeline(res, progressTransform, writeStream);
      if (idleTimeout) clearTimeout(idleTimeout);
      if (onProgress) onProgress(downloaded, total || downloaded);
      return;
    } catch (err) {
      if (idleTimeout) clearTimeout(idleTimeout);
      await fs.promises.rm(destPath, { force: true }).catch(() => {});
      throw err;
    }
  }

  throw new Error('Demasiadas redirecciones HTTP');
}

/**
 * API de cliente HTTP para Node.js.
 */
export const httpApi = {
  /**
   * Obtiene una respuesta JSON (implementa caché en memoria para peticiones GET).
   * @param {{url: string, options?: RequestInit, signal?: AbortSignal}} params
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
   * Descarga un archivo directamente a disco mediante curl optimizado con fallback a stream de Node.js.
   * @param {{url: string, destPath: string, options?: RequestInit, signal?: AbortSignal, onProgress?: (downloaded: number, total: number) => void}} params
   * @returns {Promise<void>}
   */
  async downloadToFile({ url, destPath, options = {}, signal, onProgress }) {
    if (process.platform === 'darwin') {
      return await streamDownload(url, destPath, options, signal, onProgress);
    }
    try {
      return await curlDownload(url, destPath, options, signal, onProgress);
    } catch (curlErr) {
      if (signal?.aborted || curlErr?.message === 'Cancelled') {
        throw curlErr;
      }
      return await streamDownload(url, destPath, options, signal, onProgress);
    }
  },
};
