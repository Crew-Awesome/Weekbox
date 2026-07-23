export function getTargetPlatform(versionData) {
  const os = window.NL_OS;
  const arch = window.NL_ARCH;

  if (os === "Windows") {
    if (arch === "x64") {
      return versionData.win64 ? "win64" : versionData.win ? "win" : null;
    } else {
      return versionData.win32 ? "win32" : versionData.win ? "win" : null;
    }
  } else if (os === "Linux") {
    return versionData.lin ? "lin" : null;
  } else if (os === "Darwin") {
    if (arch === "x64")
      return versionData.mac64 ? "mac64" : versionData.mac ? "mac" : null;
    if (arch === "arm64")
      return versionData.macarm ? "macarm" : versionData.mac ? "mac" : null;
    return versionData.mac
      ? "mac"
      : versionData.mac64
        ? "mac64"
        : versionData.macarm
          ? "macarm"
          : null;
  }
  return null;
}

export function getTargetLink(versionData) {
  const platform = getTargetPlatform(versionData);
  return platform ? versionData[platform] || null : null;
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
