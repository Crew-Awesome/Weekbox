import type { IncomingMessage, ServerResponse } from 'http'
import { USER_AGENT } from '../utils.ts'

export function createProxyImageMiddleware() {
  return async (req: IncomingMessage, res: ServerResponse) => {
    try {
      const parsed = new URL(req.url || '', 'http://localhost')
      const targetUrl = parsed.searchParams.get('url')
      if (!targetUrl) {
        res.statusCode = 400
        return res.end('Missing target url')
      }
      const fetchRes = await fetch(targetUrl, {
        headers: { 'User-Agent': USER_AGENT },
      })
      if (!fetchRes.ok) {
        res.statusCode = fetchRes.status
        return res.end()
      }
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
      res.setHeader(
        'Content-Type',
        fetchRes.headers.get('content-type') || 'image/jpeg',
      )
      const arrayBuffer = await fetchRes.arrayBuffer()
      res.end(Buffer.from(arrayBuffer))
    } catch {
      res.statusCode = 500
      res.end()
    }
  }
}

