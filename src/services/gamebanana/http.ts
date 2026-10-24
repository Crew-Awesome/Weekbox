/**
 * HTTP helper using the native Fetch API with status validation.
 */
export const http = {
  async fetchJson<T = unknown>(url: string, options?: RequestInit): Promise<T> {
    const res = await fetch(url, options)
    if (!res.ok) {
      throw new Error(`HTTP error ${res.status}: ${res.statusText}`)
    }
    return res.json() as Promise<T>
  },

  async fetchText(url: string, options?: RequestInit): Promise<string> {
    const res = await fetch(url, options)
    if (!res.ok) {
      throw new Error(`HTTP error ${res.status}: ${res.statusText}`)
    }
    return res.text()
  },
}

export default http
