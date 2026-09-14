const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const APP_ID = "weekbox";
const SHIM_NAME = "libweekbox-appid.so";
const sourceFile = path.join(__dirname, "linux", "weekbox-appid.c");

function compileLinuxAppIdShim(outputFile) {
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  execFileSync(
    "gcc",
    ["-shared", "-fPIC", "-O2", "-o", outputFile, sourceFile, "-ldl"],
    { stdio: "inherit" },
  );
  return outputFile;
}

function ensureLinuxAppIdShim(outputFile) {
  const srcStat = fs.statSync(sourceFile);
  let needsBuild = true;
  try {
    const outStat = fs.statSync(outputFile);
    needsBuild = outStat.mtimeMs < srcStat.mtimeMs;
  } catch {
    needsBuild = true;
  }
  if (needsBuild) compileLinuxAppIdShim(outputFile);
  return outputFile;
}

function copyLinuxAppIdShim(targetDir, shimFile) {
  fs.mkdirSync(targetDir, { recursive: true });
  const dest = path.join(targetDir, SHIM_NAME);
  fs.copyFileSync(shimFile, dest);
  return dest;
}

function linuxDesktopEntry({ exec, icon = APP_ID, noDisplay = false }) {
  return `[Desktop Entry]
Type=Application
Name=WeekBox
Comment=Browse and manage Friday Night Funkin' mods
Exec=${exec}
Icon=${icon}
Terminal=false
Categories=Game;Utility;
MimeType=x-scheme-handler/weekbox;
StartupWMClass=${APP_ID}
${noDisplay ? "NoDisplay=true\n" : ""}`;
}

function linuxPreloadSnippet(soPathShell) {
  return `if [ -f ${soPathShell} ]; then
  if [ -n "\${LD_PRELOAD:-}" ]; then
    export LD_PRELOAD=${soPathShell}:\$LD_PRELOAD
  else
    export LD_PRELOAD=${soPathShell}
  fi
fi
`;
}

module.exports = {
  APP_ID,
  SHIM_NAME,
  sourceFile,
  compileLinuxAppIdShim,
  ensureLinuxAppIdShim,
  copyLinuxAppIdShim,
  linuxDesktopEntry,
  linuxPreloadSnippet,
};
