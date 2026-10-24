/**
 * Normalizes timestamps that may be in seconds or milliseconds into milliseconds.
 */
export function normalizeTimestamp(timestamp?: number | string): number | null {
  if (!timestamp) return null
  const num = Number(timestamp)
  if (isNaN(num) || num <= 0) return null
  return num < 10_000_000_000 ? num * 1000 : num
}

/**
 * Formats a timestamp into a short readable date (e.g., "Oct 22, 2026").
 */
export function formatDate(timestamp?: number | string): string {
  const ms = normalizeTimestamp(timestamp)
  if (!ms) return 'Unknown'
  return new Date(ms).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * Formats a timestamp into a full date and time string.
 */
export function formatFullDate(timestamp?: number | string): string {
  const ms = normalizeTimestamp(timestamp)
  if (!ms) return 'Unknown'
  return new Date(ms).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/**
 * Formats bytes into human-readable file size units (B, KB, MB, GB).
 */
export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0
  let num = bytes
  while (num >= 1024 && i < units.length - 1) {
    num /= 1024
    i++
  }
  return `${num.toFixed(1)} ${units[i]}`
}

/**
 * Formats a number into compact notation (e.g., 1.2K, 3.5M).
 */
export function formatCompactNumber(n?: number): string {
  if (!n || isNaN(n)) return '0'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`
  return String(n)
}
