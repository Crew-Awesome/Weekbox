const fs = require("node:fs");
const path = require("node:path");
const {
  SHIM_NAME,
  ensureLinuxAppIdShim,
  copyLinuxAppIdShim,
  linuxDesktopEntry,
  linuxPreloadSnippet,
} = require("./linux-window-icon.js");

const root = path.resolve(__dirname, "..");
const config = JSON.parse(
  fs.readFileSync(path.join(root, "neutralino.config.json"), "utf8"),
);
const sourceRoot = path.join(root, "dist", "WeekBox");
const packageRoot = path.join(root, "dist", "packages");
const appDir = path.join(packageRoot, "WeekBox.AppDir");
const debRoot = path.join(packageRoot, "WeekBox-deb");
const iconSource = path.join(
  root,
  "app",
  "assets",
  "icons",
  "launcher-icon.png",
);
const shimFile = ensureLinuxAppIdShim(
  path.join(root, ".tmp", "linux", SHIM_NAME),
);

const sourceBinary = path.join(sourceRoot, "WeekBox-linux_x64");
const sourceResources = path.join(sourceRoot, "resources.neu");
const sourceExtensions = path.join(sourceRoot, "extensions");

for (const file of [sourceBinary, sourceResources, iconSource, shimFile]) {
  if (!fs.existsSync(file)) throw new Error(`Missing build output: ${file}`);
}

fs.rmSync(appDir, { recursive: true, force: true });
fs.rmSync(debRoot, { recursive: true, force: true });

function copyBundle(targetDir) {
  fs.mkdirSync(targetDir, { recursive: true });
  fs.copyFileSync(sourceBinary, path.join(targetDir, "WeekBox"));
  fs.copyFileSync(sourceResources, path.join(targetDir, "resources.neu"));
  if (fs.existsSync(sourceExtensions)) {
    fs.cpSync(sourceExtensions, path.join(targetDir, "extensions"), {
      recursive: true,
    });
  }
  copyLinuxAppIdShim(targetDir, shimFile);
  fs.chmodSync(path.join(targetDir, "WeekBox"), 0o755);
}

const appBin = path.join(appDir, "usr", "bin");
copyBundle(appBin);
fs.mkdirSync(
  path.join(appDir, "usr", "share", "icons", "hicolor", "256x256", "apps"),
  { recursive: true },
);
fs.copyFileSync(iconSource, path.join(appDir, "weekbox.png"));
fs.copyFileSync(
  iconSource,
  path.join(
    appDir,
    "usr",
    "share",
    "icons",
    "hicolor",
    "256x256",
    "apps",
    "weekbox.png",
  ),
);

fs.writeFileSync(
  path.join(appDir, "AppRun"),
  `#!/bin/sh
set -eu
HERE=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
export WEBKIT_DISABLE_DMABUF_RENDERER="\${WEBKIT_DISABLE_DMABUF_RENDERER:-1}"
${linuxPreloadSnippet('"$HERE/usr/bin/' + SHIM_NAME + '"')}exec "$HERE/usr/bin/WeekBox" "$@"
`,
);
fs.chmodSync(path.join(appDir, "AppRun"), 0o755);

const desktopEntry = linuxDesktopEntry({ exec: "WeekBox %u" });
fs.writeFileSync(path.join(appDir, "WeekBox.desktop"), desktopEntry);
fs.mkdirSync(path.join(appDir, "usr", "share", "applications"), {
  recursive: true,
});
fs.writeFileSync(
  path.join(appDir, "usr", "share", "applications", "weekbox.desktop"),
  desktopEntry,
);

const debBin = path.join(debRoot, "usr", "lib", "weekbox");
copyBundle(debBin);
fs.mkdirSync(path.join(debRoot, "DEBIAN"), { recursive: true });
fs.mkdirSync(path.join(debRoot, "usr", "share", "applications"), {
  recursive: true,
});
fs.mkdirSync(
  path.join(debRoot, "usr", "share", "icons", "hicolor", "256x256", "apps"),
  { recursive: true },
);
fs.copyFileSync(
  iconSource,
  path.join(
    debRoot,
    "usr",
    "share",
    "icons",
    "hicolor",
    "256x256",
    "apps",
    "weekbox.png",
  ),
);
const debDesktop = linuxDesktopEntry({
  exec: "/usr/lib/weekbox/WeekBox %u",
});
fs.writeFileSync(
  path.join(debRoot, "usr", "share", "applications", "weekbox.desktop"),
  debDesktop,
);
fs.writeFileSync(
  path.join(debRoot, "usr", "share", "applications", "WeekBox.desktop"),
  linuxDesktopEntry({
    exec: "/usr/lib/weekbox/WeekBox %u",
    noDisplay: true,
  }),
);
fs.writeFileSync(
  path.join(debRoot, "DEBIAN", "control"),
  `Package: weekbox
Version: ${config.version}
Section: games
Priority: optional
Architecture: amd64
Maintainer: Crew Awesome
Description: WeekBox mod manager
 Browse and manage Friday Night Funkin' mods.
`,
);

const debWrapperDir = path.join(debRoot, "usr", "bin");
fs.mkdirSync(debWrapperDir, { recursive: true });
fs.writeFileSync(
  path.join(debWrapperDir, "weekbox"),
  `#!/bin/sh
export WEBKIT_DISABLE_DMABUF_RENDERER="\${WEBKIT_DISABLE_DMABUF_RENDERER:-1}"
${linuxPreloadSnippet('"/usr/lib/weekbox/' + SHIM_NAME + '"')}exec /usr/lib/weekbox/WeekBox "$@"
`,
);
fs.chmodSync(path.join(debWrapperDir, "weekbox"), 0o755);

console.log(`Created ${appDir}`);
console.log(`Created ${debRoot}`);

const { packageRpm } = require("./package-rpm.js");
packageRpm();
