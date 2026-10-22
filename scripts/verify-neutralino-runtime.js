const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.join(__dirname, "..");
const runtimeManifest = require("./neutralino-runtime.json");
const runtimeStatePath = path.join(projectRoot, "bin", ".weekbox-runtime.json");

function verifyNeutralinoRuntime() {
  if (process.platform !== "win32") return;

  const expected = runtimeManifest.binaries.find(
    (binary) => binary.file === "bin/neutralino-win_x64.exe",
  );
  const runtimePath = path.join(projectRoot, expected.file);

  if (!fs.existsSync(runtimePath)) {
    throw new Error(
      `Missing patched Neutralino runtime: ${expected.file}. Build wb-nl-bin and copy it there; do not run 'neu update'.`,
    );
  }

  const state = fs.existsSync(runtimeStatePath)
    ? JSON.parse(fs.readFileSync(runtimeStatePath, "utf8"))
    : null;
  if (state && state.version !== runtimeManifest.version) {
    throw new Error(
      `Neutralino runtime ${state.version} is installed, but WeekBox requires ${runtimeManifest.version}. Run 'npm run runtime:setup'.`,
    );
  }
  const actual = crypto
    .createHash("sha256")
    .update(fs.readFileSync(runtimePath))
    .digest("hex")
    .toUpperCase();

  if (state?.sha256 && state.sha256 !== actual) {
    throw new Error(
      `Neutralino runtime metadata does not match ${expected.file}. Run 'npm run runtime:setup'.`,
    );
  }
  if (actual !== expected.sha256) {
    throw new Error(
      `Unexpected Neutralino runtime hash for ${expected.file}. The patched WeekBox runtime was probably replaced; restore it from wb-nl-bin.`,
    );
  }
}

if (require.main === module) {
  try {
    verifyNeutralinoRuntime();
    console.log("[weekbox] Patched Neutralino runtime verified.");
  } catch (error) {
    console.error(`[weekbox] ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { verifyNeutralinoRuntime };
