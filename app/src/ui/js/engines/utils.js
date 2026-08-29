function firstAvailablePlatform(versionData, platforms, fallback = null) {
  return platforms.find((platform) => versionData?.[platform]) || fallback;
}

export function getTargetPlatform(versionData) {
  const fallback = versionData?.fallbackPlatform;
  const fallbackPlatform = versionData?.[fallback] ? fallback : null;
  const platforms = {
    Windows: window.NL_ARCH === "x64" ? ["win64", "win"] : ["win32", "win"],
    Linux: ["lin"],
    Darwin:
      window.NL_ARCH === "x64"
        ? ["mac64", "mac"]
        : window.NL_ARCH === "arm64"
          ? ["macarm", "mac"]
          : ["mac", "mac64", "macarm"],
  };
  return firstAvailablePlatform(
    versionData,
    platforms[window.NL_OS] || [],
    fallbackPlatform,
  );
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
