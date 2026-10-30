/**
 * Native-aware fetch utility for Neutralino and browser environments.
 * Uses Neutralino.net when available to bypass WebView2 localhost CORS restrictions,
 * falling back to standard Fetch API.
 */

function toHeaders(headers: HeadersInit | undefined): Record<string, string> | undefined {
  if (!headers) return undefined
  if (headers instanceof Headers) {
    const obj: Record<string, string> = {}
    headers.forEach((val, key) => {
      obj[key] = val
    })
    return obj
  }
  if (Array.isArray(headers)) {
    return Object.fromEntries(headers)
  }
  return headers as Record<string, string>
}

interface NeutralinoResponse {
  status?: number
  statusCode?: number
  body?: string
  text?: string
  reason?: string
  statusText?: string
  headers?: Record<string, string>
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

function asHttpResponse(error: unknown): Response {
  const err = error as NeutralinoResponse | undefined
  const status = Number(err?.statusCode ?? err?.status)
  if (status >= 100 && status <= 599) {
    return toResponse(err!)
  }
  throw error
}

export async function nativeFetch(
  input: string | URL,
  init?: RequestInit,
): Promise<Response> {
  const url = String(input)
  const method = (init?.method || 'GET').toUpperCase()

  // 1. Check if Neutralino.net is available
  const neutralinoNet =
    typeof window !== 'undefined'
      ? (
          window as unknown as {
            Neutralino?: {
              net?: {
                request?: (url: string, method: string, options: unknown) => Promise<NeutralinoResponse>
                get?: (url: string, options: unknown) => Promise<NeutralinoResponse>
              }
            }
          }
        ).Neutralino?.net
      : undefined

  if (neutralinoNet) {
    try {
      const options: {
        headers?: Record<string, string>
        body?: string
        timeout?: number
      } = {}

      const h = toHeaders(init?.headers)
      if (h) options.headers = h
      if (init?.body && typeof init.body === 'string') options.body = init.body

      let nativeReq: Promise<NeutralinoResponse> | null = null
      if (typeof neutralinoNet.request === 'function') {
        nativeReq = neutralinoNet.request(url, method, options)
      } else if (method === 'GET' && typeof neutralinoNet.get === 'function') {
        nativeReq = neutralinoNet.get(url, options)
      }

      if (nativeReq) {
        const rawRes = await nativeReq.catch(asHttpResponse)
        if (rawRes && typeof rawRes === 'object' && 'ok' in rawRes) {
          return rawRes as Response
        }
        return toResponse(rawRes as NeutralinoResponse)
      }
    } catch {
      // Fallback to standard fetch if Neutralino net fails
    }
  }

  // 2. Standard browser fetch
  return fetch(input, init)
}

