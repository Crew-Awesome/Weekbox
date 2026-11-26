import type { Plugin } from 'vite'
import { readNeutralinoAuthInfo } from './utils.ts'
import { createNeutralinoAuthMiddleware } from './middlewares/neutralino-auth.ts'
import { createProxyImageMiddleware } from './middlewares/proxy-image.ts'
import { createProxyFetchMiddleware } from './middlewares/proxy-fetch.ts'
import {
  createModCoversMiddleware,
  createModAvatarsMiddleware,
} from './middlewares/mod-covers.ts'
import { createProxyDownloadMiddleware } from './middlewares/proxy-download.ts'
import { createDownloaderMiddleware } from './middlewares/downloader.ts'
import { createExtractorMiddleware } from './middlewares/extractor.ts'
import { createFsBridgeMiddleware } from './middlewares/fs-bridge.ts'

export function weekBoxHostPlugin(): Plugin {
  return {
    name: 'weekbox-host-middleware',
    transformIndexHtml(html) {
      const auth = readNeutralinoAuthInfo()
      if (!auth) return html
      const injectScript = `<script>window.NL_PORT=window.NL_PORT||${auth.nlPort};window.NL_TOKEN=window.NL_TOKEN||${JSON.stringify(auth.nlToken)};window.NL_GINJECTED=true;</script>`
      return html.replace('<head>', `<head>\n    ${injectScript}`)
    },
    configureServer(server) {
      server.middlewares.use('/api/neutralino-auth', createNeutralinoAuthMiddleware())
      server.middlewares.use('/api/proxy-image', createProxyImageMiddleware())
      server.middlewares.use('/api/proxy-fetch', createProxyFetchMiddleware())

      const modCoversMiddleware = createModCoversMiddleware()
      const modAvatarsMiddleware = createModAvatarsMiddleware()
      server.middlewares.use('/mod-covers', modCoversMiddleware)
      server.middlewares.use('/api/mod-cover', modCoversMiddleware)
      server.middlewares.use('/mod-avatars', modAvatarsMiddleware)
      server.middlewares.use((req, res, next) => {
        if (!req.url) return next()
        if (req.url.includes('/mod-covers/') || req.url.startsWith('mod-covers/')) {
          return modCoversMiddleware(req, res, next)
        }
        if (req.url.includes('/mod-avatars/') || req.url.startsWith('mod-avatars/')) {
          return modAvatarsMiddleware(req, res, next)
        }
        next()
      })

      server.middlewares.use('/api/proxy-download', createProxyDownloadMiddleware())
      server.middlewares.use('/api/wb-download', createDownloaderMiddleware())
      server.middlewares.use('/api/wb-extract', createExtractorMiddleware())
      server.middlewares.use('/api/wb-fs', createFsBridgeMiddleware())
    },
  }
}
