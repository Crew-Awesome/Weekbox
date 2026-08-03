const fs = require("fs");
const path = require("path");

const localeDir = path.join(__dirname, "..", "app", "src", "ui", "locales");
const strict = process.argv.includes("--strict");

function load(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    throw new Error(`${path.basename(file)}: ${error.message}`);
  }
}

function placeholders(value) {
  return [...String(value).matchAll(/\{\{\s*([\w.-]+)\s*\}\}/g)]
    .map((match) => match[1])
    .sort()
    .join(",");
}

const english = load(path.join(localeDir, "en.json"));
const invalidEnglish = Object.keys(english).filter(
  (key) => typeof english[key] !== "string",
);
if (invalidEnglish.length) {
  console.error(`en.json: non-string values: ${invalidEnglish.join(", ")}`);
  process.exit(1);
}
const files = fs
  .readdirSync(localeDir)
  .filter((file) => file.endsWith(".json") && file !== "en.json")
  .sort();
let failed = false;

for (const file of files) {
  const locale = load(path.join(localeDir, file));
  const invalid = Object.keys(locale).filter(
    (key) => typeof locale[key] !== "string",
  );
  const missing = Object.keys(english).filter((key) => !(key in locale));
  const extra = Object.keys(locale).filter((key) => !(key in english));
  const mismatched = Object.keys(locale).filter(
    (key) =>
      key in english &&
      placeholders(locale[key]) !== placeholders(english[key]),
  );
  if (extra.length) {
    failed = true;
    console.error(`${file}: unknown keys: ${extra.join(", ")}`);
  }
  if (invalid.length) {
    failed = true;
    console.error(`${file}: non-string values: ${invalid.join(", ")}`);
  }
  if (mismatched.length) {
    failed = true;
    console.error(`${file}: placeholder mismatch: ${mismatched.join(", ")}`);
  }
  if (missing.length) {
    const message = `${file}: ${missing.length} missing English keys`;
    if (strict) {
      failed = true;
      console.error(message);
    } else {
      console.warn(message);
    }
  }
  if (!extra.length && !mismatched.length && !missing.length)
    console.log(`${file}: complete`);
}

if (!files.length) console.log("No additional locale files found.");
if (failed) process.exit(1);
