function quoteCommandArgument(value) {
  return `"${String(value).replaceAll('"', '\\"')}"`;
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
      `curl --globoff -fsSL -A ${quoteCommandArgument(BROWSER_USER_AGENT)} --connect-timeout 10 --max-time 30 ${quoteCommandArgument(value)}`,
      { background: false },
    );
    if (result.exitCode !== 0) {
      throw new Error(
        "This MediaFire link could not be opened. Choose another download link.",
      );
    }
    const page = (result.stdOut || "")
      .replaceAll("&amp;", "&")
      .replaceAll("\\/", "/");
    const directUrl =
      page.match(
        /https?:\/\/(?:download\d*|[a-z0-9-]+)\.mediafire\.com[^"'\s<>\\]+/i,
      )?.[0] || page.match(/https?:\/\/[^"'\s<>]+\/download\/[^"'\s<>]+/i)?.[0];
    if (!directUrl) {
      throw new Error(
        "This MediaFire link is not supported. Choose another download link.",
      );
    }
    return directUrl;
  }
  return value;
}

async function getRangeSupportedFileSize(url, executeCommand) {
  const result = await executeCommand(
    `curl --globoff -sS -L -I --connect-timeout 3 --max-time 3 --range 0-0 ${quoteCommandArgument(url)}`,
    { background: false },
  );
  if (result.exitCode !== 0) {
    throw new Error(
      result.stdErr || `Range check failed with exit code ${result.exitCode}`,
    );
  }
  const headers = `${result.stdOut || ""}
${result.stdErr || ""}`;
  const ranges = [
    ...headers.matchAll(/content-range:\s*bytes\s+0-0\/(\d+)/gi),
  ];
  const rangeSize = Number(ranges.at(-1)?.[1]);
  if (rangeSize > 0) return rangeSize;
  const lengths = [...headers.matchAll(/content-length:\s*(\d+)/gi)];
  const length = Number(lengths.at(-1)?.[1]);
  return length > 0 ? length : 0;
}

export {
  getGoogleDriveFileId,
  resolveExternalDownloadUrl,
  getRangeSupportedFileSize,
};
