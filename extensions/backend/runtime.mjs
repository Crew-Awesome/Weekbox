import { execFile, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, rename, rm, stat, writeFile, appendFile, cp, chmod } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const dataPath = process.env.WEEKBOX_DATA_PATH || path.join(
  process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local"),
  "WeekBox",
);
const storagePath = path.join(dataPath, ".neutralino-storage.json");
const eventListeners = new Map();
let processId = 0;

function emit(eventName, detail) {
  for (const listener of eventListeners.get(eventName) || []) {
    listener({ detail });
  }
}

async function ensureParent(filePath) {
  await mkdir(path.dirname(filePath), { recursive: true });
}

async function loadStorage() {
  try {
    return JSON.parse(await readFile(storagePath, "utf8"));
  } catch {
    return {};
  }
}

async function saveStorage(document) {
  await ensureParent(storagePath);
  await writeFile(storagePath, `${JSON.stringify(document, null, 2)}\n`);
}

async function execCommand(command, options = {}) {
  if (options.background) return spawnProcess(command, options);
  try {
    const result = await execFileAsync(
      process.platform === "win32" ? "cmd.exe" : "/bin/sh",
      process.platform === "win32" ? ["/d", "/s", "/c", command] : ["-c", command],
      { maxBuffer: 32 * 1024 * 1024, windowsHide: true },
    );
    return { exitCode: 0, stdOut: result.stdout, stdErr: result.stderr };
  } catch (error) {
    return {
      exitCode: Number.isInteger(error.code) ? error.code : 1,
      stdOut: error.stdout || "",
      stdErr: error.stderr || error.message || "",
    };
  }
}

function spawnProcess(command) {
  const id = ++processId;
  const child = spawn(command, { shell: true, windowsHide: true });
  child.stdout?.on("data", (data) => emit("spawnedProcess", {
    id,
    action: "stdOut",
    data: String(data),
  }));
  child.stderr?.on("data", (data) => emit("spawnedProcess", {
    id,
    action: "stdErr",
    data: String(data),
  }));
  child.on("close", (code) => emit("spawnedProcess", {
    id,
    action: "exit",
    data: code,
  }));
  return Promise.resolve({ id, pid: child.pid });
}

const filesystem = {
  async getStats(filePath) {
    const details = await stat(filePath);
    return {
      size: details.size,
      isDirectory: details.isDirectory(),
      type: details.isDirectory() ? "DIRECTORY" : "FILE",
    };
  },
  readFile: (filePath) => readFile(filePath, "utf8"),
  async readBinaryFile(filePath, options = {}) {
    const bytes = await readFile(filePath);
    const start = Math.max(0, Number(options.pos) || 0);
    const end = options.size === undefined
      ? bytes.length
      : Math.min(bytes.length, start + Math.max(0, Number(options.size) || 0));
    return new Uint8Array(bytes.subarray(start, end));
  },
  async writeFile(filePath, contents) {
    await ensureParent(filePath);
    return writeFile(filePath, contents);
  },
  async writeBinaryFile(filePath, contents) {
    await ensureParent(filePath);
    return writeFile(filePath, Buffer.isBuffer(contents) ? contents : Buffer.from(contents));
  },
  async appendFile(filePath, contents) {
    await ensureParent(filePath);
    return appendFile(filePath, contents);
  },
  async appendBinaryFile(filePath, contents) {
    await ensureParent(filePath);
    return appendFile(filePath, Buffer.isBuffer(contents) ? contents : Buffer.from(contents));
  },
  async createDirectory(filePath) {
    return mkdir(filePath, { recursive: true });
  },
  async readDirectory(filePath) {
    const entries = await readdir(filePath, { withFileTypes: true });
    return entries.map((entry) => ({
      entry: entry.name,
      type: entry.isDirectory() ? "DIRECTORY" : "FILE",
      isDirectory: entry.isDirectory(),
    }));
  },
  async remove(filePath) {
    return rm(filePath, { recursive: true, force: true });
  },
  async move(source, destination) {
    await ensureParent(destination);
    return rename(source, destination);
  },
  async copy(source, destination, options = {}) {
    await ensureParent(destination);
    return cp(source, destination, {
      recursive: Boolean(options.recursive),
      force: options.overwrite !== false,
    });
  },
  chmod,
};

const storage = {
  async getData(key) {
    return (await loadStorage())[key] ?? null;
  },
  async setData(key, value) {
    const document = await loadStorage();
    document[key] = value;
    await saveStorage(document);
  },
};

globalThis.window = globalThis.window || globalThis;
Object.assign(globalThis.window, {
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent() { return true; },
});
Object.assign(globalThis.window, {
  NL_OS: process.platform === "win32" ? "Windows" : process.platform === "darwin" ? "Darwin" : "Linux",
  NL_ARCH: process.arch === "arm64" ? "arm64" : process.arch === "arm" ? "arm" : "x64",
  NL_PATH: process.cwd(),
  NL_CWD: process.cwd(),
  NL_DATAPATH: dataPath,
  NL_ARGS: [],
});

globalThis.localStorage ||= {
  _data: new Map(),
  get length() { return this._data.size; },
  key(index) { return [...this._data.keys()][index] ?? null; },
  getItem(key) { return this._data.get(String(key)) ?? null; },
  setItem(key, value) { this._data.set(String(key), String(value)); },
  removeItem(key) { this._data.delete(String(key)); },
};

globalThis.document ||= {
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent() { return true; },
};
globalThis.CustomEvent ||= class CustomEvent {
  constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
};

globalThis.Neutralino = {
  filesystem,
  storage,
  os: {
    execCommand,
    spawnProcess,
    getSpawnedProcesses: async () => [],
    updateSpawnedProcess: async () => {},
    getEnv: async (name) => process.env[name] || "",
    getPath: async (name) => name === "data"
      ? dataPath
      : name === "documents"
        ? path.join(os.homedir(), "Documents")
        : process.cwd(),
  },
  events: {
    on(eventName, listener) {
      if (!eventListeners.has(eventName)) eventListeners.set(eventName, new Set());
      eventListeners.get(eventName).add(listener);
      return Promise.resolve();
    },
    off(eventName, listener) {
      eventListeners.get(eventName)?.delete(listener);
      return Promise.resolve();
    },
  },
  app: {
    getConfig: async () => ({ version: "2.2.0" }),
    exit: async () => emit("appExitRequested", true),
  },
  resources: { extractDirectory: async () => {} },
};

export { dataPath, existsSync };
