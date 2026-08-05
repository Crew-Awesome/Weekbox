const fs = require("fs");
const path = require("path");

const localeDir = path.join(__dirname, "..", "app", "src", "ui", "locales");
const english = JSON.parse(
  fs.readFileSync(path.join(localeDir, "en.json"), "utf8"),
);
const files = fs
  .readdirSync(localeDir)
  .filter(
    (file) =>
      file.endsWith(".json") && file !== "en.json" && file !== "shared.json",
  )
  .sort();

for (const file of files) {
  const filePath = path.join(localeDir, file);
  const current = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const synced = {};
  for (const [key, value] of Object.entries(english)) {
    synced[key] = Object.prototype.hasOwnProperty.call(current, key)
      ? current[key]
      : value;
  }
  for (const [key, value] of Object.entries(current)) {
    if (!Object.prototype.hasOwnProperty.call(synced, key)) synced[key] = value;
  }
  if (JSON.stringify(current) === JSON.stringify(synced)) {
    console.log(`${file}: already synchronized`);
    continue;
  }
  fs.writeFileSync(filePath, `${JSON.stringify(synced, null, 2)}\n`);
  console.log(`${file}: synchronized with en.json`);
}
