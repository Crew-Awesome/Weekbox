import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import fs from 'fs'
import { execFile } from 'child_process'
import { promisify } from 'util'
import type { IncomingMessage } from 'http'

const execFileAsync = promisify(execFile)

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
    // Non-fatal flattening warning
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

  // Fallback to node-unrar-js (WASM / JS official unrar engine)
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
      // fallback
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
      // fallback to Expand-Archive for zip only
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
      // 1. Neutralino Auth Info Bridge
      server.middlewares.use('/api/neutralino-auth', (_req, res) => {
        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Access-Control-Allow-Origin', '*')
        const auth = readNeutralinoAuthInfo()
        res.end(JSON.stringify(auth || { available: false }))
      })

      // 2. Image Proxy Middleware
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

      // 3. Streaming Download Proxy Middleware (bypasses multi-hop 302 CORS errors)
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

      // 4. Direct Disk Streaming Download Bridge (streams directly to destinationPath with NDJSON progress)
      server.middlewares.use('/api/wb-download', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          return res.end('Method not allowed')
        }

        const abortController = new AbortController()
        let destFilePath = ''
        let fileStream: fs.WriteStream | null = null
        let completed = false

        res.on('close', () => {
          if (!completed) {
            abortController.abort()
            if (fileStream) {
              fileStream.destroy()
              fileStream = null
            }
            if (destFilePath && fs.existsSync(destFilePath)) {
              try {
                fs.rmSync(destFilePath, { force: true })
              } catch {
                // ignore
              }
            }
          }
        })

        try {
          const body = await readJsonBody(req)
          const url = String(body.url || '')
          destFilePath = String(body.destinationPath || '')
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

          res.write(
            JSON.stringify({
              type: 'progress',
              progress: 1,
              downloaded: 0,
              total: expectedSize,
              speed: 'Connecting...',
              statusText: 'Connecting to server...',
            }) + '\n',
          )

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

          fileStream = fs.createWriteStream(destFilePath)

          if (!fetchRes.body) {
            const buf = Buffer.from(await fetchRes.arrayBuffer())
            fileStream.write(buf)
            await new Promise<void>((resolve, reject) => {
              fileStream!.end((err?: Error | null) =>
                err ? reject(err) : resolve(),
              )
            })
            completed = true
            res.write(
              JSON.stringify({
                type: 'done',
                done: true,
                progress: 98,
                downloaded: buf.byteLength,
                total: totalBytes || buf.byteLength,
                speed: '',
                statusText: 'Download finished',
              }) + '\n',
            )
            return res.end()
          }

          const reader = fetchRes.body.getReader()
          let receivedLength = 0
          let lastBytes = 0
          let lastTick = performance.now()
          let smoothedSpeed = 0
          let isFirstChunk = true

          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            if (value) {
              const chunkBuf = Buffer.from(value)
              receivedLength += chunkBuf.byteLength

              if (!fileStream.write(chunkBuf)) {
                await new Promise<void>((resolve) =>
                  fileStream!.once('drain', resolve),
                )
              }

              const now = performance.now()
              const elapsedSec = (now - lastTick) / 1000
              if (elapsedSec >= 0.1 || isFirstChunk) {
                isFirstChunk = false
                const instantSpeed =
                  elapsedSec > 0 ? (receivedLength - lastBytes) / elapsedSec : 0
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

                res.write(
                  JSON.stringify({
                    type: 'progress',
                    progress: percent,
                    downloaded: receivedLength,
                    total: effectiveTotal,
                    speed: formatSpeed(smoothedSpeed),
                    statusText: `Downloading (${formatBytes(receivedLength)})...`,
                  }) + '\n',
                )
              }
            }
          }

          await new Promise<void>((resolve, reject) => {
            if (!fileStream) return resolve()
            fileStream.end((err?: Error | null) =>
              err ? reject(err) : resolve(),
            )
          })
          fileStream = null
          completed = true

          res.write(
            JSON.stringify({
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
            }) + '\n',
          )
          res.end()
        } catch (err) {
          if (fileStream) {
            fileStream.destroy()
            fileStream = null
          }
          if (destFilePath && fs.existsSync(destFilePath)) {
            try {
              fs.rmSync(destFilePath, { force: true })
            } catch {
              // ignore
            }
          }
          if (!res.writableEnded) {
            res.write(
              JSON.stringify({
                error: err instanceof Error ? err.message : String(err),
              }) + '\n',
            )
            res.end()
          }
        }
      })

      // 5. Local Filesystem & Archive Bridge for WeekBoxLibrary
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
              const dataPath = (
                process.env.LOCALAPPDATA ||
                process.env.APPDATA ||
                ''
              ).replace(/\\/g, '/')
              return res.end(JSON.stringify({ dataPath }))
            }

            case 'exists': {
              const targetPath = String(body.path || '')
              const exists = targetPath ? fs.existsSync(targetPath) : false
              return res.end(JSON.stringify({ exists }))
            }

            case 'readTextFile': {
              const targetPath = String(body.path || '')
              if (!targetPath || !fs.existsSync(targetPath)) {
                res.statusCode = 404
                return res.end(JSON.stringify({ error: 'File not found' }))
              }
              const data = fs.readFileSync(targetPath, 'utf8')
              return res.end(JSON.stringify({ data }))
            }

            case 'writeTextFile': {
              const targetPath = String(body.path || '')
              const data = String(body.data ?? '')
              fs.mkdirSync(path.dirname(targetPath), { recursive: true })
              fs.writeFileSync(targetPath, data, 'utf8')
              return res.end(JSON.stringify({ ok: true }))
            }

            case 'writeBinaryFile': {
              const targetPath = String(body.path || '')
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
              const targetPath = String(body.path || '')
              fs.mkdirSync(targetPath, { recursive: true })
              return res.end(JSON.stringify({ ok: true }))
            }

            case 'move': {
              const sourcePath = String(body.sourcePath || '')
              const destinationPath = String(body.destinationPath || '')
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
              const targetPath = String(body.path || '')
              if (targetPath && fs.existsSync(targetPath)) {
                fs.rmSync(targetPath, { recursive: true, force: true })
              }
              return res.end(JSON.stringify({ ok: true }))
            }

            case 'readDirectory': {
              const targetPath = String(body.path || '')
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
                  // ignore
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
              const archivePath = String(body.archivePath || '')
              const destinationDir = String(
                body.destinationDir || body.destDir || '',
              )
              if (!archivePath || !destinationDir) {
                res.statusCode = 400
                return res.end(
                  JSON.stringify({
                    error: 'Missing archivePath or destinationDir',
                  }),
                )
              }

              fs.mkdirSync(destinationDir, { recursive: true })

              const lower = archivePath.toLowerCase()
              let extracted = false

              if (lower.endsWith('.rar')) {
                extracted = await extractRarArchive(archivePath, destinationDir)
              } else if (lower.endsWith('.7z')) {
                extracted = await extract7zArchive(archivePath, destinationDir)
                if (!extracted) {
                  extracted = await extractGeneralArchive(
                    archivePath,
                    destinationDir,
                  )
                }
              } else {
                extracted = await extractGeneralArchive(
                  archivePath,
                  destinationDir,
                )
              }

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
                if (fs.existsSync(archivePath)) {
                  fs.rmSync(archivePath, { force: true })
                }
              } catch {
                // ignore
              }

              flattenSingleSubdirectorySync(destinationDir)
              return res.end(JSON.stringify({ ok: true }))
            }

            case 'cacheCover': {
              const imageUrl = String(body.imageUrl || body.url || '')
              const destPath = String(body.destPath || '')
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
              const folderPath = String(body.path || '')
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

// https://vite.dev/config/
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
