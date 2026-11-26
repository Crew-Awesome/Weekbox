import path from 'path'
import fs from 'fs'
import type { IncomingMessage, ServerResponse } from 'http'
import { PROJECT_ROOT, USER_AGENT, getLocalAppData } from '../utils.ts'

const CONTENT_TYPES_BY_EXT: Record<string, string> = {
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
}

function getImageContentType(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase()
  return CONTENT_TYPES_BY_EXT[ext] || 'image/webp'
}

export function createLibraryImagesMiddleware(
  folderName: 'mod-covers' | 'mod-avatars',
) {
  const folderPrefixRegex = new RegExp(`.*?\\/${folderName}\\/?`)

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
          .replace(folderPrefixRegex, '')
          .replace(/^\/api\/mod-cover\/?/, '')
        fileName = path.basename(raw)
      }

      if (!fileName || fileName === folderName || fileName === '.') {
        return next()
      }

      const localAppData = getLocalAppData()
      let customLibraryRoot = ''
      try {
        const defaultConfigPath = path.join(
          localAppData,
          'WeekBoxLibrary/config/settings.json',
        )
        if (fs.existsSync(defaultConfigPath)) {
          const parsedCfg = JSON.parse(
            fs.readFileSync(defaultConfigPath, 'utf8'),
          ) as { settings?: { storagePath?: { value?: string } } }
          const cfgPath = parsedCfg?.settings?.storagePath?.value
          if (typeof cfgPath === 'string' && cfgPath.trim()) {
            customLibraryRoot = cfgPath.trim()
          }
        }
      } catch {
      }

      const candidatePaths = [
        ...(customLibraryRoot
          ? [path.join(customLibraryRoot, `data/${folderName}`, fileName)]
          : []),
        path.join(localAppData, `WeekBoxLibrary/data/${folderName}`, fileName),
        path.join(PROJECT_ROOT, `data/${folderName}`, fileName),
      ]

      for (const cand of candidatePaths) {
        if (fs.existsSync(cand)) {
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Content-Type', getImageContentType(fileName))
          res.setHeader('Cache-Control', 'public, max-age=86400')
          return fs.createReadStream(cand).pipe(res)
        }
      }

      if (folderName === 'mod-covers') {
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
      }

      res.statusCode = 404
      return res.end()
    } catch {
      return next()
    }
  }
}

export const createModCoversMiddleware = () =>
  createLibraryImagesMiddleware('mod-covers')

export const createModAvatarsMiddleware = () =>
  createLibraryImagesMiddleware('mod-avatars')
