const path = require("path");
const fs = require("fs");
const rcedit = require("rcedit");

const version = require("../package.json").version;
const binaryName = "WeekBox";
const exeName =
  process.platform === "win32" ? `${binaryName}-win_x64.exe` : null;

if (!exeName) {
  console.log("rcedit step is only needed on Windows builds; skipping.");
  process.exit(0);
}

const exePath = path.join(__dirname, "..", "dist", binaryName, exeName);

if (!fs.existsSync(exePath)) {
  console.error(`Could not find built binary at ${exePath}. Run neu build first.`);
  process.exit(1);
}

rcedit(exePath, {
  "version-string": {
    ProductName: binaryName,
    FileDescription: binaryName,
    CompanyName: "Crew Awesome",
    LegalCopyright: `Copyright © Crew Awesome`,
  },
  "file-version": version,
  "product-version": version,
})
  .then(() => {
    console.log(`Patched version info on ${exePath}`);
  })
  .catch((error) => {
    console.error("Failed to patch binary version info:", error);
    process.exit(1);
  });
