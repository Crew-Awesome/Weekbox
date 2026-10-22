const { spawn } = require("node:child_process");
const path = require("node:path");
const { SHIM_NAME, ensureLinuxAppIdShim } = require("./linux-window-icon.js");
const { verifyNeutralinoRuntime } = require("./verify-neutralino-runtime.js");

const cliArgs = process.argv.slice(2);
if (cliArgs.some((arg) => arg.toLowerCase() === "update")) {
  console.error(
    "[weekbox] Refusing 'neu update': it would replace the patched WeekBox runtime.",
  );
  process.exit(1);
}

verifyNeutralinoRuntime();

const env = { ...process.env };
if (process.platform === "linux") {
  env.WEBKIT_DISABLE_DMABUF_RENDERER =
    env.WEBKIT_DISABLE_DMABUF_RENDERER || "1";
  try {
    const shimFile = ensureLinuxAppIdShim(
      path.join(__dirname, "..", ".tmp", "linux", SHIM_NAME),
    );
    env.LD_PRELOAD = env.LD_PRELOAD
      ? `${shimFile}:${env.LD_PRELOAD}`
      : shimFile;
  } catch (error) {
    console.warn(
      "[weekbox] Could not build the Linux window-icon helper; the Wayland window icon may stay generic.",
      error.message || error,
    );
  }
}

const child = spawn("npx", ["@neutralinojs/neu", "run", ...cliArgs], {
  stdio: "inherit",
  env,
  shell: true,
});

child.on("exit", (code) => process.exit(code ?? 0));
