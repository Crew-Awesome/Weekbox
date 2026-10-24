/**
 * Strips potentially unsafe script/iframe tags and inline event handlers from HTML.
 */
export function sanitizeHtml(dirtyHtml: string): string {
  if (!dirtyHtml) return ''
  return dirtyHtml
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/on\w+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, '')
}

/**
 * Extracts plain text from an HTML string.
 */
export function htmlToPlainText(html: string): string {
  if (!html) return ''
  if (typeof document !== 'undefined') {
    const tmp = document.createElement('div')
    tmp.innerHTML = html
    return tmp.textContent || tmp.innerText || ''
  }
  return html.replace(/<[^>]*>?/gm, '').trim()
}
