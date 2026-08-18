import DOMPurify from "dompurify";

/**
 * Sanitizes an HTML string to ensure safe rendering in dangerouslySetInnerHTML
 */
export function sanitizeHtml(dirtyHtml: string): string {
  if (!dirtyHtml) return "";
  return DOMPurify.sanitize(dirtyHtml);
}

/**
 * Strips all HTML tags and returns only the plain text content, fully sanitized.
 * Useful for card descriptions to prevent HTML leaks.
 */
export function htmlToPlainText(html: string): string {
  if (!html) return "";
  // Strip tags safely
  const clean = DOMPurify.sanitize(html, { ALLOWED_TAGS: [] });
  // Decode remaining HTML entities if any
  const textarea = document.createElement("textarea");
  textarea.innerHTML = clean;
  return textarea.value;
}
