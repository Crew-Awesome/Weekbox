import { initHost } from '@/core/host'

const desktopBlobCache = new Map<string, string>()

/**
 * Converts a relative or absolute library asset path (`mod-covers/...` or `mod-avatars/...`)
 * into a local dev/bridge HTTP URL path.
 */
export function toLocalLibraryMediaUrl(
  rawPath?: string,
  folder: 'mod-covers' | 'mod-avatars' = 'mod-avatars',
): string | undefined {
  if (!rawPath || typeof rawPath !== 'string') return undefined
  const normalized = rawPath.trim().replace(/\\/g, '/')
  if (!normalized) return undefined

  if (normalized.startsWith(`/${folder}/`)) return normalized
  if (normalized.startsWith(`${folder}/`)) return `/${normalized}`
  const marker = `/${folder}/`
  if (normalized.includes(marker)) {
    const fileName = normalized.split(marker).pop()
    if (fileName) return `${marker}${fileName}`
  }
  return undefined
}

/**
 * Picks the best display image source, preferring a locally cached avatar file
 * (`mod-avatars/...`) before falling back to a remote HTTP(S) URL.
 */
export function resolvePreferredAvatarUrl(
  remoteUrl?: string,
  localRelPath?: string,
  localFullPath?: string,
): string | undefined {
  const localUrl =
    toLocalLibraryMediaUrl(localRelPath, 'mod-avatars') ||
    toLocalLibraryMediaUrl(localFullPath, 'mod-avatars')
  if (localUrl) return localUrl

  const cleanRemote = typeof remoteUrl === 'string' ? remoteUrl.trim() : ''
  if (!cleanRemote) return undefined
  return (
    toLocalLibraryMediaUrl(cleanRemote, 'mod-avatars') || cleanRemote
  )
}

/**
 * Attempts to read a locally cached image file via `host.fs.readBinaryFile`
 * as a cached Object URL when the HTTP middleware cannot serve `/mod-avatars/...`,
 * then falls back to `remoteFallbackUrl` if provided.
 */
export async function resolveAvatarErrorFallback(
  failedSrc: string,
  localFullPath?: string,
  remoteFallbackUrl?: string,
): Promise<string | null> {
  if (
    localFullPath &&
    !failedSrc.startsWith('blob:') &&
    !failedSrc.startsWith('data:')
  ) {
    const existing = desktopBlobCache.get(localFullPath)
    if (existing) return existing

    try {
      const host = initHost()
      if (host.platform === 'desktop' && (await host.fs.exists(localFullPath))) {
        const buffer = await host.fs.readBinaryFile(localFullPath)
        if (buffer && buffer.byteLength > 0) {
          const blobUrl = URL.createObjectURL(new Blob([buffer]))
          desktopBlobCache.set(localFullPath, blobUrl)
          return blobUrl
        }
      }
    } catch {
    }
  }

  if (
    remoteFallbackUrl &&
    /^https?:\/\//i.test(remoteFallbackUrl) &&
    failedSrc !== remoteFallbackUrl
  ) {
    return remoteFallbackUrl
  }

  return null
}
