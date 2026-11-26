const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.join(__dirname, "..");
const runtimeManifest = require("./neutralino-runtime.json");
const runtimeStatePath = path.join(projectRoot, "bin", ".weekbox-runtime.json");

function getRuntimeFile() {
  if (process.platform === "win32") return "bin/neutralino-win_x64.exe";
  if (process.platform === "darwin")
    return `bin/neutralino-mac_${process.arch === "arm64" ? "arm64" : "x64"}`;
  if (process.platform === "linux")
    return `bin/neutralino-linux_${process.arch === "arm64" ? "arm64" : process.arch === "arm" ? "armhf" : "x64"}`;
  return null;
}

function getSha256(filePath) {
  return crypto
    .createHash("sha256")
    .update(fs.readFileSync(filePath))
    .digest("hex")
    .toUpperCase();
}

function verifyClientFiles() {
  for (const [relativePath, expectedSha256] of Object.entries(
    runtimeManifest.client || {},
  )) {
    const clientPath = path.join(projectRoot, relativePath);
    if (!fs.existsSync(clientPath)) {
      throw new Error(
        `Missing pinned Neutralino client file: ${relativePath}.`,
      );
    }
    if (getSha256(clientPath) !== expectedSha256) {
      throw new Error(
        `Unexpected Neutralino client hash for ${relativePath}. Run 'npm run runtime:setup'.`,
      );
    }
  }
}

function verifyNeutralinoRuntime() {
  const runtimeFile = getRuntimeFile();
  if (!runtimeFile) return;
  const expected = runtimeManifest.binaries.find(
    (binary) => binary.file === runtimeFile,
  );
  if (!expected)
    throw new Error(`No runtime hash is pinned for ${runtimeFile}.`);
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
  const actual = getSha256(runtimePath);

  if (
    state?.binaries?.[expected.file] &&
    state.binaries[expected.file] !== actual
  ) {
    throw new Error(
      `Neutralino runtime metadata does not match ${expected.file}. Run 'npm run runtime:setup'.`,
    );
  }
  if (actual !== expected.sha256) {
    throw new Error(
      `Unexpected Neutralino runtime hash for ${expected.file}. The patched WeekBox runtime was probably replaced; restore it from wb-nl-bin.`,
    );
  }
  verifyClientFiles();
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
