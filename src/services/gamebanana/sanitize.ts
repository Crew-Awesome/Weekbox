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
 * Extracts plain text from an HTML string using an inert document parser
 * so embedded tags (like img/iframe) never trigger network or image loads.
 */
export function htmlToPlainText(html: string): string {
  if (!html) return ''
  if (typeof DOMParser !== 'undefined') {
    try {
      const doc = new DOMParser().parseFromString(html, 'text/html')
      return (doc.body?.textContent || '').replace(/\s+/g, ' ').trim()
    } catch {
      // Fallback to regex strip below
    }
  }
  return html.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim()
}
