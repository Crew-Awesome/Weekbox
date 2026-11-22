import { setBoundedCache } from "../../utils/bounded-cache.util.js";
import {
  extractMediaFireDirectUrl,
  getGoogleDriveFileId,
  getRangeSupportedFileSize,
} from "../downloads/external-download.resolver.js";

const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

function quoteCommandArgument(value) {
  const argument = String(value).replace(/[\r\n]/g, "");
  if (window.NL_OS === "Windows") {
    return `"${argument.replace(/["^]/g, "^$&")}"`;
  }
  return `'${argument.replaceAll("'", "'\\''")}'`;
}

function parseHumanFileSize(value) {
  const match = String(value || "").match(
    /([\d.,]+)\s*(B|KB|MB|GB|TB|K|M|G|T)\b/i,
  );
  if (!match) return 0;
  const amount = Number(match[1].replace(",", "."));
  const unit = match[2].toUpperCase();
  const power = { B: 0, K: 1, KB: 1, M: 2, MB: 2, G: 3, GB: 3, T: 4, TB: 4 }[
    unit
  ];
  return Number.isFinite(amount) && power !== undefined
    ? Math.round(amount * 1024 ** power)
    : 0;
}

function isGoogleDriveHost(hostname) {
  return [
    "drive.google.com",
    "drive.usercontent.google.com",
    "docs.google.com",
  ].includes(hostname);
}

async function getGoogleDriveFileDetails(url) {
  const fileId = getGoogleDriveFileId(url);
  if (!fileId) return null;
  try {
    const size = await getRangeSupportedFileSize(
      `https://drive.usercontent.google.com/download?id=${encodeURIComponent(fileId)}&export=download&confirm=t`,
      (...args) => Neutralino.os.execCommand(...args),
    );
    return { filename: null, size: Number(size) || 0 };
  } catch {
    return { filename: null, size: 0 };
  }
}

async function getMediaFireDownloadInfo(url) {
  const page = await Neutralino.os.execCommand(
    `curl -sSL -A ${quoteCommandArgument(BROWSER_USER_AGENT)} -H "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" -H "Accept-Language: en-US,en;q=0.9" --connect-timeout 5 --max-time 12 ${quoteCommandArgument(url)}`,
    { background: false },
  );
  if (page.exitCode !== 0 && !page.stdOut)
    return { result: { filename: null, size: 0 } };
  const html = page.stdOut || "";
  const pageSize = parseHumanFileSize(
    html.match(/File size:\s*<span>\s*([^<]+)<\/span>/i)?.[1] ||
      html.match(/Download\s*\(([^)]+)\)/i)?.[1] ||
      html.match(
        /(?:File size|Download)[\s\S]{0,80}?([\d.,]+\s*(?:B|KB|MB|GB|TB|K|M|G|T)\b)/i,
      )?.[1],
  );
  const downloadUrl = extractMediaFireDirectUrl(html);
  return downloadUrl
    ? { downloadUrl, pageSize }
    : { result: { filename: null, size: pageSize } };
}

async function getExternalHeaderDetails(downloadUrl, pageSize) {
  const result = await Neutralino.os.execCommand(
    `curl -fsSIL -A ${quoteCommandArgument(BROWSER_USER_AGENT)} --connect-timeout 5 --max-time 12 ${quoteCommandArgument(downloadUrl)}`,
    { background: false },
  );
  if (result.exitCode !== 0) return { filename: null, size: pageSize };
  const header = `${result.stdOut || ""}\n${result.stdErr || ""}`;
  const filename = header.match(
    /content-disposition:[^\r\n]*filename\*?=(?:UTF-8''|"?)([^";\r\n]+)/i,
  )?.[1];
  const sizes = [...header.matchAll(/content-length:\s*(\d+)/gi)];
  const ranges = [...header.matchAll(/content-range:[^\r\n]*\/(\d+)/gi)];
  const size = Number(ranges.at(-1)?.[1] || sizes.at(-1)?.[1] || pageSize || 0);
  return {
    filename: filename
      ? decodeURIComponent(filename.trim().replace(/^"+|"+$/g, ""))
      : null,
    size: Number.isFinite(size) ? size : 0,
  };
}

class GameBananaExternalDownloadService {
  constructor() {
    this.availabilityCache = new Map();
  }

  async getFileDetails(url) {
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      if (isGoogleDriveHost(hostname))
        return await getGoogleDriveFileDetails(url);
      if (
        hostname !== "github.com" &&
        !["mediafire.com", "www.mediafire.com"].includes(hostname)
      ) {
        return { filename: null, size: 0 };
      }
      if (hostname === "github.com")
        return await getExternalHeaderDetails(url, 0);
      const mediafire = await getMediaFireDownloadInfo(url);
      if (mediafire.result) return mediafire.result;
      return await getExternalHeaderDetails(
        mediafire.downloadUrl,
        mediafire.pageSize,
      );
    } catch {
      return null;
    }
  }

  async isAvailable(url) {
    const cacheKey = String(url);
    const cached = this.availabilityCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.available;
    try {
      const result = await Neutralino.os.execCommand(
        `curl -sSIL -A ${quoteCommandArgument(BROWSER_USER_AGENT)} --connect-timeout 3 --max-time 5 ${quoteCommandArgument(url)}`,
        { background: false },
      );
      if (result.exitCode !== 0) return null;
      const statuses = [
        ...`${result.stdOut || ""}`.matchAll(/HTTP\/\S+\s+(\d{3})/gi),
      ];
      const status = Number(statuses.at(-1)?.[1]);
      if (!Number.isFinite(status)) return null;
      const isErrorPage = `${result.stdOut || ""}`
        .toLowerCase()
        .includes("location: /error.php");
      const available = status < 400 && !isErrorPage;
      setBoundedCache(
        this.availabilityCache,
        cacheKey,
        {
          available,
          expiresAt: Date.now() + 5 * 60 * 1000,
        },
        100,
      );
      return available;
    } catch {
      return null;
    }
  }

  isKnownUnavailable(url) {
    const cached = this.availabilityCache.get(String(url));
    return Boolean(
      cached && cached.expiresAt > Date.now() && cached.available === false,
    );
  }
}

export const gameBananaExternalDownloads =
  new GameBananaExternalDownloadService();
