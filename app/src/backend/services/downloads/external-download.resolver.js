function quoteCommandArgument(value) {
  const argument = String(value ?? "").replace(/[\r\n]/g, "");
  if (window.NL_OS === "Windows") {
    return `"${argument.replace(/["^]/g, "^$&")}"`;
  }
  return `'${argument.replaceAll("'", `'"'"'`)}'`;
}

function getGoogleDriveFileId(url) {
  if (!url) return null;
  const str = String(url instanceof URL ? url.href : url).trim();
  const directMatch =
    str.match(/\/file\/d\/([a-zA-Z0-9_-]+)/i) ||
    str.match(/[?&]id=([a-zA-Z0-9_-]+)/i) ||
    str.match(/\/d\/([a-zA-Z0-9_-]+)/i) ||
    str.match(/\/folders\/([a-zA-Z0-9_-]+)/i) ||
    str.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/i);
  if (directMatch && directMatch[1]) {
    return directMatch[1];
  }
  try {
    const parsed = url instanceof URL ? url : new URL(str);
    return (
      parsed.searchParams.get("id") ||
      parsed.pathname.match(/\/file\/d\/([^/]+)/)?.[1] ||
      parsed.pathname.match(/\/d\/([^/]+)/)?.[1] ||
      null
    );
  } catch {
    return null;
  }
}

const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function extractMediaFireDirectUrl(html) {
  if (!html) return null;
  const decoded = String(html).replaceAll("&amp;", "&").replaceAll("\\/", "/");

  // 1. Direct download button id
  const buttonMatch =
    decoded.match(/id=["']downloadButton["'][^>]*href=["']([^"']+)["']/i) ||
    decoded.match(/href=["']([^"']+)["'][^>]*id=["']downloadButton["']/i);
  if (buttonMatch && /^https?:\/\//i.test(buttonMatch[1])) {
    return buttonMatch[1];
  }

  // 2. aria-label="Download file"
  const ariaMatch =
    decoded.match(
      /aria-label=["']Download file["'][^>]*href=["']([^"']+)["']/i,
    ) ||
    decoded.match(
      /href=["']([^"']+)["'][^>]*aria-label=["']Download file["']/i,
    );
  if (ariaMatch && /^https?:\/\//i.test(ariaMatch[1])) {
    return ariaMatch[1];
  }

  // 3. Class popsok or download_link
  const classMatch =
    decoded.match(
      /class=["'][^"']*(?:popsok|download_link)[^"']*["'][^>]*href=["']([^"']+)["']/i,
    ) ||
    decoded.match(
      /href=["']([^"']+)["'][^>]*class=["'][^"']*(?:popsok|download_link)[^"']*["']/i,
    );
  if (classMatch && /^https?:\/\//i.test(classMatch[1])) {
    return classMatch[1];
  }

  // 4. Look for direct download server hostnames: download*.mediafire.com or d*.mediafire.com
  const directDomainMatch = decoded.match(
    /https?:\/\/(?:download\d*|d\d*)\.mediafire\.com\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+\/[^"'\s<>\\]+/i,
  );
  if (directDomainMatch) {
    return directDomainMatch[0];
  }

  // 5. JavaScript assignment variable
  const jsMatch = decoded.match(
    /(?:kNO|window\.location\.href)\s*=\s*["'](https?:\/\/(?:download\d*|d\d*)\.mediafire\.com\/[^"']+)["']/i,
  );
  if (jsMatch && jsMatch[1]) {
    return jsMatch[1];
  }

  return null;
}

function getMediaFirePageError(html) {
  const decoded = String(html || "")
    .replaceAll("&amp;", "&")
    .replaceAll("\\/", "/");
  const lower = decoded.toLowerCase();

  if (
    lower.includes("unknown or invalid quickkey") ||
    lower.includes("the key you provided for file download was invalid") ||
    lower.includes("the file you requested has been deleted") ||
    lower.includes("the file you attempted to download was removed") ||
    lower.includes("file removed") ||
    lower.includes("dangerous file blocked") ||
    lower.includes("file sharing and storage made simple") ||
    /errno=320/i.test(decoded) ||
    lower.includes("404 not found") ||
    lower.includes("error 404")
  ) {
    return "MediaFire: El archivo fue eliminado o ya no se encuentra disponible en MediaFire. Selecciona otro enlace de descarga.";
  }

  if (
    lower.includes("this file is password protected") ||
    /id=["']password_download["']/i.test(decoded)
  ) {
    return "MediaFire: Este archivo está protegido por contraseña y no se puede descargar automáticamente.";
  }

  if (lower.includes("blocked") || lower.includes("terms of service")) {
    return "MediaFire: Este archivo fue bloqueado por MediaFire.";
  }

  return "MediaFire: No se pudo obtener el enlace directo de descarga. Selecciona otro enlace de descarga.";
}

/**
 * @fix 2026-08-05T03:31:10.964Z - Fix external download link resolution with browser User-Agent
 */
async function resolveExternalDownloadUrl(url, executeCommand) {
  const value = String(url || "").trim();
  if (!value) throw new Error("This download link is missing");
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("This external download link is invalid");
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("This external download link is not supported");
  }
  const hostname = parsed.hostname.toLowerCase();
  if (
    hostname === "drive.google.com" ||
    hostname === "drive.usercontent.google.com" ||
    hostname === "docs.google.com"
  ) {
    const fileId = getGoogleDriveFileId(parsed);
    if (!fileId) {
      throw new Error(
        "This Google Drive link does not point to a downloadable file",
      );
    }
    return `https://drive.usercontent.google.com/download?id=${encodeURIComponent(fileId)}&export=download&confirm=t`;
  }
  if (hostname === "mediafire.com" || hostname === "www.mediafire.com") {
    const result = await executeCommand(
      `curl --globoff -sSL -A ${quoteCommandArgument(BROWSER_USER_AGENT)} -H "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" -H "Accept-Language: en-US,en;q=0.9" --connect-timeout 10 --max-time 30 ${quoteCommandArgument(value)}`,
      { background: false },
    );
    if (result.exitCode !== 0 && !result.stdOut) {
      throw new Error(
        "MediaFire: No se pudo acceder al enlace de MediaFire. Comprueba tu conexión o selecciona otro enlace de descarga.",
      );
    }
    const directUrl = extractMediaFireDirectUrl(result.stdOut || "");
    if (!directUrl) {
      throw new Error(getMediaFirePageError(result.stdOut || ""));
    }
    return directUrl;
  }
  return value;
}

async function getRangeSupportedFileSize(url, executeCommand) {
  const nullDevice = window.NL_OS === "Windows" ? "NUL" : "/dev/null";
  const result = await executeCommand(
    `curl --globoff -sS -L --fail --connect-timeout 3 --max-time 3 --range 0-0 -D - -o ${quoteCommandArgument(nullDevice)} ${quoteCommandArgument(url)}`,
    { background: false },
  );
  if (result.exitCode !== 0) {
    throw new Error(
      result.stdErr || `Range check failed with exit code ${result.exitCode}`,
    );
  }
  const headers = `${result.stdOut || ""}
${result.stdErr || ""}`;
  const status = Number(
    [...headers.matchAll(/^HTTP\/\S+\s+(\d{3})/gim)].at(-1)?.[1] || 0,
  );
  if (status && (status < 200 || status >= 400)) return 0;
  const ranges = [...headers.matchAll(/content-range:\s*bytes\s+0-0\/(\d+)/gi)];
  const rangeSize = Number(ranges.at(-1)?.[1]);
  if (rangeSize > 0) return rangeSize;
  const lengths = [...headers.matchAll(/content-length:\s*(\d+)/gi)];
  const length = Number(lengths.at(-1)?.[1]);
  return length > 0 ? length : 0;
}

export {
  getGoogleDriveFileId,
  extractMediaFireDirectUrl,
  getMediaFirePageError,
  resolveExternalDownloadUrl,
  getRangeSupportedFileSize,
};
