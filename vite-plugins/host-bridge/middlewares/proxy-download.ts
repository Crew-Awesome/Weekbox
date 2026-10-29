import type { IncomingMessage, ServerResponse } from 'http'
import { USER_AGENT } from '../utils.ts'

export function createProxyDownloadMiddleware() {
  return async (req: IncomingMessage, res: ServerResponse) => {
    const abortController = new AbortController()
    res.on('close', () => {
      if (!res.writableEnded) {
        abortController.abort()
      }
    })

    try {
      const parsed = new URL(req.url || '', 'http://localhost')
      const targetUrl = parsed.searchParams.get('url')
      if (!targetUrl) {
        res.statusCode = 400
        return res.end('Missing target url')
      }

      const fetchRes = await fetch(targetUrl, {
        headers: {
          'User-Agent': USER_AGENT,
          'Accept-Language': 'en-US,en;q=0.9',
        },
        redirect: 'follow',
        signal: abortController.signal,
      })

      if (!fetchRes.ok) {
        res.statusCode = fetchRes.status
        return res.end(`Upstream HTTP ${fetchRes.status}`)
      }

      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
      res.setHeader(
        'Access-Control-Expose-Headers',
        'Content-Length, Content-Type, Content-Disposition',
      )
      res.setHeader(
        'Content-Type',
        fetchRes.headers.get('content-type') || 'application/octet-stream',
      )
      const contentLength = fetchRes.headers.get('content-length')
      if (contentLength) {
        res.setHeader('Content-Length', contentLength)
      }

      if (!fetchRes.body) {
        const buf = await fetchRes.arrayBuffer()
        return res.end(Buffer.from(buf))
      }

      const reader = fetchRes.body.getReader()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        if (value) {
          const canContinue = res.write(Buffer.from(value))
          if (!canContinue) {
            await new Promise<void>((resolve) => res.once('drain', resolve))
          }
        }
      }
      res.end()
    } catch (err) {
      if (!res.headersSent) {
        res.statusCode = 500
      }
      if (!res.writableEnded) {
        res.end(err instanceof Error ? err.message : 'Proxy download error')
      }
    }
  }
}

