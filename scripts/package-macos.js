const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const config = JSON.parse(
  fs.readFileSync(path.join(root, "neutralino.config.json"), "utf8"),
);
const sourceRoot = path.join(root, "dist", "WeekBox");
const appRoot = path.join(root, "dist", "packages", "WeekBox.app");
const contentsRoot = path.join(appRoot, "Contents");
const macosRoot = path.join(contentsRoot, "MacOS");

const sourceBinary = path.join(sourceRoot, "WeekBox-mac_universal");
const sourceResources = path.join(sourceRoot, "resources.neu");
const sourceExtensions = path.join(sourceRoot, "extensions");

for (const file of [sourceBinary, sourceResources]) {
  if (!fs.existsSync(file)) throw new Error(`Missing build output: ${file}`);
}

fs.rmSync(appRoot, { recursive: true, force: true });
fs.mkdirSync(macosRoot, { recursive: true });
fs.copyFileSync(sourceBinary, path.join(macosRoot, "WeekBox"));
fs.copyFileSync(sourceResources, path.join(macosRoot, "resources.neu"));
if (fs.existsSync(sourceExtensions)) {
  fs.cpSync(sourceExtensions, path.join(macosRoot, "extensions"), {
    recursive: true,
  });
}

const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDisplayName</key>
  <string>WeekBox</string>
  <key>CFBundleExecutable</key>
  <string>WeekBox</string>
  <key>CFBundleIdentifier</key>
  <string>com.weekbox.app</string>
  <key>CFBundleInfoDictionaryVersion</key>
  <string>6.0</string>
  <key>CFBundleName</key>
  <string>WeekBox</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>CFBundleShortVersionString</key>
  <string>${config.version}</string>
  <key>CFBundleVersion</key>
  <string>${config.version}</string>
  <key>CFBundleURLTypes</key>
  <array>
    <dict>
      <key>CFBundleTypeRole</key>
      <string>Viewer</string>
      <key>CFBundleURLName</key>
      <string>com.weekbox.app.url</string>
      <key>CFBundleURLSchemes</key>
      <array>
        <string>weekbox</string>
      </array>
    </dict>
  </array>
</dict>
</plist>
`;

fs.writeFileSync(path.join(contentsRoot, "Info.plist"), plist);
fs.chmodSync(path.join(macosRoot, "WeekBox"), 0o755);
console.log(`Created ${appRoot}`);
