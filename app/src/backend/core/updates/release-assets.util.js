function getPlatformPackage() {
  if (window.NL_OS === "Windows") return null;
  if (window.NL_OS === "Linux") {
    const architecture =
      window.NL_ARCH === "arm64"
        ? "arm64"
        : window.NL_ARCH === "armhf" || window.NL_ARCH === "arm"
          ? "armhf"
          : "x64";
    return {
      asset: `linux-${architecture}`,
      binary: `WeekBox-linux_${architecture}`,
    };
  }
  if (window.NL_OS === "Darwin") {
    const architecture = window.NL_ARCH === "arm64" ? "arm64" : "x64";
    return {
      asset: `macos-${architecture}`,
      binary: `WeekBox-mac_${architecture}`,
    };
  }
  return null;
}
function getReleaseAsset(release, platform) {
  const expression = new RegExp(
    `^WeekBox-\\d+(?:\\.\\d+)*-${platform.asset.replaceAll("-", "\\-")}\\.zip$`,
    "i",
  );
  return (release.assets || []).find(
    (asset) =>
      expression.test(asset.name || "") &&
      asset.state === "uploaded" &&
      ["application/zip", "application/x-zip-compressed"].includes(
        asset.content_type,
      ) &&
      Number(asset.size) > 0,
  );
}
function getResourcesAsset(release) {
  return (release.assets || []).find((asset) => {
    if (asset.state !== "uploaded" || Number(asset.size) <= 0) return false;
    const name = asset.name || "";
    return (
      /^WeekBox-.*-resources\.neu$/i.test(name) ||
      /^resources\.neu$/i.test(name)
    );
  });
}
function getWindowsPackage(release) {
  const architecture =
    window.NL_ARCH === "arm64"
      ? "arm64"
      : window.NL_ARCH === "armhf" || window.NL_ARCH === "arm"
        ? "armhf"
        : "x64";
  const expression = new RegExp(
    `^WeekBox-\\d+(?:\\.\\d+)*-windows-${architecture}\\.zip$`,
    "i",
  );
  return (release.assets || []).find(
    (asset) =>
      expression.test(asset.name || "") &&
      asset.state === "uploaded" &&
      Number(asset.size) > 0,
  );
}

export {
  getPlatformPackage,
  getReleaseAsset,
  getResourcesAsset,
  getWindowsPackage,
};
