import { platform } from "../../platform";
import type { BackendOperation } from "../types";

export const http = {
  async fetchJson(url: string, options?: RequestInit) {
    return await platform.call("http.fetchJson" as BackendOperation, {
      url,
      options,
    });
  },
  async fetchText(url: string, options?: RequestInit) {
    return await platform.call("http.fetchText" as BackendOperation, {
      url,
      options,
    });
  },
  async downloadToFile(
    url: string,
    destPath: string,
    options?: RequestInit & {
      onProgress?: (downloaded: number, total: number) => void;
    },
  ) {
    const { onProgress, ...fetchOptions } = options || {};

    // Si hay un callback de progreso, necesitamos suscribirnos temporalmente a los eventos
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
