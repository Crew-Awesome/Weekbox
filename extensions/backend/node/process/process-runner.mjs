import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { modLinkManager } from "./mod-link-manager.mjs";

/**
 * Known game executable names in order of priority.
 */
const PRIORITY_EXECUTABLES = [
  "funkin.exe",
  "funkin",
  "psychengine.exe",
  "psychengine",
  "codenameengine.exe",
  "codenameengine",
  "kade engine.exe",
  "friday night funkin'.exe",
  "fnf.exe",
  "fnf",
];

/**
 * Known system/helper executables to ignore when scanning folders.
 */
const IGNORED_EXECUTABLES = new Set([
  "crashpad_handler.exe",
  "unins000.exe",
  "uninstall.exe",
  "updater.exe",
  "vc_redist.x64.exe",
  "vc_redist.x86.exe",
  "vcredist_x64.exe",
  "vcredist_x86.exe",
  "7za.exe",
  "7z.exe",
  "dxwebsetup.exe",
]);

/**
 * Recursively scans a directory (up to maxDepth) for candidates.
 * @param {string} dir - Directory to inspect.
 * @param {number} depth - Current recursion depth.
 * @param {number} maxDepth - Maximum recursion depth.
 * @returns {string[]} List of full file paths.
 */
function scanFiles(dir, depth = 0, maxDepth = 2) {
  if (depth > maxDepth || !fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const results = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...scanFiles(fullPath, depth + 1, maxDepth));
    } else if (entry.isFile()) {
      results.push(fullPath);
    }
  }

  return results;
}

/**
 * Finds the game executable inside targetFolder for the current platform.
 * @param {string} folderPath - Path to the engine or mod directory.
 * @param {string} [preferredName] - Optional specific executable name to search for first.
 * @returns {string | null} Full path to executable or null.
 */
function resolveExecutable(folderPath, preferredName) {
  if (!fs.existsSync(folderPath)) return null;

  const platform = process.platform;
  const files = scanFiles(folderPath, 0, 2);

  /* 1. Explicit preferred name if provided */
  if (preferredName) {
    const cleanPref = preferredName.toLowerCase();
    const match = files.find((f) => path.basename(f).toLowerCase() === cleanPref);
    if (match) return match;
  }

  /* 2. Platform-specific resolution */
  if (platform === "win32") {
    const exeFiles = files.filter((f) => {
      const base = path.basename(f).toLowerCase();
      return base.endsWith(".exe") && !IGNORED_EXECUTABLES.has(base);
    });

    if (exeFiles.length === 0) return null;

    /* Check priority list */
    for (const prio of PRIORITY_EXECUTABLES) {
      const match = exeFiles.find((f) => path.basename(f).toLowerCase() === prio);
      if (match) return match;
    }

    /* Check if any exe matches folder name */
    const folderBase = path.basename(folderPath).toLowerCase();
    const folderMatch = exeFiles.find((f) => path.basename(f, ".exe").toLowerCase() === folderBase);
    if (folderMatch) return folderMatch;

    return exeFiles[0];
  }

  if (platform === "linux") {
    /* Check priority list */
    for (const prio of PRIORITY_EXECUTABLES) {
      const cleanPrio = prio.replace(/\.exe$/i, "");
      const match = files.find((f) => path.basename(f).toLowerCase() === cleanPrio);
      if (match) {
        try {
          fs.chmodSync(match, 0o755);
        } catch {}
        return match;
      }
    }

    /* Check for files with executable permissions or ELF signature */
    for (const file of files) {
      const base = path.basename(file).toLowerCase();
      if (base.includes(".") && !base.endsWith(".bin") && !base.endsWith(".x86_64")) continue;
      try {
        const fd = fs.openSync(file, "r");
        const buf = Buffer.alloc(4);
        fs.readSync(fd, buf, 0, 4, 0);
        fs.closeSync(fd);
        /* Check ELF magic bytes: 0x7f, 'E', 'L', 'F' */
        if (buf[0] === 0x7f && buf[1] === 0x45 && buf[2] === 0x4c && buf[3] === 0x46) {
          fs.chmodSync(file, 0o755);
          return file;
        }
      } catch {}
    }

    return null;
  }

  if (platform === "darwin") {
    /* Check for .app bundle in directory */
    const entries = fs.readdirSync(folderPath);
    const appDir = entries.find((e) => e.toLowerCase().endsWith(".app"));
    if (appDir) {
      const fullAppPath = path.join(folderPath, appDir);
      const macOsDir = path.join(fullAppPath, "Contents", "MacOS");
      if (fs.existsSync(macOsDir)) {
        const binFiles = fs.readdirSync(macOsDir);
        if (binFiles.length > 0) {
          const binPath = path.join(macOsDir, binFiles[0]);
          try {
            fs.chmodSync(binPath, 0o755);
          } catch {}
          return binPath;
        }
      }
    }

    /* Check priority list */
    for (const prio of PRIORITY_EXECUTABLES) {
      const cleanPrio = prio.replace(/\.exe$/i, "");
      const match = files.find((f) => path.basename(f).toLowerCase() === cleanPrio);
      if (match) {
        try {
          fs.chmodSync(match, 0o755);
        } catch {}
        return match;
      }
    }

    return null;
  }

  return null;
}

const activeProcesses = new Map();
let onProcessExitCallback = null;

/* Periodic health check for active process PIDs */
setInterval(() => {
  if (activeProcesses.size === 0) return;
  for (const [key, entry] of activeProcesses.entries()) {
    try {
      process.kill(entry.pid, 0);
    } catch {
      modLinkManager.cleanupModLinks(key);
      activeProcesses.delete(key);
      if (onProcessExitCallback) {
        onProcessExitCallback({
          instanceId: key,
          pid: entry.pid,
          folderPath: entry.folderPath,
        });
      }
    }
  }
}, 2500);

export const processApi = {
  /**
   * Sets callback invoked when a child process terminates.
   * @param {Function} cb - Exit callback receiving { instanceId, pid, folderPath }.
   */
  setExitCallback(cb) {
    onProcessExitCallback = cb;
  },

  /**
   * Checks if any game processes are currently running.
   * @returns {boolean} True if one or more processes are active.
   */
  isAnyRunning() {
    return activeProcesses.size > 0;
  },

  /**
   * Returns a list of currently active game instances.
   * @returns {Array<{ instanceId: string, pid: number, folderPath: string }>}
   */
  getRunningList() {
    const list = [];
    for (const [key, val] of activeProcesses.entries()) {
      list.push({ instanceId: key, pid: val.pid, folderPath: val.folderPath });
    }
    return list;
  },

  /**
   * Checks if a specific instance is currently active.
   * @param {string} instanceId - Unique identifier of the instance.
   * @returns {boolean}
   */
  isInstanceRunning(instanceId) {
    return activeProcesses.has(instanceId);
  },

  /**
   * Auto-detects and launches the game executable from target folder.
   * Runs detached via child_process.spawn, tracks PID, and reports exit.
   * @param {object} params - Launch parameters.
   * @param {string} params.folderPath - Target folder containing the game files.
   * @param {string} [params.executableName] - Optional preferred executable name.
   * @param {string} [params.instanceId] - Optional identifier for the instance.
   * @param {string[]} [params.args] - Optional launch CLI arguments.
   * @param {object} [params.env] - Optional additional environment variables.
   * @param {string} [params.modFolderPath] - Optional source folder of the mod to link into engine's mods/ folder.
   * @returns {Promise<{ ok: boolean, pid?: number, executablePath?: string, error?: string }>}
   */
  async launch({ folderPath, executableName, instanceId, args = [], env = {}, modFolderPath, modFolderPaths }) {
    if (!folderPath) {
      return { ok: false, error: "No folder path provided" };
    }

    const resolved = resolveExecutable(folderPath, executableName);
    if (!resolved) {
      return {
        ok: false,
        error: `No executable found in "${folderPath}" for platform "${process.platform}".`,
      };
    }

    const workingDir = path.dirname(resolved);
    const key = instanceId || folderPath;

    /* Link any specified mod folders into the engine's mods/ directory */
    const allModFolders = [];
    if (Array.isArray(modFolderPaths)) {
      for (const p of modFolderPaths) {
        if (p && !allModFolders.includes(p)) {
          allModFolders.push(p);
        }
      }
    }
    if (modFolderPath && !allModFolders.includes(modFolderPath)) {
      allModFolders.push(modFolderPath);
    }

    for (const mPath of allModFolders) {
      modLinkManager.createModLink({
        engineFolderPath: folderPath,
        modFolderPath: mPath,
        instanceId: key,
      });
    }

    try {
      const child = spawn(resolved, args || [], {
        cwd: workingDir,
        detached: true,
        stdio: "ignore",
        env: { ...process.env, ...env },
      });

      const pid = child.pid;
      activeProcesses.set(key, { pid, child, folderPath });

      child.on("exit", (code, signal) => {
        modLinkManager.cleanupModLinks(key);
        activeProcesses.delete(key);
        if (onProcessExitCallback) {
          onProcessExitCallback({
            instanceId: key,
            pid,
            folderPath,
            code,
            signal,
          });
        }
      });

      child.on("error", (err) => {
        modLinkManager.cleanupModLinks(key);
        activeProcesses.delete(key);
        if (onProcessExitCallback) {
          onProcessExitCallback({
            instanceId: key,
            pid,
            folderPath,
            error: err && err.message ? err.message : String(err),
          });
        }
      });

      child.unref();

      return {
        ok: true,
        pid,
        executablePath: resolved,
        instanceId: key,
      };
    } catch (err) {
      if (modFolderPath) {
        modLinkManager.cleanupModLinks(key);
      }
      return {
        ok: false,
        error: err && err.message ? err.message : String(err),
      };
    }
  },

  /**
   * Terminates a running game instance and cleans up its resources.
   * @param {string} instanceId
   * @returns {Promise<{ ok: boolean, error?: string }>}
   */
  async kill(instanceId) {
    if (!instanceId) return { ok: false, error: "No instanceId provided" };
    const entry = activeProcesses.get(instanceId);
    if (!entry) return { ok: false, error: "Process not found or already stopped" };

    try {
      /* Clean up mod links associated with this instance */
      modLinkManager.cleanupModLinks(instanceId);

      const pid = entry.pid;
      if (process.platform === "win32") {
        spawn("taskkill", ["/pid", String(pid), "/T", "/F"]);
      } else {
        try {
          process.kill(-pid, "SIGKILL");
        } catch {
          process.kill(pid, "SIGKILL");
        }
      }

      activeProcesses.delete(instanceId);
      if (onProcessExitCallback) {
        onProcessExitCallback({
          instanceId,
          pid,
          folderPath: entry.folderPath,
        });
      }

      return { ok: true };
    } catch (err) {
      return { ok: false, error: err?.message || String(err) };
    }
  },
};
