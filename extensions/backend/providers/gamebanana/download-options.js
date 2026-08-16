const MIN_INSTALLABLE_FILE_SIZE = 1024;

export function getDownloadFiles(data) {
  const files = data?._aFiles;
  if (Array.isArray(files)) return files;
  if (!files || typeof files !== "object") return [];
  if (files._sDownloadUrl) return [files];
  return Object.values(files).filter(
    (file) => file && typeof file === "object",
  );
}

export function isInstallableDownloadFile(file) {
  const placeholderText = `${file?._sFile || ""} ${file?._sDescription || ""}`
    .replaceAll("_", " ")
    .toLowerCase();
  return (
    !file?._bIsArchived &&
    file?._bHasContents !== false &&
    Boolean(file?._sDownloadUrl) &&
    Number(file?._nFilesize || 0) >= MIN_INSTALLABLE_FILE_SIZE &&
    !/\b(?:placeholder|use\s+(?:mediafire|drive|external)|download\s+(?:from|on)\s+(?:mediafire|drive))\b/.test(
      placeholderText,
    )
  );
}

export function getExternalDownloadLabel(url) {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (hostname.endsWith("mediafire.com")) return "MediaFire download";
    if (hostname === "drive.google.com") return "Drive download";
    if (hostname === "github.com") return "GitHub release download";
  } catch {}
  return "External download";
}

export function getPreferredDownloadOption(options) {
  return (
    options.find((option) => option.type === "gamebanana") ||
    options.find(
      (option) =>
        option.type === "external" &&
        new URL(option.downloadUrl).hostname
          .toLowerCase()
          .endsWith("mediafire.com"),
    ) ||
    options.find(
      (option) =>
        option.type === "external" &&
        new URL(option.downloadUrl).hostname.toLowerCase() === "github.com",
    ) ||
    options.find((option) => option.type === "external") ||
    null
  );
}
