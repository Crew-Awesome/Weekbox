import { platform } from "../../platform";
import type { BackendOperation } from "../types";

/**
 * @description Unified HTTP interface that delegates network requests to the Node.js backend.
 * Bypasses CORS limitations of the browser/webview.
 */
export const http = {
  /**
   * @description Fetches a URL and parses the response as JSON.
   * @param {string} url - The target URL.
   * @param {RequestInit} [options] - Standard Fetch API options.
   * @returns {Promise<any>} The parsed JSON data.
   */
  async fetchJson(url: string, options?: RequestInit) {
    return await platform.call("http.fetchJson" as BackendOperation, {
      url,
      options,
    });
  },

  /**
   * @description Fetches a URL and returns the raw text response.
   * @param {string} url - The target URL.
   * @param {RequestInit} [options] - Standard Fetch API options.
   * @returns {Promise<string>} The raw text response.
   */
  async fetchText(url: string, options?: RequestInit) {
    return await platform.call("http.fetchText" as BackendOperation, {
      url,
      options,
    });
  },

  /**
   * @description Downloads a file from a URL directly to the local filesystem via Node.js streams.
   * Supports progress tracking through IPC events.
   * @param {string} url - The URL of the file to download.
   * @param {string} destPath - The local absolute path where the file should be saved.
   * @param {object} [options] - Fetch options and an optional onProgress callback.
   * @returns {Promise<any>} Result of the backend operation.
   */
  async downloadToFile(
    url: string,
    destPath: string,
    options?: RequestInit & {
      onProgress?: (downloaded: number, total: number) => void;
    },
  ) {
    const { onProgress, ...fetchOptions } = options || {};

    // If there is a progress callback, temporarily subscribe to IPC progress events
    let unsub = () => {};
    if (onProgress) {
      unsub = platform.onEvent("download:progress", (data) => {
        if (data.downloaded !== undefined && data.total !== undefined) {
          onProgress(data.downloaded, data.total);
        }
      });
    }

    try {
      const result = await platform.call(
        "http.downloadToFile" as BackendOperation,
        { url, destPath, options: fetchOptions },
      );
      return result;
    } finally {
      unsub();
    }
  },
};

export default http;
