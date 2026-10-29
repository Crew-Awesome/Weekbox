import path from 'path'
import fs from 'fs'
import { execFile } from 'child_process'
import type { IncomingMessage, ServerResponse } from 'http'
import {
  USER_AGENT,
  getLocalAppData,
  readJsonBody,
  resolveSafeBridgePath,
} from '../utils.ts'
import {
  extractArchiveToDir,
  flattenSingleSubdirectorySync,
} from '../archive/index.ts'

export function createFsBridgeMiddleware() {
  return async (req: IncomingMessage, res: ServerResponse) => {
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
            fs.symlinkSync(
              sourcePath,
              destinationPath,
              process.platform === 'win32' ? 'junction' : 'dir',
            )
            return res.end(JSON.stringify({ ok: true, type: 'junction' }))
          } catch {
            if (process.platform === 'win32') {
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
            } else {
              try {
                const { exec } = await import('child_process')
                exec(`ln -sf "${sourcePath}" "${destinationPath}"`, (e) => {
                  if (e) {
                    res.end(JSON.stringify({ ok: false, error: String(e) }))
                  } else {
                    res.end(JSON.stringify({ ok: true, type: 'symlink' }))
                  }
                })
                return
              } catch (e2) {
                return res.end(JSON.stringify({ ok: false, error: String(e2) }))
              }
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
  }
}

