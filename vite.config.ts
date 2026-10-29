import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import fs from 'fs'
import os from 'os'
import { Readable, Transform } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { execFile } from 'child_process'
import { promisify } from 'util'
import type { IncomingMessage } from 'http'

const execFileAsync = promisify(execFile)

function getLocalAppData(): string {
  const local =
    process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local')
  return local.replace(/\\/g, '/')
}

function resolveSafeBridgePath(inputPath: string): string {
  if (!inputPath || typeof inputPath !== 'string') return ''
  let clean = inputPath.replace(/\\/g, '/').trim()
  const localAppData = getLocalAppData()
  const targetRoot = path.join(localAppData, 'WeekBoxLibrary').replace(/\\/g, '/')

  const roamingAppData = (process.env.APPDATA || '').replace(/\\/g, '/')
  if (roamingAppData && clean.startsWith(roamingAppData + '/WeekBoxLibrary')) {
    const rel = clean.slice((roamingAppData + '/WeekBoxLibrary').length).replace(/^\/+/, '')
    return rel ? `${targetRoot}/${rel}` : targetRoot
  }

  const projectRoot = process.cwd().replace(/\\/g, '/')
  if (clean.startsWith(projectRoot + '/WeekBoxLibrary')) {
    const rel = clean.slice((projectRoot + '/WeekBoxLibrary').length).replace(/^\/+/, '')
    return rel ? `${targetRoot}/${rel}` : targetRoot
  }
  if (clean.startsWith(projectRoot + '/mods')) {
    const rel = clean.slice((projectRoot + '/mods').length).replace(/^\/+/, '')
    return rel ? `${targetRoot}/mods/${rel}` : `${targetRoot}/mods`
  }

  if (
    clean === 'WeekBoxLibrary' ||
    clean.startsWith('WeekBoxLibrary/') ||
    clean.startsWith('./WeekBoxLibrary')
  ) {
    const rel = clean.replace(/^\.?\/?WeekBoxLibrary\/?/, '')
    return rel ? `${targetRoot}/${rel}` : targetRoot
  }

  if (
    clean === 'mods' ||
    clean.startsWith('mods/') ||
    clean === 'data' ||
    clean.startsWith('data/') ||
    clean === 'engines' ||
    clean.startsWith('engines/')
  ) {
    return `${targetRoot}/${clean}`
  }

  return clean
}

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 WeekBox/1.0'

function formatSpeed(bytesPerSec: number): string {
  if (!Number.isFinite(bytesPerSec) || bytesPerSec <= 0) return '0 KB/s'
  if (bytesPerSec >= 1024 * 1024) {
    return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`
  }
  return `${Math.max(1, Math.round(bytesPerSec / 1024))} KB/s`
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8')
        resolve(raw ? (JSON.parse(raw) as Record<string, unknown>) : {})
      } catch (err) {
        reject(err)
      }
    })
    req.on('error', reject)
  })
}

function readNeutralinoAuthInfo(): {
  nlPort: number
  nlToken: string
  nlConnectToken: string
} | null {
  try {
    const authPath = path.resolve(import.meta.dirname, '.tmp/auth_info.json')
    if (!fs.existsSync(authPath)) return null
    const raw = fs.readFileSync(authPath, 'utf8')
    const parsed = JSON.parse(raw) as {
      nlPort?: number
      nlToken?: string
      nlConnectToken?: string
      accessToken?: string
      connectToken?: string
      port?: number
    }
    const nlPort = parsed.nlPort ?? parsed.port
    const rawToken = parsed.nlToken ?? parsed.accessToken ?? ''
    const connectToken = parsed.nlConnectToken ?? parsed.connectToken ?? ''
    if (!nlPort || !rawToken) return null
    const fullToken =
      rawToken.includes('.') || !connectToken
        ? rawToken
        : `${rawToken}.${connectToken}`
    return {
      nlPort,
      nlToken: fullToken,
      nlConnectToken: connectToken,
    }
  } catch {
    return null
  }
}

function flattenSingleSubdirectorySync(targetDir: string): void {
  try {
    if (!fs.existsSync(targetDir)) return
    const entries = fs
      .readdirSync(targetDir, { withFileTypes: true })
      .filter(
        (e) =>
          e.name !== '__MACOSX' &&
          !e.name.startsWith('.temp_archive') &&
          !e.name.startsWith('.flatten_'),
      )

    if (entries.length === 1 && entries[0].isDirectory()) {
      const subDir = path.join(targetDir, entries[0].name)
      const tempDir = path.join(targetDir, `.flatten_${Date.now()}`)
      fs.renameSync(subDir, tempDir)
      for (const child of fs.readdirSync(tempDir)) {
        const srcPath = path.join(tempDir, child)
        const destPath = path.join(targetDir, child)
        if (fs.existsSync(destPath)) {
          fs.rmSync(destPath, { recursive: true, force: true })
        }
        fs.renameSync(srcPath, destPath)
      }
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  } catch {
  }
}

function resolvePortable7z(): string | null {
  const isWin = process.platform === 'win32'
  const isMac = process.platform === 'darwin'
  const arch = process.arch === 'arm64' ? 'arm64' : 'x64'

  const candidates = [
    path.resolve(
      import.meta.dirname,
      `bin/7z/${isWin ? 'win/' + (process.arch === 'ia32' ? 'ia32' : arch) + '/7za.exe' : isMac ? 'mac/' + arch + '/7za' : 'linux/' + arch + '/7za'}`,
    ),
    path.resolve(
      import.meta.dirname,
      `node_modules/7zip-bin/${isWin ? 'win/' + (process.arch === 'ia32' ? 'ia32' : arch) + '/7za.exe' : isMac ? 'mac/' + arch + '/7za' : 'linux/' + arch + '/7za'}`,
    ),
    path.resolve(
      import.meta.dirname,
      `public/bin/7z/${isWin ? 'win/' + (process.arch === 'ia32' ? 'ia32' : arch) + '/7za.exe' : isMac ? 'mac/' + arch + '/7za' : 'linux/' + arch + '/7za'}`,
    ),
  ]
  for (const c of candidates) {
    if (fs.existsSync(c)) return c
  }
  return null
}

function resolvePortableUnrar(): string | null {
  const isWin = process.platform === 'win32'
  const isMac = process.platform === 'darwin'
  const arch = process.arch === 'arm64' ? 'arm64' : 'x64'

  const candidates = [
    path.resolve(
      import.meta.dirname,
      isWin
        ? 'bin/unrar/win/UnRAR.exe'
        : isMac
          ? `bin/unrar/mac/${arch}/unrar`
          : 'bin/unrar/linux/unrar',
    ),
    path.resolve(
      import.meta.dirname,
      isWin
        ? 'public/bin/unrar/win/UnRAR.exe'
        : isMac
          ? `public/bin/unrar/mac/${arch}/unrar`
          : 'public/bin/unrar/linux/unrar',
    ),
  ]
  for (const c of candidates) {
    if (fs.existsSync(c)) return c
  }
  return null
}

async function extractRarArchive(
  archivePath: string,
  destinationDir: string,
): Promise<boolean> {
  const unrarBin = resolvePortableUnrar()
  if (unrarBin) {
    try {
      const isWin = process.platform === 'win32'
      if (isWin) {
        const winArchive = archivePath.replace(/\//g, '\\')
        const winDest = destinationDir.replace(/\//g, '\\')
        const trailingDest = winDest.endsWith('\\') ? winDest : `${winDest}\\`
        await execFileAsync(unrarBin, ['x', '-y', '-o+', winArchive, trailingDest])
        return true
      } else {
        const trailingDest = destinationDir.endsWith('/')
          ? destinationDir
          : `${destinationDir}/`
        await execFileAsync(unrarBin, ['x', '-y', '-o+', archivePath, trailingDest])
        return true
      }
    } catch (err) {
      console.warn(
        '[ViteBridge] Portable unrar binary failed, falling back to node-unrar-js:',
        err,
      )
    }
  }

  try {
    const unrarModule = await import('node-unrar-js')
    const extractor = await unrarModule.createExtractorFromFile({
      filepath: archivePath,
      targetPath: destinationDir,
    })
    const extracted = extractor.extract()
    const files = [...extracted.files]
    for (const file of files) {
      const targetFilePath = path.join(destinationDir, file.fileHeader.name)
      if (file.fileHeader.flags.directory) {
        fs.mkdirSync(targetFilePath, { recursive: true })
      } else if (file.extraction) {
        fs.mkdirSync(path.dirname(targetFilePath), { recursive: true })
        fs.writeFileSync(targetFilePath, Buffer.from(file.extraction))
      }
    }
    return true
  } catch (err) {
    console.error('[ViteBridge] node-unrar-js extraction error:', err)
    throw err
  }
}

async function extract7zArchive(
  archivePath: string,
  destinationDir: string,
): Promise<boolean> {
  const sevenZipBin = resolvePortable7z()
  if (sevenZipBin) {
    try {
      await execFileAsync(sevenZipBin, [
        'x',
        '-y',
        `-o${destinationDir}`,
        archivePath,
      ])
      return true
    } catch (err) {
      console.warn('[ViteBridge] Portable 7za execution failed:', err)
    }
  }
  return false
}

function normalizeArchiveEntryPath(entry: string): string {
  return entry
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/^\/+/, '')
}

function parse7zListingPaths(stdout: string): string[] {
  const files: string[] = []
  const blocks = stdout.split(/\r?\n\r?\n/)

  for (const block of blocks) {
    const fields = new Map<string, string>()
    for (const line of block.split(/\r?\n/)) {
      const separator = line.indexOf(' = ')
      if (separator <= 0) continue
      fields.set(
        line.slice(0, separator).trim(),
        line.slice(separator + 3).trim(),
      )
    }

    const entryPath = fields.get('Path')
    if (!entryPath) continue
    const attributes = fields.get('Attributes') || ''
    const isDirectory =
      fields.get('Folder') === '+' || /^D/i.test(attributes)
    if (isDirectory) continue

    if (!fields.has('Size') && !fields.has('Attributes')) continue
    files.push(normalizeArchiveEntryPath(entryPath))
  }

  return files
}

async function listArchiveEntries(archivePath: string): Promise<string[]> {
  const lower = archivePath.toLowerCase()
  const maxBuffer = 64 * 1024 * 1024

  if (lower.endsWith('.rar')) {
    const unrarBin = resolvePortableUnrar()
    if (unrarBin) {
      try {
        const winArchive =
          process.platform === 'win32'
            ? archivePath.replace(/\//g, '\\')
            : archivePath
        const { stdout } = await execFileAsync(unrarBin, ['lb', winArchive], {
          maxBuffer,
        })
        return stdout
          .split(/\r?\n/)
          .map((entry) => normalizeArchiveEntryPath(entry.trim()))
          .filter((entry) => entry && !entry.endsWith('/'))
      } catch {
        return []
      }
    }
    return []
  }

  if (
    lower.endsWith('.tar') ||
    lower.endsWith('.tar.gz') ||
    lower.endsWith('.tgz')
  ) {
    try {
      const { stdout } = await execFileAsync('tar', ['-tf', archivePath], {
        maxBuffer,
      })
      return stdout
        .split(/\r?\n/)
        .map((entry) => normalizeArchiveEntryPath(entry.trim()))
        .filter((entry) => entry && !entry.endsWith('/'))
    } catch {
    }
  }

  const sevenZipBin = resolvePortable7z()
  if (sevenZipBin) {
    try {
      const { stdout } = await execFileAsync(
        sevenZipBin,
        ['l', '-slt', archivePath],
        { maxBuffer },
      )
      return parse7zListingPaths(stdout)
    } catch {
      return []
    }
  }

  return []
}

async function extractArchiveToDir(
  archivePath: string,
  destinationDir: string,
): Promise<boolean> {
  fs.mkdirSync(destinationDir, { recursive: true })

  const lower = archivePath.toLowerCase()

  if (lower.endsWith('.rar')) {
    return extractRarArchive(archivePath, destinationDir)
  }

  if (lower.endsWith('.7z')) {
    if (await extract7zArchive(archivePath, destinationDir)) return true
    return extractGeneralArchive(archivePath, destinationDir)
  }

  return extractGeneralArchive(archivePath, destinationDir)
}

async function extractGeneralArchive(
  archivePath: string,
  destinationDir: string,
): Promise<boolean> {
  const sevenZipBin = resolvePortable7z()
  if (sevenZipBin) {
    try {
      await execFileAsync(sevenZipBin, [
        'x',
        '-y',
        `-o${destinationDir}`,
        archivePath,
      ])
      return true
    } catch {
    }
  }

  const isWin = process.platform === 'win32'
  if (isWin) {
    const winArchive = archivePath.replace(/\//g, '\\')
    const winDest = destinationDir.replace(/\//g, '\\')
    try {
      await execFileAsync('tar.exe', ['-xf', winArchive, '-C', winDest])
      return true
    } catch {
    }

    if (archivePath.toLowerCase().endsWith('.zip')) {
      const psCmd = `Expand-Archive -LiteralPath '${winArchive.replace(/'/g, "''")}' -DestinationPath '${winDest.replace(/'/g, "''")}' -Force`
      await execFileAsync('powershell.exe', [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        psCmd,
      ])
      return true
    }
  } else {
    try {
      await execFileAsync('tar', ['-xf', archivePath, '-C', destinationDir])
      return true
    } catch {
      await execFileAsync('unzip', ['-o', archivePath, '-d', destinationDir])
      return true
    }
  }
  return false
}

function weekBoxHostPlugin(): Plugin {
  return {
    name: 'weekbox-host-middleware',
    transformIndexHtml(html) {
      const auth = readNeutralinoAuthInfo()
      if (!auth) return html
      const injectScript = `<script>window.NL_PORT=window.NL_PORT||${auth.nlPort};window.NL_TOKEN=window.NL_TOKEN||${JSON.stringify(auth.nlToken)};window.NL_GINJECTED=true;</script>`
      return html.replace('<head>', `<head>\n    ${injectScript}`)
    },
    configureServer(server) {
      server.middlewares.use('/api/neutralino-auth', (_req, res) => {
        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Access-Control-Allow-Origin', '*')
        const auth = readNeutralinoAuthInfo()
        res.end(JSON.stringify(auth || { available: false }))
      })

      server.middlewares.use('/api/proxy-image', async (req, res) => {
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
      })

      const handleModCoverRequest = async (
        req: IncomingMessage,
        res: import('http').ServerResponse,
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
            path.join(import.meta.dirname, 'data/mod-covers', fileName),
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
            import.meta.dirname,
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

      server.middlewares.use('/mod-covers', handleModCoverRequest)
      server.middlewares.use('/api/mod-cover', handleModCoverRequest)
      server.middlewares.use((req, res, next) => {
        if (
          req.url &&
          (req.url.includes('/mod-covers/') || req.url.startsWith('mod-covers/'))
        ) {
          return handleModCoverRequest(req, res, next)
        }
        next()
      })

      server.middlewares.use('/api/proxy-download', async (req, res) => {
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
      })

      server.middlewares.use('/api/wb-download', async (req, res) => {
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
      })

      server.middlewares.use('/api/wb-extract', async (req, res) => {
        if (req.method === 'OPTIONS') {
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.statusCode = 200
          return res.end()
        }
        if (req.method !== 'POST') {
          res.statusCode = 405
          return res.end('Method not allowed')
        }

        res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8')
        res.setHeader('Cache-Control', 'no-cache')
        res.setHeader('Connection', 'keep-alive')
        res.setHeader('Access-Control-Allow-Origin', '*')

        let clientClosed = false
        res.on('close', () => {
          clientClosed = true
        })

        const send = (payload: Record<string, unknown>) => {
          if (clientClosed || res.writableEnded) return
          res.write(JSON.stringify(payload) + '\n')
        }

        let watcher: fs.FSWatcher | null = null
        let ticker: ReturnType<typeof setInterval> | null = null

        try {
          const body = await readJsonBody(req)
          const archivePath = resolveSafeBridgePath(String(body.archivePath || ''))
          const destinationDir = resolveSafeBridgePath(
            String(body.destinationDir || body.destDir || ''),
          )
          const removeArchive = body.removeArchive !== false
          const flattenSingleRoot = body.flattenSingleRoot !== false

          if (!archivePath || !destinationDir) {
            res.statusCode = 400
            send({
              type: 'error',
              error: 'Missing archivePath or destinationDir',
            })
            return res.end()
          }

          if (!fs.existsSync(archivePath)) {
            res.statusCode = 404
            send({ type: 'error', error: `Archive not found: ${archivePath}` })
            return res.end()
          }

          fs.mkdirSync(destinationDir, { recursive: true })

          const archiveName = path.basename(archivePath)
          send({
            type: 'progress',
            progress: 1,
            filesDone: 0,
            totalFiles: 0,
            statusText: 'Reading archive contents...',
            currentFile: archiveName,
          })

          const entries = await listArchiveEntries(archivePath)
          const expectedFiles = new Set(
            entries.map((entry) => entry.toLowerCase()),
          )
          const totalFiles = expectedFiles.size
          const seenFiles = new Set<string>()
          const startedAt = Date.now()
          let lastFile = archiveName
          let lastEmit = 0

          const emitProgress = (force = false) => {
            const now = Date.now()
            if (!force && now - lastEmit < 120) return
            lastEmit = now

            const filesDone = seenFiles.size
            const progress =
              totalFiles > 0
                ? Math.min(99, 3 + Math.round((filesDone / totalFiles) * 96))
                : Math.min(95, 3 + Math.floor((now - startedAt) / 250))

            send({
              type: 'progress',
              progress,
              filesDone,
              totalFiles,
              currentFile: lastFile,
              statusText:
                totalFiles > 0
                  ? `Extracting ${filesDone} of ${totalFiles} files...`
                  : 'Extracting archive...',
            })
          }

          try {
            watcher = fs.watch(
              destinationDir,
              { recursive: true },
              (_eventType, filename) => {
                if (!filename) return
                const relative = normalizeArchiveEntryPath(
                  filename.toString(),
                )
                if (!relative) return
                if (
                  relative.startsWith('.temp_') ||
                  relative.includes('/.temp_') ||
                  relative.startsWith('.flatten_') ||
                  relative.includes('/.flatten_')
                ) {
                  return
                }

                lastFile = relative
                if (expectedFiles.size === 0) {
                  seenFiles.add(relative.toLowerCase())
                } else if (expectedFiles.has(relative.toLowerCase())) {
                  seenFiles.add(relative.toLowerCase())
                }
                emitProgress()
              },
            )
          } catch {
            watcher = null
          }

          ticker = setInterval(() => emitProgress(true), 400)

          const extracted = await extractArchiveToDir(
            archivePath,
            destinationDir,
          )

          if (ticker) {
            clearInterval(ticker)
            ticker = null
          }
          if (watcher) {
            watcher.close()
            watcher = null
          }

          if (!extracted) {
            send({
              type: 'error',
              error: `No se pudo descomprimir el archivo: ${archiveName}.`,
            })
            return res.end()
          }

          if (removeArchive) {
            try {
              if (fs.existsSync(archivePath)) {
                fs.rmSync(archivePath, { force: true })
              }
            } catch {
            }
          }

          if (flattenSingleRoot) {
            flattenSingleSubdirectorySync(destinationDir)
          }

          for (const entry of entries) {
            seenFiles.add(entry.toLowerCase())
          }

          send({
            type: 'done',
            ok: true,
            progress: 100,
            filesDone: seenFiles.size,
            totalFiles,
            statusText: 'Extraction complete',
            currentFile: '',
          })
          res.end()
        } catch (err) {
          if (ticker) {
            clearInterval(ticker)
            ticker = null
          }
          if (watcher) {
            watcher.close()
            watcher = null
          }
          send({
            type: 'error',
            error: err instanceof Error ? err.message : String(err),
          })
          if (!res.writableEnded) res.end()
        }
      })

      server.middlewares.use('/api/wb-fs', async (req, res) => {
        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Access-Control-Allow-Origin', '*')
        if (req.method === 'OPTIONS') {
          res.statusCode = 200
          return res.end()
        }
        if (req.method !== 'POST') {
          res.statusCode = 405
          return res.end(JSON.stringify({ error: 'Method not allowed' }))
        }

        try {
          const body = await readJsonBody(req)
          const action = String(body.action || '')

          switch (action) {
            case 'getDataPath': {
              return res.end(JSON.stringify({ dataPath: getLocalAppData() }))
            }

            case 'exists': {
              const targetPath = resolveSafeBridgePath(String(body.path || ''))
              const exists = targetPath ? fs.existsSync(targetPath) : false
              return res.end(JSON.stringify({ exists }))
            }

            case 'readTextFile': {
              const targetPath = resolveSafeBridgePath(String(body.path || ''))
              if (!targetPath || !fs.existsSync(targetPath)) {
                res.statusCode = 404
                return res.end(JSON.stringify({ error: 'File not found' }))
              }
              const data = fs.readFileSync(targetPath, 'utf8')
              return res.end(JSON.stringify({ data }))
            }

            case 'writeTextFile': {
              const targetPath = resolveSafeBridgePath(String(body.path || ''))
              if (!targetPath) {
                res.statusCode = 400
                return res.end(JSON.stringify({ ok: false, error: 'Missing path' }))
              }
              const data = String(body.data ?? '')
              fs.mkdirSync(path.dirname(targetPath), { recursive: true })
              fs.writeFileSync(targetPath, data, 'utf8')
              return res.end(JSON.stringify({ ok: true }))
            }

            case 'writeBinaryFile': {
              const targetPath = resolveSafeBridgePath(String(body.path || ''))
              const data = String(body.data || '')
              if (!targetPath) {
                res.statusCode = 400
                return res.end(JSON.stringify({ ok: false, error: 'Missing path' }))
              }
              fs.mkdirSync(path.dirname(targetPath), { recursive: true })
              fs.writeFileSync(targetPath, Buffer.from(data, 'base64'))
              return res.end(JSON.stringify({ ok: true }))
            }

            case 'createDirectory': {
              const targetPath = resolveSafeBridgePath(String(body.path || ''))
              if (!targetPath) {
                res.statusCode = 400
                return res.end(JSON.stringify({ ok: false, error: 'Missing path' }))
              }
              fs.mkdirSync(targetPath, { recursive: true })
              return res.end(JSON.stringify({ ok: true }))
            }

            case 'move': {
              const sourcePath = resolveSafeBridgePath(String(body.sourcePath || ''))
              const destinationPath = resolveSafeBridgePath(String(body.destinationPath || ''))
              if (!sourcePath || !destinationPath) {
                res.statusCode = 400
                return res.end(
                  JSON.stringify({ ok: false, error: 'Missing sourcePath or destinationPath' }),
                )
              }
              fs.mkdirSync(path.dirname(destinationPath), { recursive: true })
              try {
                fs.renameSync(sourcePath, destinationPath)
              } catch {
                fs.rmSync(destinationPath, { recursive: true, force: true })
                fs.renameSync(sourcePath, destinationPath)
              }
              return res.end(JSON.stringify({ ok: true }))
            }

            case 'remove': {
              const targetPath = resolveSafeBridgePath(String(body.path || ''))
              if (targetPath && fs.existsSync(targetPath)) {
                fs.rmSync(targetPath, { recursive: true, force: true })
              }
              return res.end(JSON.stringify({ ok: true }))
            }

            case 'readDirectory': {
              const targetPath = resolveSafeBridgePath(String(body.path || ''))
              if (!targetPath || !fs.existsSync(targetPath)) {
                return res.end(JSON.stringify({ entries: [] }))
              }
              const items = fs.readdirSync(targetPath, { withFileTypes: true })
              const entries = items.map((item) => {
                const fullPath = `${targetPath}/${item.name}`.replace(
                  /\/+/g,
                  '/',
                )
                let size = 0
                try {
                  if (item.isFile()) {
                    size = fs.statSync(fullPath).size
                  }
                } catch {
                }
                return {
                  name: item.name,
                  path: fullPath,
                  isDirectory: item.isDirectory(),
                  size,
                }
              })
              return res.end(JSON.stringify({ entries }))
            }

            case 'extractArchive': {
              const archivePath = resolveSafeBridgePath(String(body.archivePath || ''))
              const destinationDir = resolveSafeBridgePath(
                String(body.destinationDir || body.destDir || ''),
              )
              if (!archivePath || !destinationDir) {
                res.statusCode = 400
                return res.end(
                  JSON.stringify({
                    error: 'Missing archivePath or destinationDir',
                  }),
                )
              }

              const extracted = await extractArchiveToDir(
                archivePath,
                destinationDir,
              )

              if (!extracted) {
                res.statusCode = 500
                return res.end(
                  JSON.stringify({
                    ok: false,
                    error: `No se pudo descomprimir el archivo: ${path.basename(archivePath)}.`,
                  }),
                )
              }

              try {
                if (body.removeArchive !== false && fs.existsSync(archivePath)) {
                  fs.rmSync(archivePath, { force: true })
                }
              } catch {
              }

              if (body.flattenSingleRoot !== false) {
                flattenSingleSubdirectorySync(destinationDir)
              }
              return res.end(JSON.stringify({ ok: true }))
            }

            case 'cacheCover': {
              const imageUrl = String(body.imageUrl || body.url || '')
              const destPath = resolveSafeBridgePath(String(body.destPath || ''))
              if (!imageUrl || !destPath) {
                return res.end(JSON.stringify({ ok: false }))
              }
              fs.mkdirSync(path.dirname(destPath), { recursive: true })
              const imgRes = await fetch(imageUrl, {
                headers: { 'User-Agent': USER_AGENT },
              })
              if (!imgRes.ok) {
                return res.end(JSON.stringify({ ok: false }))
              }
              const buf = Buffer.from(await imgRes.arrayBuffer())
              fs.writeFileSync(destPath, buf)
              return res.end(JSON.stringify({ ok: true, path: destPath }))
            }

            case 'openFolder': {
              const folderPath = resolveSafeBridgePath(String(body.path || ''))
              if (!folderPath) {
                return res.end(JSON.stringify({ ok: false }))
              }
              fs.mkdirSync(folderPath, { recursive: true })
              if (process.platform === 'win32') {
                execFile('explorer.exe', [folderPath.replace(/\//g, '\\')])
              } else if (process.platform === 'darwin') {
                execFile('open', [folderPath])
              } else {
                execFile('xdg-open', [folderPath])
              }
              return res.end(JSON.stringify({ ok: true }))
            }

            case 'createLink': {
              const sourcePath = resolveSafeBridgePath(String(body.sourcePath || body.target || ''))
              const destinationPath = resolveSafeBridgePath(String(body.destinationPath || body.link || ''))
              if (!sourcePath || !destinationPath) {
                res.statusCode = 400
                return res.end(
                  JSON.stringify({ ok: false, error: 'Missing sourcePath or destinationPath' }),
                )
              }
              fs.mkdirSync(path.dirname(destinationPath), { recursive: true })
              if (fs.existsSync(destinationPath)) {
                try {
                  fs.unlinkSync(destinationPath)
                } catch {
                  try {
                    fs.rmSync(destinationPath, { recursive: true, force: true })
                  } catch {
                  }
                }
              }
              try {
                fs.symlinkSync(sourcePath, destinationPath, 'junction')
                return res.end(JSON.stringify({ ok: true, type: 'junction' }))
              } catch {
                try {
                  const { exec } = await import('child_process')
                  exec(
                    `cmd.exe /c mklink /J "${destinationPath.replace(/\//g, '\\')}" "${sourcePath.replace(/\//g, '\\')}"`,
                    (e) => {
                      if (e) {
                        res.end(JSON.stringify({ ok: false, error: String(e) }))
                      } else {
                        res.end(JSON.stringify({ ok: true, type: 'cmd-junction' }))
                      }
                    },
                  )
                  return
                } catch (e2) {
                  return res.end(JSON.stringify({ ok: false, error: String(e2) }))
                }
              }
            }

            case 'spawnProcess': {
              const command = String(body.command || '')
              const cwd = body.cwd ? String(body.cwd) : undefined
              if (!command) {
                res.statusCode = 400
                return res.end(JSON.stringify({ ok: false, error: 'Missing command' }))
              }
              const { spawn } = await import('child_process')
              const child = spawn(command, { cwd, shell: true, detached: true, stdio: 'ignore' })
              child.unref()
              return res.end(JSON.stringify({ ok: true, pid: child.pid }))
            }

            default:
              res.statusCode = 400
              return res.end(
                JSON.stringify({ error: `Unknown action: ${action}` }),
              )
          }
        } catch (err) {
          res.statusCode = 500
          return res.end(
            JSON.stringify({
              error: err instanceof Error ? err.message : String(err),
            }),
          )
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), weekBoxHostPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalized = id.replace(/\\/g, '/')
          if (normalized.includes('/node_modules/')) {
            if (
              normalized.includes('/node_modules/react/') ||
              normalized.includes('/node_modules/react-dom/') ||
              normalized.includes('/node_modules/react-router/') ||
              normalized.includes('/node_modules/react-router-dom/')
            ) {
              return 'vendor-react'
            }
            if (normalized.includes('/node_modules/@m3e/')) {
              return 'vendor-m3e'
            }
            if (
              normalized.includes('/node_modules/gsap/') ||
              normalized.includes('/node_modules/@gsap/')
            ) {
              return 'vendor-gsap'
            }
            if (
              normalized.includes('/node_modules/@neutralinojs/') ||
              normalized.includes('/node_modules/@capacitor/')
            ) {
              return 'vendor-host'
            }
            return 'vendor-misc'
          }
        },
      },
    },
  },
})
