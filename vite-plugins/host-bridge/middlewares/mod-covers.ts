import path from 'path'
import fs from 'fs'
import type { IncomingMessage, ServerResponse } from 'http'
import { PROJECT_ROOT, USER_AGENT, getLocalAppData } from '../utils.ts'

export function createModCoversMiddleware() {
  return async (
    req: IncomingMessage,
    res: ServerResponse,
    next: () => void,
  ) => {
    try {
      const parsed = new URL(req.url || '', 'http://localhost')
      let fileName = ''
      if (parsed.searchParams.has('file')) {
        fileName = path.basename(parsed.searchParams.get('file') || '')
      } else {
        const raw = parsed.pathname
          .replace(/.*?\/mod-covers\/?/, '')
          .replace(/^\/api\/mod-cover\/?/, '')
        fileName = path.basename(raw)
      }

      if (!fileName || fileName === 'mod-covers' || fileName === '.') {
        return next()
      }

      const localAppData = getLocalAppData()

      const candidatePaths = [
        path.join(localAppData, 'WeekBoxLibrary/data/mod-covers', fileName),
        path.join(PROJECT_ROOT, 'data/mod-covers', fileName),
      ]

      for (const cand of candidatePaths) {
        if (fs.existsSync(cand)) {
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Content-Type', 'image/webp')
          res.setHeader('Cache-Control', 'public, max-age=86400')
          return fs.createReadStream(cand).pipe(res)
        }
      }

      const baseId = fileName.split('--')[0].replace(/\.webp$/i, '')
      if (/^\d+$/.test(baseId)) {
        try {
          const gbRes = await fetch(
            `https://gamebanana.com/apiv11/Mod/${baseId}/ProfilePage`,
            { headers: { 'User-Agent': USER_AGENT } },
          )
          if (gbRes.ok) {
            const gbData = (await gbRes.json()) as {
              _aPreviewMedia?: {
                _aImages?: Array<{
                  _sBaseUrl?: string
                  _sFile800?: string
                  _sFile?: string
                  _sFile530?: string
                  _sFile220?: string
                }>
              }
            }
            const images = gbData?._aPreviewMedia?._aImages
            const firstImg =
              Array.isArray(images) && images.length > 0 ? images[0] : null
            if (firstImg?._sBaseUrl) {
              const fileKey =
                firstImg._sFile800 ||
                firstImg._sFile ||
                firstImg._sFile530 ||
                firstImg._sFile220
              if (fileKey) {
                const imgUrl = `${firstImg._sBaseUrl}/${fileKey}`
                const dlRes = await fetch(imgUrl, {
                  headers: { 'User-Agent': USER_AGENT },
                })
                if (dlRes.ok) {
                  const buf = Buffer.from(await dlRes.arrayBuffer())
                  const primaryDest = candidatePaths[0]
                  try {
                    fs.mkdirSync(path.dirname(primaryDest), {
                      recursive: true,
                    })
                    fs.writeFileSync(primaryDest, buf)
                  } catch {
                  }
                  res.setHeader('Access-Control-Allow-Origin', '*')
                  res.setHeader(
                    'Content-Type',
                    dlRes.headers.get('content-type') || 'image/webp',
                  )
                  res.setHeader('Cache-Control', 'public, max-age=86400')
                  return res.end(buf)
                }
              }
            }
          }
        } catch {
        }
      }

      const placeholderPath = path.join(
        PROJECT_ROOT,
        'public/imgs/images/placeholder-mini.webp',
      )
      if (fs.existsSync(placeholderPath)) {
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Content-Type', 'image/webp')
        return fs.createReadStream(placeholderPath).pipe(res)
      }

      res.statusCode = 404
      res.end()
    } catch {
      res.statusCode = 500
      res.end()
    }
  }
}

