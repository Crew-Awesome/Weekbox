import { useState, useEffect, useCallback } from 'react'

let cachedBgColors: number[][] | null = null

const getBgColors = (): number[][] => {
  if (cachedBgColors) return cachedBgColors
  if (typeof document === 'undefined') return [[14, 20, 21]]

  const styles = getComputedStyle(document.documentElement)
  const vars = [
    '--wb-bg',
    '--wb-surface',
    '--wb-front-bg',
    '--wb-back-bg',
    '--md-sys-color-surface',
  ]

  cachedBgColors = vars.map((v) => {
    let val = styles.getPropertyValue(v).trim()
    while (val.startsWith('var(')) {
      const innerVar = val.slice(4, -1).trim()
      val = styles.getPropertyValue(innerVar).trim()
    }
    if (val.startsWith('#')) {
      let hex = val.replace('#', '')
      if (hex.length === 3) {
        hex = hex
          .split('')
          .map((c) => c + c)
          .join('')
      }
      const num = parseInt(hex, 16)
      if (!isNaN(num)) return [num >> 16, (num >> 8) & 255, num & 255]
    }
    if (val.startsWith('rgb')) {
      const match = val.match(/\d+/g)
      if (match && match.length >= 3) {
        return [Number(match[0]), Number(match[1]), Number(match[2])]
      }
    }
    return [0, 0, 0]
  })
  return cachedBgColors
}

const colorCache = new Map<string, string>()
const EXTRACT_COLOR_STORAGE_KEY = 'wb_extract_color_active'

type ExtractColorListener = (active: boolean) => void
const listeners = new Set<ExtractColorListener>()

export function isExtractColorActive(): boolean {
  if (typeof window === 'undefined') return true
  try {
    const item = localStorage.getItem(EXTRACT_COLOR_STORAGE_KEY)
    if (item === null) return true
    return item === 'true'
  } catch {
    return true
  }
}

export function setExtractColorActive(active: boolean): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(EXTRACT_COLOR_STORAGE_KEY, String(active))
  } catch {
  }
  listeners.forEach((fn) => fn(active))
  window.dispatchEvent(
    new CustomEvent('wb:extract-color-changed', { detail: { active } }),
  )
}

export function subscribeExtractColor(listener: ExtractColorListener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useExtractColor() {
  const [isExtractActive, setIsExtractActive] = useState<boolean>(isExtractColorActive)

  useEffect(() => subscribeExtractColor(setIsExtractActive), [])

  const toggleExtractActive = useCallback(() => {
    setExtractColorActive(!isExtractColorActive())
  }, [])

  return {
    isExtractActive,
    setExtractActive: setExtractColorActive,
    toggleExtractActive,
  }
}

function isRemoteHttpUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false
  const trimmed = url.trim()
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return false
  }
  if (
    trimmed.includes('localhost') ||
    trimmed.includes('127.0.0.1') ||
    trimmed.startsWith('/api/') ||
    trimmed.startsWith('/mod-covers')
  ) {
    return false
  }
  return true
}

function getCORSFriendlyImageUrl(url: string): string {
  if (typeof window === 'undefined' || !url) return url
  let cleanUrl = url.trim().replace(/\\/g, '/')
  if (cleanUrl.startsWith('mod-covers/')) {
    cleanUrl = `/${cleanUrl}`
  } else if (cleanUrl.includes('/mod-covers/')) {
    cleanUrl = `/mod-covers/${cleanUrl.split('/mod-covers/').pop()}`
  }

  if (typeof (window as unknown as { NL_PORT?: unknown }).NL_PORT !== 'undefined') {
    return cleanUrl
  }
  if (!isRemoteHttpUrl(cleanUrl)) return cleanUrl
  if (cleanUrl.startsWith('/api/proxy-image') || cleanUrl.includes('wsrv.nl')) return cleanUrl

  const hostname = window.location ? window.location.hostname : ''
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `/api/proxy-image?url=${encodeURIComponent(cleanUrl)}`
  }
  return `https://wsrv.nl/?url=${encodeURIComponent(cleanUrl)}&output=webp&w=120`
}

function getFallbackProxyUrl(url: string): string {
  if (!isRemoteHttpUrl(url) || url.includes('wsrv.nl')) return url
  return `https://wsrv.nl/?url=${encodeURIComponent(url)}&output=webp&w=120`
}

export const getFallbackHoverColor = (opacity?: number): string => {
  if (typeof document === 'undefined') return 'rgba(54, 60, 255, 0.25)'
  const styles = getComputedStyle(document.documentElement)
  const primaryVar =
    styles.getPropertyValue('--wb-card-hover-default').trim() ||
    styles.getPropertyValue('--md-sys-color-primary').trim()

  if (primaryVar) {
    if (opacity !== undefined) {
      if (primaryVar.startsWith('#')) {
        let hex = primaryVar.replace('#', '')
        if (hex.length === 3) {
          hex = hex
            .split('')
            .map((c) => c + c)
            .join('')
        }
        const num = parseInt(hex, 16)
        if (!isNaN(num)) {
          return `rgba(${num >> 16}, ${(num >> 8) & 255}, ${num & 255}, ${opacity})`
        }
      }
      return `color-mix(in srgb, var(--wb-card-hover-default, var(--md-sys-color-primary)) ${Math.round(opacity * 100)}%, transparent)`
    }
    return 'var(--wb-card-hover-bg, var(--md-sys-color-primary-container))'
  }

  return opacity !== undefined
    ? `rgba(54, 60, 255, ${opacity})`
    : 'var(--wb-card-hover-bg)'
}

export const extractColor = (
  imageUrl: string,
  opacity?: number,
): Promise<string> => {
  return new Promise((resolve) => {
    if (!isExtractColorActive() || typeof document === 'undefined' || !imageUrl) {
      resolve(getFallbackHoverColor(opacity))
      return
    }

    const cacheKey = `${imageUrl}:${opacity ?? ''}`
    if (colorCache.has(cacheKey)) {
      resolve(colorCache.get(cacheKey)!)
      return
    }

    const loadImageAndExtract = (srcToLoad: string, canRetry = true) => {
      const img = new Image()
      img.crossOrigin = 'Anonymous'

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d', { willReadFrequently: true })

          if (!ctx) {
            resolve(getFallbackHoverColor(opacity))
            return
          }

          const maxDim = 24
          let width = img.width
          let height = img.height

          if (width <= 0 || height <= 0) {
            resolve(getFallbackHoverColor(opacity))
            return
          }

          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width)
              width = maxDim
            }
          } else if (height > maxDim) {
            width = Math.round((width * maxDim) / height)
            height = maxDim
          }

          canvas.width = width
          canvas.height = height
          ctx.drawImage(img, 0, 0, width, height)

          const { data } = ctx.getImageData(0, 0, width, height)
          const colorCounts: Record<string, { count: number; rgb: number[] }> = {}

          for (let i = 0; i < data.length; i += 16) {
            const a = data[i + 3]
            if (a < 128) continue

            const finalR = Math.min(255, Math.round(data[i] / 16) * 16)
            const finalG = Math.min(255, Math.round(data[i + 1] / 16) * 16)
            const finalB = Math.min(255, Math.round(data[i + 2] / 16) * 16)
            const rgbStr = `rgb(${finalR}, ${finalG}, ${finalB})`

            if (!colorCounts[rgbStr]) {
              colorCounts[rgbStr] = { count: 0, rgb: [finalR, finalG, finalB] }
            }
            colorCounts[rgbStr].count += 1
          }

          const bgs = [...getBgColors(), [255, 255, 255], [240, 240, 240]]
          const sortedColors = Object.values(colorCounts).sort(
            (a, b) => b.count - a.count,
          )
          let bestColor =
            sortedColors.length > 0 ? sortedColors[0].rgb : [255, 255, 255]

          for (const candidate of sortedColors) {
            let isDifferent = true
            for (const bg of bgs) {
              const dist = Math.hypot(
                candidate.rgb[0] - bg[0],
                candidate.rgb[1] - bg[1],
                candidate.rgb[2] - bg[2],
              )
              if (dist < 50) {
                isDifferent = false
                break
              }
            }
            if (isDifferent) {
              bestColor = candidate.rgb
              break
            }
          }

          const finalResult =
            opacity !== undefined
              ? `rgba(${bestColor[0]}, ${bestColor[1]}, ${bestColor[2]}, ${opacity})`
              : `rgb(${bestColor[0]}, ${bestColor[1]}, ${bestColor[2]})`

          colorCache.set(cacheKey, finalResult)
          resolve(finalResult)
        } catch {
          if (canRetry) {
            loadImageAndExtract(getFallbackProxyUrl(imageUrl), false)
          } else {
            resolve(getFallbackHoverColor(opacity))
          }
        }
      }

      img.onerror = () => {
        if (canRetry) {
          loadImageAndExtract(getFallbackProxyUrl(imageUrl), false)
        } else {
          resolve(getFallbackHoverColor(opacity))
        }
      }

      img.src = srcToLoad
    }

    const initialUrl = getCORSFriendlyImageUrl(imageUrl)
    const canRetry =
      isRemoteHttpUrl(imageUrl) && initialUrl !== getFallbackProxyUrl(imageUrl)
    loadImageAndExtract(initialUrl, canRetry)
  })
}
