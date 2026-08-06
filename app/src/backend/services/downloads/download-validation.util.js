function looksLikeHtmlResponse(sample) {
  return /<(?:!doctype\s+html|html\b|head\b|body\b|form\b)/i.test(
    String(sample || ""),
  );
}

function getHtmlResponseError(sample) {
  const html = String(sample || "");
  if (!looksLikeHtmlResponse(html)) return null;
  const lower = html.toLowerCase();

  // If this is a Google Drive download confirmation page, it is not an error
  const hasConfirmationForm =
    /<form[^>]+action\s*=\s*["'][^"']*(?:download|uc\?)[^"']*["']/i.test(html) ||
    /id=["'](?:download-form|downloadForm|uc-download-link)["']/i.test(html) ||
    /name=["'](?:confirm|uuid)["']/i.test(html);
  if (hasConfirmationForm) {
    return null;
  }

  if (
    lower.includes("quota exceeded") ||
    lower.includes("too many users have viewed or downloaded this file recently") ||
    lower.includes("ha superado la cuota") ||
    lower.includes("ha superado su cuota")
  ) {
    return new Error(
      "Google Drive: Este archivo ha superado la cuota de descargas de Google Drive debido a un alto volumen de descargas recientes. Por favor, selecciona otro enlace de descarga disponible para este mod (como MediaFire o GitHub) o inténtalo más tarde.",
    );
  }
  if (
    lower.includes("access denied") ||
    lower.includes("you need access") ||
    lower.includes("sign in to continue")
  ) {
    return new Error(
      "Google Drive: Este archivo requiere permisos especiales de acceso o inicio de sesión en Google. Prueba con otro enlace de descarga.",
    );
  }
  if (
    lower.includes("file not found") ||
    lower.includes("sorry, the file you have requested does not exist")
  ) {
    return new Error(
      "Google Drive: El archivo no existe o fue eliminado de Google Drive. Prueba con otro enlace de descarga.",
    );
  }
  const title = html
    .match(/<(?:title|h1)[^>]*>([^<]+)<\/\s*(?:title|h1)>/i)?.[1]
    ?.replace(/\s+/g, " ")
    .trim();
  return new Error(
    `El servidor de descarga devolvió una página web en lugar del archivo${title ? ` (${title})` : ""}. Selecciona otro enlace de descarga disponible.`,
  );
}

export { looksLikeHtmlResponse, getHtmlResponseError };
