import path from 'path'
import os from 'os'
import fs from 'fs'
import type { IncomingMessage } from 'http'

export const PROJECT_ROOT = process.cwd()

export const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 WeekBox/1.0'

export function getLocalAppData(): string {
  if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support').replace(/\\/g, '/')
  }
  if (process.platform === 'linux') {
    const xdgData = process.env.XDG_DATA_HOME
    return (xdgData || path.join(os.homedir(), '.local', 'share')).replace(/\\/g, '/')
  }
  const local =
    process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local')
  return local.replace(/\\/g, '/')
}

export function resolveSafeBridgePath(inputPath: string): string {
  if (!inputPath || typeof inputPath !== 'string') return ''
  let clean = inputPath.replace(/\\/g, '/').trim()
  const localAppData = getLocalAppData()
  const targetRoot = path.join(localAppData, 'WeekBoxLibrary').replace(/\\/g, '/')

  const roamingAppData = (process.env.APPDATA || '').replace(/\\/g, '/')
  if (roamingAppData && clean.startsWith(roamingAppData + '/WeekBoxLibrary')) {
    const rel = clean.slice((roamingAppData + '/WeekBoxLibrary').length).replace(/^\/+/, '')
    return rel ? `${targetRoot}/${rel}` : targetRoot
  }

  const projectRoot = PROJECT_ROOT.replace(/\\/g, '/')
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

export function formatSpeed(bytesPerSec: number): string {
  if (!Number.isFinite(bytesPerSec) || bytesPerSec <= 0) return '0 KB/s'
  if (bytesPerSec >= 1024 * 1024) {
    return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`
  }
  return `${Math.max(1, Math.round(bytesPerSec / 1024))} KB/s`
}

export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
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

export function readNeutralinoAuthInfo(): {
  nlPort: number
  nlToken: string
  nlConnectToken: string
} | null {
  try {
    const authPath = path.resolve(PROJECT_ROOT, '.tmp/auth_info.json')
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

