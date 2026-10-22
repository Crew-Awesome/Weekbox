const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const https = require("node:https");

const projectRoot = path.join(__dirname, "..");
const manifest = require("./neutralino-runtime.json");
const statePath = path.join(projectRoot, "bin", ".weekbox-runtime.json");

function download(url, destination, redirects = 0) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (response) => {
        if ([301, 302, 303, 307, 308].includes(response.statusCode)) {
          if (redirects >= 5 || !response.headers.location) {
            reject(new Error("Too many download redirects."));
            return;
          }
          response.resume();
          download(response.headers.location, destination, redirects + 1)
            .then(resolve)
            .catch(reject);
          return;
        }

        if (response.statusCode !== 200) {
          response.resume();
          reject(
            new Error(
              `Runtime download failed with HTTP ${response.statusCode}.`,
            ),
          );
          return;
        }

        const file = fs.createWriteStream(destination);
        response.pipe(file);
        file.on("finish", () => file.close(resolve));
        file.on("error", reject);
      })
      .on("error", reject);
  });
}

function powershellQuote(value) {
  return `'${value.replaceAll("'", "''")}'`;
}

function findFile(directory, filename) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isFile() && entry.name === filename) return entryPath;
    if (entry.isDirectory()) {
      const result = findFile(entryPath, filename);
      if (result) return result;
    }
  }
  return null;
}

function extractZip(archive, destination) {
  if (process.platform === "win32") {
    execFileSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        `$ErrorActionPreference = 'Stop'; Expand-Archive -LiteralPath ${powershellQuote(archive)} -DestinationPath ${powershellQuote(destination)} -Force`,
      ],
      { stdio: "inherit" },
    );
    return;
  }

  execFileSync("unzip", ["-q", "-o", archive, "-d", destination], {
    stdio: "inherit",
  });
}

async function main() {
  fs.mkdirSync(path.join(projectRoot, "bin"), { recursive: true });
  const temporaryDirectory = fs.mkdtempSync(
    path.join(os.tmpdir(), "weekbox-runtime-"),
  );
  const archivePath = path.join(temporaryDirectory, "runtime.zip");
  const extractDirectory = path.join(temporaryDirectory, "extracted");

  try {
    console.log(
      `[weekbox] Downloading Neutralino runtime ${manifest.version}...`,
    );
    await download(manifest.releaseUrl, archivePath);
    fs.mkdirSync(extractDirectory);
    extractZip(archivePath, extractDirectory);

    const validatedRuntimes = manifest.binaries.map((binary) => {
      const downloadedRuntime = findFile(extractDirectory, binary.archiveFile);
      if (!downloadedRuntime) {
        throw new Error(
          `The runtime archive did not contain ${binary.archiveFile}.`,
        );
      }

      const sha256 = crypto
        .createHash("sha256")
        .update(fs.readFileSync(downloadedRuntime))
        .digest("hex")
        .toUpperCase();
      if (sha256 !== binary.sha256) {
        throw new Error(
          `Downloaded Neutralino runtime ${binary.archiveFile} hash ${sha256} does not match the pinned manifest.`,
        );
      }
      return { binary, downloadedRuntime, sha256 };
    });

    for (const { binary, downloadedRuntime } of validatedRuntimes) {
      const runtimePath = path.join(projectRoot, binary.file);
      fs.copyFileSync(downloadedRuntime, runtimePath);
      if (process.platform !== "win32") fs.chmodSync(runtimePath, 0o755);
    }

    const clientBaseUrl = `https://github.com/neutralinojs/neutralino.js/releases/download/v${manifest.clientVersion}`;
    await download(
      `${clientBaseUrl}/neutralino.js`,
      path.join(projectRoot, "app", "neutralino.js"),
    );
    await download(
      `${clientBaseUrl}/neutralino.d.ts`,
      path.join(projectRoot, "app", "neutralino.d.ts"),
    );
    fs.writeFileSync(
      statePath,
      `${JSON.stringify({ version: manifest.version, sha256: manifest.binaries.find((binary) => binary.file === "bin/neutralino-win_x64.exe").sha256 }, null, 2)}\n`,
    );
    console.log(
      `[weekbox] Installed and recorded Neutralino ${manifest.version}.`,
    );
  } finally {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(`[weekbox] ${error.message}`);
  process.exitCode = 1;
});
