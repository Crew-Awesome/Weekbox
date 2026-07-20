import { downloadArchive } from "../utils/downloads/archiveTransfer.js";

const RELEASES_API =
  "https://api.github.com/repos/Crew-Awesome/Weekbox/releases/latest";
const RELEASES_PAGE = "https://github.com/Crew-Awesome/Weekbox/releases/latest";
const UPDATE_DIRECTORY = ".weekbox-update";

function normalizeVersion(value) {
  return String(value || "")
    .trim()
    .replace(/^v/i, "")
    .split("-")[0];
}

function compareVersions(left, right) {
  const leftParts = normalizeVersion(left).split(".").map(Number);
  const rightParts = normalizeVersion(right).split(".").map(Number);
  const length = Math.max(leftParts.length, rightParts.length);
  for (let index = 0; index < length; index += 1) {
    const difference = (leftParts[index] || 0) - (rightParts[index] || 0);
    if (difference) return Math.sign(difference);
  }
  return 0;
}

function toHex(buffer) {
  return [...new Uint8Array(buffer)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function isValidNeutralinoBundle(bytes) {
  if (!bytes || bytes.length < 4) return false;
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) return true;
  if (bytes[0] === 0x04 && bytes[1] === 0x00) return true;
  return false;
}

function quoteShellString(value) {
  const escaped = String(value).replaceAll("'", "'\"'\"'");
  return `'${escaped}'`;
}

function createUnixApplyScript({
  appPath,
  archivePath,
  expectedDigest,
  binaryName,
  scriptPath,
}) {
  const target = quoteShellString(appPath);
  const archive = quoteShellString(archivePath);
  const staging = quoteShellString(`${appPath}/.weekbox-update-staging`);
  const sourceBinary = quoteShellString(
    `${appPath}/.weekbox-update-staging/${binaryName}`,
  );
  const sourceResources = quoteShellString(
    `${appPath}/.weekbox-update-staging/resources.neu`,
  );
  const targetBinary = quoteShellString(`${appPath}/${binaryName}`);
  const targetResources = quoteShellString(`${appPath}/resources.neu`);
  const updaterScript = quoteShellString(scriptPath);

  return `#!/bin/sh
set -eu
target=${target}
archive=${archive}
update_directory=$(dirname "$archive")
script_path=${updaterScript}
expected_hash=${quoteShellString(expectedDigest)}
while kill -0 ${Number(window.NL_PID)} 2>/dev/null; do sleep 1; done
if command -v sha256sum >/dev/null 2>&1; then actual_hash=$(sha256sum "$archive" | awk '{print $1}'); else actual_hash=$(shasum -a 256 "$archive" | awk '{print $1}'); fi
[ "$actual_hash" = "$expected_hash" ] || { echo 'Downloaded update failed its integrity check.' >&2; exit 1; }
staging=${staging}
backup="$staging/.backup"
rm -rf "$staging"
unzip -qo "$archive" -d "$staging"
source_binary=${sourceBinary}
source_resources=${sourceResources}
[ -f "$source_binary" ] || { echo 'The update package is missing the WeekBox executable.' >&2; exit 1; }
target_binary=${targetBinary}
target_resources=${targetResources}
retry() {
  attempts=0
  until "$@"; do
    attempts=$((attempts + 1))
    [ "$attempts" -lt 3 ] || return 1
    sleep 1
  done
}
mkdir -p "$backup"
[ ! -f "$target_binary" ] || cp "$target_binary" "$backup/app"
[ ! -f "$target_resources" ] || cp "$target_resources" "$backup/resources.neu"
updated=false
cleanup() {
  if [ "$updated" != true ]; then
    [ ! -f "$backup/app" ] || cp "$backup/app" "$target_binary"
    [ ! -f "$backup/resources.neu" ] || cp "$backup/resources.neu" "$target_resources"
  fi
  rm -f "$archive"
  rm -f "$script_path"
  rmdir "$update_directory" 2>/dev/null || true
  rm -rf "$staging"
}
trap cleanup EXIT
retry cp "$source_binary" "$target_binary"
if [ -f "$source_resources" ]; then
  retry cp "$source_resources" "$target_resources"
else
  rm -f "$target_resources"
fi
retry chmod 755 "$target_binary"
launch_attempts=0
while :; do
  "$target_binary" >/dev/null 2>&1 &
  launch_pid=$!
  sleep 1
  if kill -0 "$launch_pid" 2>/dev/null; then
    updated=true
    break
  fi
  launch_attempts=$((launch_attempts + 1))
  [ "$launch_attempts" -lt 3 ] || exit 1
done
`;
}

async function getCurrentVersion() {
  const config = await Neutralino.app.getConfig();
  return config.version || "0.0.0";
}

function getPlatformPackage() {
  if (window.NL_OS === "Windows") {
    return null;
  }
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
      /^WeekBox-.*-resources\.neu$/i.test(name) || /^resources\.neu$/i.test(name)
    );
  });
}

function getWindowsPackage(release) {
  const expression = /^WeekBox-\d+(?:\.\d+)*-windows-x64\.zip$/i;
  return (release.assets || []).find(
    (asset) =>
      expression.test(asset.name || "") &&
      asset.state === "uploaded" &&
      Number(asset.size) > 0,
  );
}

async function fetchLatestRelease() {
  const response = await fetch(RELEASES_API, {
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2026-03-10",
    },
  });
  if (!response.ok)
    throw new Error(`Update check failed: GitHub returned ${response.status}`);
  return response.json();
}

export const appUpdater = {
  getCurrentVersion,

  async check() {
    const release = await fetchLatestRelease();
    const latestVersion = normalizeVersion(release.tag_name);
    const currentVersion = await getCurrentVersion();
    if (!latestVersion) {
      throw new Error("Could not determine the latest WeekBox version.");
    }

    if (window.NL_OS === "Windows") {
      const packageAsset = getWindowsPackage(release);
      if (packageAsset) {
        if (compareVersions(latestVersion, currentVersion) <= 0) {
          return { status: "current", currentVersion, latestVersion };
        }
        return {
          status: "available",
          currentVersion,
          latestVersion,
          asset: packageAsset,
          windowsPackage: true,
          releaseUrl: release.html_url || RELEASES_PAGE,
        };
      }
      const asset = getResourcesAsset(release);
      if (!asset) {
        return {
          status: "unsupported",
          message:
            "Automatic updates are not available for this release yet. Download the latest version manually.",
        };
      }
      if (compareVersions(latestVersion, currentVersion) <= 0) {
        return { status: "current", currentVersion, latestVersion };
      }
      return {
        status: "available",
        currentVersion,
        latestVersion,
        asset,
        windowsResources: true,
        releaseUrl: release.html_url || RELEASES_PAGE,
      };
    }

    const platform = getPlatformPackage();
    if (!platform) {
      return {
        status: "unsupported",
        message: "Automatic updates are not available for this platform.",
      };
    }

    const asset = getReleaseAsset(release, platform);
    if (!asset) {
      throw new Error(
        `The latest WeekBox release has no update package for ${window.NL_OS}.`,
      );
    }
    if (compareVersions(latestVersion, currentVersion) <= 0) {
      return { status: "current", currentVersion, latestVersion };
    }
    if (!/^sha256:[a-f0-9]{64}$/i.test(asset.digest || "")) {
      throw new Error(
        "The latest WeekBox release has no valid SHA-256 digest.",
      );
    }

    return {
      status: "available",
      currentVersion,
      latestVersion,
      asset,
      releaseUrl: release.html_url || RELEASES_PAGE,
    };
  },

  async install(update, onProgress = () => {}, onHandoff = () => {}) {
    if (update?.windowsPackage) {
      return this.installWindowsPackage(update, onProgress, onHandoff);
    }
    if (update?.windowsResources) {
      return this.installWindowsResources(update, onProgress, onHandoff);
    }

    const platform = getPlatformPackage();
    if (!platform)
      throw new Error("Automatic updates are not available for this platform.");
    if (!update?.asset)
      throw new Error("No WeekBox update is ready to install.");

    const updatePath = `${window.NL_PATH}/${UPDATE_DIRECTORY}`;
    const archivePath = `${updatePath}/${update.asset.name}`;
    const scriptPath = `${updatePath}/apply-update.sh`;
    const expectedDigest = update.asset.digest
      .slice("sha256:".length)
      .toLowerCase();
    await Neutralino.filesystem.createDirectory(updatePath).catch(() => {});

    onProgress("Downloading update…");
    await downloadArchive({
      url: update.asset.browser_download_url,
      outPath: archivePath,
      getTask: () => null,
      onProgress: (status) => onProgress(status),
    });
    const data = await Neutralino.filesystem.readBinaryFile(archivePath);

    onProgress("Verifying update…");
    const actualDigest = toHex(await crypto.subtle.digest("SHA-256", data));
    if (actualDigest !== expectedDigest) {
      throw new Error("Downloaded update failed its integrity check.");
    }
    onProgress("Closing WeekBox to apply update…");
    const applyScript = createUnixApplyScript({
      appPath: window.NL_PATH,
      archivePath,
      expectedDigest,
      binaryName: platform.binary,
      scriptPath,
    });
    await Neutralino.filesystem.writeFile(scriptPath, applyScript);
    const command = `/bin/sh ${quoteShellString(scriptPath)} >/dev/null 2>&1 &`;
    await Neutralino.os.execCommand(command, {
      background: true,
    });
    onHandoff();
    await Neutralino.app.exit();
  },

  async installWindowsResources(update, onProgress, onHandoff) {
    if (!update?.asset)
      throw new Error("No WeekBox update is ready to install.");

    const target = `${window.NL_PATH}/resources.neu`;
    const staging = `${window.NL_PATH}/${UPDATE_DIRECTORY}/resources.neu`;
    const backup = `${window.NL_PATH}/${UPDATE_DIRECTORY}/resources.neu.bak`;
    await Neutralino.filesystem
      .createDirectory(`${window.NL_PATH}/${UPDATE_DIRECTORY}`)
      .catch(() => {});

    if (await Neutralino.filesystem.exists(target)) {
      const current = await Neutralino.filesystem.readBinaryFile(target);
      await Neutralino.filesystem.writeBinaryFile(backup, current);
    }

    onProgress("Downloading update…");
    await downloadArchive({
      url: update.asset.browser_download_url,
      outPath: staging,
      getTask: () => null,
      onProgress: (status) => onProgress(status),
    });
    const bytes = new Uint8Array(await Neutralino.filesystem.readBinaryFile(staging));

    onProgress("Verifying update…");
    if (!isValidNeutralinoBundle(bytes)) {
      await Neutralino.filesystem.remove(backup).catch(() => {});
      throw new Error("Downloaded update is not a valid app bundle.");
    }
    if (
      update.asset.digest &&
      /^sha256:[a-f0-9]{64}$/i.test(update.asset.digest)
    ) {
      const actual = toHex(await crypto.subtle.digest("SHA-256", bytes));
      const expected = update.asset.digest
        .slice("sha256:".length)
        .toLowerCase();
      if (actual !== expected) {
        await Neutralino.filesystem.remove(backup).catch(() => {});
        throw new Error("Downloaded update failed its integrity check.");
      }
    }

    onProgress("Installing update…");
    await Neutralino.filesystem.writeBinaryFile(staging, bytes);
    await Neutralino.filesystem.writeBinaryFile(target, bytes);

    onProgress("Restarting WeekBox…");
    const exe = `${window.NL_PATH}/WeekBox-win_x64.exe`;
    await Neutralino.os.execCommand(`"${exe}"`, { background: true });
    onHandoff();
    await Neutralino.app.exit();
  },

  async installWindowsPackage(update, onProgress, onHandoff) {
    if (!update?.asset)
      throw new Error("No WeekBox update is ready to install.");

    const updateDir = `${window.NL_PATH}/${UPDATE_DIRECTORY}`;
    const zipPath = `${updateDir}/update.zip`;
    const staging = `${updateDir}/staging`;
    const scriptPath = `${updateDir}/apply-update.ps1`;
    const appPath = window.NL_PATH;

    await Neutralino.filesystem
      .createDirectory(updateDir)
      .catch(() => {});

    onProgress("Downloading update…");
    await downloadArchive({
      url: update.asset.browser_download_url,
      outPath: zipPath,
      getTask: () => null,
      onProgress: (status) => onProgress(status),
    });

    onProgress("Verifying update…");
    const bytes = new Uint8Array(await Neutralino.filesystem.readBinaryFile(zipPath));
    if (
      !(
        bytes[0] === 0x50 &&
        bytes[1] === 0x4b &&
        bytes[2] === 0x03 &&
        bytes[3] === 0x04
      )
    ) {
      await Neutralino.filesystem.remove(zipPath).catch(() => {});
      throw new Error("Downloaded update is not a valid package.");
    }

    const pid = window.NL_PID;
    const script = [
      "$ErrorActionPreference = 'Stop'",
      `$appPath = '${appPath}'`,
      `$zip = '${zipPath}'`,
      `$staging = '${staging}'`,
      `$pid_app = ${pid}`,
      "while (Get-Process -Id $pid_app -ErrorAction SilentlyContinue) { Start-Sleep -Seconds 1 }",
      "Expand-Archive -Path $zip -DestinationPath $staging -Force",
      "if (Test-Path \"$appPath\\WeekBox-win_x64.exe\") { Copy-Item \"$appPath\\WeekBox-win_x64.exe\" \"$staging\\WeekBox-win_x64.exe.bak\" -Force }",
      "if (Test-Path \"$appPath\\resources.neu\") { Copy-Item \"$appPath\\resources.neu\" \"$staging\\resources.neu.bak\" -Force }",
      "try {",
      "  Copy-Item \"$staging\\WeekBox-win_x64.exe\" \"$appPath\\WeekBox-win_x64.exe\" -Force",
      "  Copy-Item \"$staging\\resources.neu\" \"$appPath\\resources.neu\" -Force",
      "} catch {",
      "  if (Test-Path \"$staging\\WeekBox-win_x64.exe.bak\") { Copy-Item \"$staging\\WeekBox-win_x64.exe.bak\" \"$appPath\\WeekBox-win_x64.exe\" -Force }",
      "  if (Test-Path \"$staging\\resources.neu.bak\") { Copy-Item \"$staging\\resources.neu.bak\" \"$appPath\\resources.neu\" -Force }",
      "  throw",
      "}",
      "Remove-Item $zip -Force -ErrorAction SilentlyContinue",
      "Remove-Item $staging -Recurse -Force -ErrorAction SilentlyContinue",
      "Start-Process \"$appPath\\WeekBox-win_x64.exe\"",
    ].join("\r\n");

    await Neutralino.filesystem.writeFile(scriptPath, script);

    onProgress("Restarting WeekBox to apply update…");
    await Neutralino.os.execCommand(
      `powershell -ExecutionPolicy Bypass -File "${scriptPath}"`,
      { background: true },
    );
    onHandoff();
    await Neutralino.app.exit();
  },
};
