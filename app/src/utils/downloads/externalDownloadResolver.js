function quoteCommandArgument(value) {
  return `"${String(value).replaceAll('"', '\\"')}"`;
}

export function getGoogleDriveFileId(url) {
  const parsed = url instanceof URL ? url : new URL(url);
  return (
    parsed.searchParams.get("id") ||
    parsed.pathname.match(/\/file\/d\/([^/]+)/)?.[1] ||
    null
  );
}

export async function resolveExternalDownloadUrl(url, executeCommand) {
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
  if (hostname === "drive.google.com") {
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
      `curl -fsSL --connect-timeout 10 --max-time 30 ${quoteCommandArgument(value)}`,
      { background: false },
    );
    if (result.exitCode !== 0) {
      throw new Error(
        result.stdErr || "Could not open the MediaFire download page",
      );
    }
    const directUrl = (result.stdOut || "")
      .replaceAll("&amp;", "&")
      .match(/https?:\/\/download[^"'\s<>]+\.mediafire\.com[^"'\s<>]*/i)?.[0];
    if (!directUrl) {
      throw new Error("Could not find the MediaFire download link");
    }
    return directUrl;
  }
  return value;
}

export async function getRangeSupportedFileSize(url, executeCommand) {
  const result = await executeCommand(
    `curl -sS -L -I --connect-timeout 3 --max-time 3 --range 0-0 ${quoteCommandArgument(url)}`,
    { background: false },
  );
  if (result.exitCode !== 0) {
    throw new Error(
      result.stdErr || `Range check failed with exit code ${result.exitCode}`,
    );
  }
  const headers = `${result.stdOut || ""}\n${result.stdErr || ""}`;
  const match = headers.match(/content-range:\s*bytes\s+0-0\/(\d+)/i);
  return match ? Number(match[1]) : 0;
}
