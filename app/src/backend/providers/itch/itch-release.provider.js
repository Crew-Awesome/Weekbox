import { nativeFetch } from "../../services/network/native-http.js";

const ITCH_REQUEST_TIMEOUT_MS = 15_000;
const ITCH_REQUEST_ATTEMPTS = 3;

function getItchUrl(pageUrl, path) {
  const page = new URL(pageUrl.endsWith("/") ? pageUrl : `${pageUrl}/`);
  if (page.protocol !== "https:" || !page.hostname.endsWith(".itch.io")) {
    throw new Error("Unsupported Itch.io URL");
  }
  return new URL(`./${path}`, page).toString();
}

function parseSize(value) {
  const match = String(value || "").match(/([\d.]+)\s*(KB|MB|GB)/i);
  if (!match) return 0;
  const units = { KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3 };
  return Math.round(Number(match[1]) * units[match[2].toUpperCase()]);
}

function cleanText(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function isRetryableItchResponse(response) {
  return response.status === 408 || response.status === 429 || response.status >= 500;
}

async function fetchItch(url, options = {}) {
  let lastError;
  for (let attempt = 1; attempt <= ITCH_REQUEST_ATTEMPTS; attempt += 1) {
    try {
      const response = await nativeFetch(url, options);
      if (!isRetryableItchResponse(response) || attempt === ITCH_REQUEST_ATTEMPTS)
        return response;
      lastError = new Error(`Itch.io request failed: ${response.status}`);
    } catch (error) {
      lastError = error;
      if (attempt === ITCH_REQUEST_ATTEMPTS) throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 300 * 2 ** (attempt - 1)));
  }
  throw lastError;
}

function parseUploadRows(html) {
  const rows = [];
  const uploadPattern =
    /<div\b(?=[^>]*\bclass=["'][^"']*\bupload\b[^"']*["'])[^>]*>[\s\S]*?(?=<div\b(?=[^>]*\bclass=["'][^"']*\bupload\b)|<\/body\b|$)/gi;

  for (const match of String(html || "").matchAll(uploadPattern)) {
    const row = match[0];
    const name = cleanText(
      row.match(
        /<strong\b[^>]*\bclass=["'][^"']*\bname\b[^"']*["'][^>]*>([\s\S]*?)<\/strong>/i,
      )?.[1],
    );
    if (!name) continue;

    rows.push({
      id: row.match(/\bdata-upload_id=["'](\d+)["']/i)?.[1],
      name,
      size: parseSize(
        row.match(/\bfile_size\b[\s\S]*?<span\b[^>]*>([^<]+)</i)?.[1],
      ),
      version: cleanText(row.match(/\bVersion\s+([\d][\w.-]*)/i)?.[1]),
    });
  }
  return rows;
}

function parseUploads(html, source) {
  const uploads = parseUploadRows(html);
  const platformUploads = {};
  for (const [platform, pattern] of Object.entries(source.platforms)) {
    const upload = uploads.find((item) => {
      pattern.lastIndex = 0;
      return pattern.test(item.name);
    });
    if (upload) platformUploads[platform] = upload;
  }
  return platformUploads;
}

export async function getItchRelease(source, githubRepository = "") {
  const response = await fetchItch(source.pageUrl, {
    timeout: ITCH_REQUEST_TIMEOUT_MS,
  });
  if (!response.ok)
    throw new Error(`Itch.io request failed: ${response.status}`);
  const html = await response.text();
  const version = html.match(
    /\bVersion\s+([\d][\w.-]*)/i,
  )?.[1];
  if (!version) return null;
  const uploads = parseUploads(html, source);

  return {
    version,
    label: `Itch (${version})`,
    itch: {
      pageUrl: source.pageUrl,
      platforms: Object.keys(uploads),
      uploads,
    },
    githubRepository,
  };
}

export async function resolveItchDownloadUrl(itch, platform) {
  const purchaseResponse = await fetchItch(
    getItchUrl(itch.pageUrl, "purchase"),
    { timeout: ITCH_REQUEST_TIMEOUT_MS },
  );
  if (!purchaseResponse.ok)
    throw new Error(
      `Itch.io purchase request failed: ${purchaseResponse.status}`,
    );

  const purchaseHtml = await purchaseResponse.text();
  const csrfToken = purchaseHtml.match(
    /<meta\b[^>]*\bname=["']csrf_token["'][^>]*\bvalue=["']([^"']*)["']/i,
  )?.[1];
  if (!csrfToken) throw new Error("Itch.io download token is unavailable");

  const downloadPageResponse = await fetchItch(
    getItchUrl(itch.pageUrl, "download_url"),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Requested-With": "XMLHttpRequest",
        Referer: getItchUrl(itch.pageUrl, "purchase"),
      },
      body: `csrf_token=${encodeURIComponent(csrfToken)}&reward_id=`,
      timeout: ITCH_REQUEST_TIMEOUT_MS,
    },
  );
  if (!downloadPageResponse.ok)
    throw new Error(
      `Itch.io download page request failed: ${downloadPageResponse.status}`,
    );
  const downloadPageUrl = (await downloadPageResponse.json())?.url;
  if (!downloadPageUrl) throw new Error("Itch.io download page is unavailable");

  const downloadPage = await fetchItch(downloadPageUrl, {
    timeout: ITCH_REQUEST_TIMEOUT_MS,
  });
  if (!downloadPage.ok)
    throw new Error(`Itch.io download page failed: ${downloadPage.status}`);
  const uploads = parseUploads(await downloadPage.text(), {
    platforms: {
      win: /windows/i,
      lin: /linux/i,
      mac: /mac/i,
    },
  });
  const uploadId = uploads[platform]?.id;
  if (!uploadId) throw new Error("Itch.io upload is unavailable");

  const response = await fetchItch(
    getItchUrl(
      itch.pageUrl,
      `file/${encodeURIComponent(uploadId)}?source=game_download`,
    ),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Requested-With": "XMLHttpRequest",
        Referer: getItchUrl(itch.pageUrl, "purchase"),
      },
      body: `csrf_token=${encodeURIComponent(csrfToken)}`,
      timeout: ITCH_REQUEST_TIMEOUT_MS,
    },
  );
  if (!response.ok)
    throw new Error(`Itch.io download request failed: ${response.status}`);

  const result = await response.json();
  if (!result?.url) throw new Error("Itch.io did not return a download URL");
  return result.url;
}
