function quoteCommandArgument(value) {
  return `"${String(value).replaceAll('"', '\\"')}"`;
}

function getGoogleDriveFileId(url) {
  const parsed = url instanceof URL ? url : new URL(url);
  return (
    parsed.searchParams.get("id") ||
    parsed.pathname.match(/\/file\/d\/([^/]+)/)?.[1] ||
    null
  );
}

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
    hostname === "drive.usercontent.google.com"
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
      `curl --globoff -fsSL --connect-timeout 10 --max-time 30 ${quoteCommandArgument(value)}`,
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
  const match = headers.match(/content-range:\s*bytes\s+0-0\/(\d+)/i);
  return match ? Number(match[1]) : 0;
}

export {
  getGoogleDriveFileId,
  resolveExternalDownloadUrl,
  getRangeSupportedFileSize,
};
