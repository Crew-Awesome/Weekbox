const { spawn } = require("node:child_process");
const path = require("node:path");
const {
  SHIM_NAME,
  LINUX_EXIT_ON_CLOSE,
  ensureLinuxAppIdShim,
} = require("./linux-window-icon.js");

const env = { ...process.env };
if (process.platform === "linux") {
  env.WEBKIT_DISABLE_DMABUF_RENDERER = env.WEBKIT_DISABLE_DMABUF_RENDERER || "1";
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

const neuArgs = [...process.argv.slice(2)];
if (process.platform === "linux" && !neuArgs.includes(LINUX_EXIT_ON_CLOSE)) {
  neuArgs.push("--", LINUX_EXIT_ON_CLOSE);
}

const child = spawn("npx", ["@neutralinojs/neu", "run", ...neuArgs], {
  stdio: "inherit",
  env,
  shell: true,
});

child.on("exit", (code) => process.exit(code ?? 0));
