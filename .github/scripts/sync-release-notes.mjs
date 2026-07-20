import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { tmpdir } from "node:os";

const tag = process.argv[2];
if (!tag) {
  console.error("Usage: node sync-release-notes.mjs <tag>");
  process.exit(1);
}

const version = tag.replace(/^v/i, "").split("-")[0];

const changelog = readFileSync("CHANGELOG.md", "utf8").replace(/\r\n/g, "\n");
const parts = changelog.split(/(?=^##\s)/m);

let notes = null;
for (const part of parts) {
  const heading = part
    .split("\n")[0]
    .replace(/^##\s*/, "")
    .replace(/^\[/, "")
    .replace(/\].*$/, "")
    .trim();
  if (heading === version) {
    notes = part.replace(/\s+$/, "");
    break;
  }
}

if (!notes) {
  console.error(`No CHANGELOG.md entry found for version ${version}`);
  process.exit(1);
}

const title = `WeekBox v${version}`;
const notesPath = `${process.env.RUNNER_TEMP || tmpdir()}/release-notes.md`;
writeFileSync(notesPath, notes, "utf8");

const repo = process.env.GITHUB_REPOSITORY || "Crew-Awesome/Weekbox";
execSync(
  `gh release edit "${tag}" --title "${title}" --notes-file "${notesPath}" --repo "${repo}"`,
  { stdio: "inherit" },
);

console.log(
  `Synced ${tag}: title="${title}", notes pulled from CHANGELOG.md [${version}].`,
);
