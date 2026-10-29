import path from 'path'
import fs from 'fs'
import type { IncomingMessage, ServerResponse } from 'http'
import { readJsonBody, resolveSafeBridgePath } from '../utils.ts'
import {
  extractArchiveToDir,
  flattenSingleSubdirectorySync,
  listArchiveEntries,
  normalizeArchiveEntryPath,
} from '../archive/index.ts'

export function createExtractorMiddleware() {
  return async (req: IncomingMessage, res: ServerResponse) => {
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
  }
}

