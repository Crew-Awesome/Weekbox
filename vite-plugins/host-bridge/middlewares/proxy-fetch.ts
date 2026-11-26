import type { IncomingMessage, ServerResponse } from 'http'
import { USER_AGENT, readJsonBody } from '../utils.ts'

const ALLOWED_PROXY_HOSTS = new Set([
  'gamebanana.com',
  'www.gamebanana.com',
  'gamejolt.com',
  'www.gamejolt.com',
  'api.funkinbackstage.net',
  'funkinbackstage.net',
])

function isAllowedTargetUrl(rawUrl: string): URL | null {
  try {
    const parsed = new URL(rawUrl)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null
    const host = parsed.hostname.toLowerCase()
    if (ALLOWED_PROXY_HOSTS.has(host)) return parsed
    if (host.endsWith('.gamejolt.com') || host.endsWith('.gamebanana.com')) {
      return parsed
    }
    return null
  } catch {
    return null
  }
}

export function createProxyFetchMiddleware() {
  return async (req: IncomingMessage, res: ServerResponse) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    if (req.method === 'OPTIONS') {
      res.statusCode = 200
      return res.end()
    }
    if (req.method !== 'POST') {
      res.statusCode = 405
      return res.end('Method not allowed')
    }

    try {
      const body = await readJsonBody(req)
      const parsedUrl = isAllowedTargetUrl(String(body.url || ''))
      if (!parsedUrl) {
        res.statusCode = 400
        return res.end(JSON.stringify({ error: 'Invalid or disallowed target URL' }))
      }

      const method =
        String(body.method || 'GET').toUpperCase() === 'POST' ? 'POST' : 'GET'
      const upstreamHeaders: Record<string, string> = {
        'User-Agent': USER_AGENT,
        Accept: 'application/json, text/plain, */*',
      }
      if (body.headers && typeof body.headers === 'object') {
        for (const [k, v] of Object.entries(body.headers as Record<string, unknown>)) {
          if (typeof v === 'string' && k.toLowerCase() !== 'host') {
            upstreamHeaders[k] = v
          }
        }
      }

      const fetchRes = await fetch(parsedUrl.href, {
        method,
        headers: upstreamHeaders,
        ...(method === 'POST' && typeof body.body === 'string'
          ? { body: body.body }
          : {}),
      })

      const text = await fetchRes.text()
      res.statusCode = fetchRes.status
      res.setHeader(
        'Content-Type',
        fetchRes.headers.get('content-type') || 'application/json; charset=utf-8',
      )
      return res.end(text)
    } catch (err) {
      res.statusCode = 502
      return res.end(
        JSON.stringify({
          error: err instanceof Error ? err.message : 'Proxy fetch failed',
        }),
      )
    }
  }
}
