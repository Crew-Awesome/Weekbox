export function getTargetPlatform(versionData) {
  const os = window.NL_OS;
  const arch = window.NL_ARCH;
  const fallback =
    versionData?.fallbackPlatform && versionData[versionData.fallbackPlatform]
      ? versionData.fallbackPlatform
      : null;

  if (os === "Windows") {
    if (arch === "x64") {
      return versionData.win64 ? "win64" : versionData.win ? "win" : null;
    } else {
      return versionData.win32 ? "win32" : versionData.win ? "win" : null;
    }
  } else if (os === "Linux") {
    return versionData.lin ? "lin" : fallback;
  } else if (os === "Darwin") {
    if (arch === "x64")
      return versionData.mac64 ? "mac64" : versionData.mac ? "mac" : fallback;
    if (arch === "arm64")
      return versionData.macarm ? "macarm" : versionData.mac ? "mac" : fallback;
    if (versionData.mac) return "mac";
    if (versionData.mac64) return "mac64";
    if (versionData.macarm) return "macarm";
    return fallback;
  }
  return null;
}

export function getTargetLink(versionData) {
  const platform = getTargetPlatform(versionData);
  return platform ? versionData[platform] || null : null;
}

export function getTargetSize(versionData) {
  const platform = getTargetPlatform(versionData);
  const size = Number(versionData?.assetSizes?.[platform]);
  return size > 0 ? size : 0;
}

export function extractVersionFallback(url) {
  if (!url) return "Unknown";
  const githubMatch = url.match(/\/download\/(v?([^\/]+))\//);
  if (githubMatch && githubMatch[2]) return githubMatch[2];

  const genericMatch = url.match(
    /(?:v|-)?(\d+\.\d+(?:\.\d+)?(?:[a-zA-Z0-9-]*))/i,
  );
  if (genericMatch && genericMatch[1]) return genericMatch[1];

  return "Unknown";
}
