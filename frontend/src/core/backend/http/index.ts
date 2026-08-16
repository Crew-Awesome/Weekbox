import { platform } from '../../platform';
import type { BackendOperation } from '../types';

export const http = {
  async fetchJson(url: string, options?: RequestInit) {
    return await platform.call('http.fetchJson' as BackendOperation, { url, options });
  },
  async fetchText(url: string, options?: RequestInit) {
    return await platform.call('http.fetchText' as BackendOperation, { url, options });
  }
};


export default http;
