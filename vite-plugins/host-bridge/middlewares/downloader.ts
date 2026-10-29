import path from 'path'
import fs from 'fs'
import { Readable, Transform } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import type { IncomingMessage, ServerResponse } from 'http'
import {
  USER_AGENT,
  formatBytes,
  formatSpeed,
  readJsonBody,
  resolveSafeBridgePath,
} from '../utils.ts'

export function createDownloaderMiddleware() {
  return async (req: IncomingMessage, res: ServerResponse) => {
    if (req.method !== 'POST') {
      res.statusCode = 405
      return res.end('Method not allowed')
    }

    const abortController = new AbortController()
    let destFilePath = ''
    let fileStream: fs.WriteStream | null = null
    let completed = false
    let clientClosed = false

    const send = (payload: Record<string, unknown>) => {
      if (clientClosed || res.destroyed || res.writableEnded) return
      try {
        res.write(JSON.stringify(payload) + '\n')
      } catch {
      }
    }

    res.on('close', () => {
      clientClosed = true
      if (!completed) {
        abortController.abort()
        fileStream?.destroy()
      }
    })

    try {
      const body = await readJsonBody(req)
      const url = String(body.url || '')
      destFilePath = resolveSafeBridgePath(String(body.destinationPath || ''))
      const expectedSize = Number(body.expectedSize || 0)

      if (!url || !destFilePath) {
        res.statusCode = 400
        return res.end(
          JSON.stringify({ error: 'Missing url or destinationPath' }) + '\n',
        )
      }

      const parentDir = path.dirname(destFilePath)
      fs.mkdirSync(parentDir, { recursive: true })

      res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')
      res.setHeader('Access-Control-Allow-Origin', '*')

      send({
        type: 'progress',
        progress: 1,
        downloaded: 0,
        total: expectedSize,
        speed: 'Connecting...',
        statusText: 'Connecting to server...',
      })

      const fetchRes = await fetch(url, {
        headers: {
          'User-Agent': USER_AGENT,
          'Accept-Language': 'en-US,en;q=0.9',
        },
        redirect: 'follow',
        signal: abortController.signal,
      })

      if (!fetchRes.ok) {
        throw new Error(`HTTP ${fetchRes.status}: ${fetchRes.statusText}`)
      }

      const contentLength = Number(
        fetchRes.headers.get('content-length') || 0,
      )
      const totalBytes = contentLength > 0 ? contentLength : expectedSize

      if (abortController.signal.aborted) {
        throw new DOMException('Download canceled', 'AbortError')
      }

      const stream = fs.createWriteStream(destFilePath)
      fileStream = stream

      if (!fetchRes.body) {
        const buf = Buffer.from(await fetchRes.arrayBuffer())
        await pipeline(Readable.from(buf), stream)
        fileStream = null
        completed = true

        send({
          type: 'done',
          done: true,
          progress: 98,
          downloaded: buf.byteLength,
          total: totalBytes || buf.byteLength,
          speed: '',
          statusText: 'Download finished',
        })
        res.end()
        return
      }

      let receivedLength = 0
      let lastBytes = 0
      let lastTick = performance.now()
      let smoothedSpeed = 0
      let isFirstChunk = true

      const progressStream = new Transform({
        transform(chunk, _encoding, callback) {
          const chunkBuf = Buffer.isBuffer(chunk)
            ? chunk
            : Buffer.from(chunk)
          receivedLength += chunkBuf.byteLength

          const now = performance.now()
          const elapsedSec = (now - lastTick) / 1000
          if (elapsedSec >= 0.1 || isFirstChunk) {
            isFirstChunk = false
            const instantSpeed =
              elapsedSec > 0
                ? (receivedLength - lastBytes) / elapsedSec
                : 0
            smoothedSpeed =
              smoothedSpeed === 0
                ? instantSpeed
                : smoothedSpeed * 0.65 + instantSpeed * 0.35
            lastBytes = receivedLength
            lastTick = now

            const effectiveTotal =
              totalBytes > 0 ? Math.max(totalBytes, receivedLength) : 0
            const percent =
              effectiveTotal > 0
                ? Math.min(
                    98,
                    Math.max(
                      2,
                      Math.floor((receivedLength / effectiveTotal) * 98),
                    ),
                  )
                : Math.min(
                    95,
                    Math.max(
                      2,
                      Math.floor(receivedLength / (1024 * 512)),
                    ),
                  )

            send({
              type: 'progress',
              progress: percent,
              downloaded: receivedLength,
              total: effectiveTotal,
              speed: formatSpeed(smoothedSpeed),
              statusText: `Downloading (${formatBytes(receivedLength)})...`,
            })
          }

          callback(null, chunkBuf)
        },
      })

      await pipeline(
        Readable.fromWeb(fetchRes.body),
        progressStream,
        stream,
      )
      fileStream = null
      completed = true

      send({
        type: 'done',
        done: true,
        progress: 98,
        downloaded: receivedLength,
        total:
          totalBytes > 0
            ? Math.max(totalBytes, receivedLength)
            : receivedLength,
        speed: formatSpeed(smoothedSpeed),
        statusText: `Downloaded (${formatBytes(receivedLength)})`,
      })
      res.end()
    } catch (err) {
      if (fileStream) {
        fileStream.destroy()
        fileStream = null
      }
      if (!completed && destFilePath && fs.existsSync(destFilePath)) {
        try {
          fs.rmSync(destFilePath, { force: true })
        } catch {
        }
      }
      if (!clientClosed && !res.writableEnded) {
        send({
          error: err instanceof Error ? err.message : String(err),
        })
        res.end()
      }
    }
  }
}

