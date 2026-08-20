const fs = require("node:fs");
const path = require("node:path");

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

const sourceBinary = path.join(sourceRoot, "WeekBox-linux_x64");
const sourceResources = path.join(sourceRoot, "resources.neu");
const sourceExtensions = path.join(sourceRoot, "extensions");

for (const file of [sourceBinary, sourceResources, iconSource]) {
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
exec "$HERE/usr/bin/WeekBox" "$@"
`,
);
fs.chmodSync(path.join(appDir, "AppRun"), 0o755);

const desktopEntry = `[Desktop Entry]
Type=Application
Name=WeekBox
Comment=Browse and manage Friday Night Funkin' mods
Exec=WeekBox %u
Icon=weekbox
Terminal=false
Categories=Game;Utility;
MimeType=x-scheme-handler/weekbox;
`;
fs.writeFileSync(path.join(appDir, "WeekBox.desktop"), desktopEntry);

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
fs.writeFileSync(
  path.join(debRoot, "usr", "share", "applications", "weekbox.desktop"),
  desktopEntry.replace("Exec=WeekBox %u", "Exec=/usr/lib/weekbox/WeekBox %u"),
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

console.log(`Created ${appDir}`);
console.log(`Created ${debRoot}`);
