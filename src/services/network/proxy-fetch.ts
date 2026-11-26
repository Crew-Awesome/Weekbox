/**
 * Unified network helper for provider APIs (`GameBanana`, `GameJolt`, `FunkinBackstage`).
 * Uses Neutralino.net when reachable in desktop runtime, routes through Vite's `/api/proxy-fetch`
 * middleware in browser dev mode when needed to bypass CORS, and supports standard `fetch`.
 */

const CORS_RESTRICTED_HOSTS = new Set([
  'gamejolt.com',
  'www.gamejolt.com',
  'api.funkinbackstage.net',
  'funkinbackstage.net',
])

const NEUTRALINO_NET_COOLDOWN_MS = 30000
let neutralinoNetUnavailableUntil = 0

interface NeutralinoResponse {
  status?: number
  statusCode?: number
  body?: string
  text?: string
  reason?: string
  statusText?: string
  headers?: Record<string, string>
}

function toHeaderRecord(headers?: HeadersInit): Record<string, string> | undefined {
  if (!headers) return undefined
  if (headers instanceof Headers) {
    const out: Record<string, string> = {}
    headers.forEach((value, key) => {
      out[key] = value
    })
    return out
  }
  if (Array.isArray(headers)) {
    return Object.fromEntries(headers)
  }
  return headers as Record<string, string>
}

function toResponse(result: NeutralinoResponse): Response {
  const status = Number(result?.statusCode ?? result?.status)
  const text = String(result?.text ?? result?.body ?? '')
  const responseStatus = status >= 100 && status <= 599 ? status : 200

  return {
    ok: responseStatus >= 200 && responseStatus < 300,
    status: responseStatus,
    statusText: result?.reason || result?.statusText || '',
    headers: new Headers(result?.headers || {}),
    text: async () => text,
    json: async () => JSON.parse(text),
    blob: async () => new Blob([text]),
    arrayBuffer: async () => new TextEncoder().encode(text).buffer,
  } as Response
}

async function tryNeutralinoNet(
  url: string,
  method: string,
  headers?: Record<string, string>,
  body?: string,
): Promise<Response | null> {
  if (Date.now() < neutralinoNetUnavailableUntil || typeof window === 'undefined') {
    return null
  }
  const neutralinoNet = (
    window as unknown as {
      Neutralino?: {
        net?: {
          request?: (u: string, m: string, opts: unknown) => Promise<NeutralinoResponse>
          get?: (u: string, opts: unknown) => Promise<NeutralinoResponse>
        }
      }
    }
  ).Neutralino?.net

  if (!neutralinoNet) return null

  const options: {
    headers?: Record<string, string>
    body?: string
    timeout?: number
  } = { timeout: 6000 }
  if (headers) options.headers = headers
  if (body) options.body = body

  let req: Promise<NeutralinoResponse> | null = null
  if (typeof neutralinoNet.request === 'function') {
    req = neutralinoNet.request(url, method, options)
  } else if (method === 'GET' && typeof neutralinoNet.get === 'function') {
    req = neutralinoNet.get(url, options)
  }
  if (!req) return null

  try {
    const raw = await Promise.race([
      req.catch((err: NeutralinoResponse) => {
        const s = Number(err?.statusCode ?? err?.status)
        if (s >= 100 && s <= 599) return err
        throw err
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Neutralino.net timed out')), 1500),
      ),
    ])
    return toResponse(raw)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err || '')
    if (msg.toLowerCase().includes('timed out')) {
      neutralinoNetUnavailableUntil = Date.now() + NEUTRALINO_NET_COOLDOWN_MS
    }
    return null
  }
}

export async function providerFetch(
  input: string | URL,
  init?: RequestInit,
): Promise<Response> {
  const url = String(input)
  const method = (init?.method || 'GET').toUpperCase()
  const headers = toHeaderRecord(init?.headers)
  const body = typeof init?.body === 'string' ? init.body : undefined

  const nativeRes = await tryNeutralinoNet(url, method, headers, body)
  if (nativeRes) return nativeRes

  let isCorsRestricted = false
  try {
    const host = new URL(url).hostname.toLowerCase()
    isCorsRestricted =
      CORS_RESTRICTED_HOSTS.has(host) || host.endsWith('.gamejolt.com')
  } catch {
  }

  if (isCorsRestricted && typeof window !== 'undefined') {
    try {
      const proxyRes = await fetch('/api/proxy-fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, method, headers, body }),
        signal: init?.signal,
      })
      if (proxyRes.status !== 404) {
        return proxyRes
      }
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') throw err
    }
  }

  return fetch(input, init)
}

export async function providerFetchJson<T = unknown>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const res = await providerFetch(url, init)
  if (!res.ok) {
    throw new Error(`HTTP error ${res.status}: ${res.statusText}`)
  }
  return res.json() as Promise<T>
}
