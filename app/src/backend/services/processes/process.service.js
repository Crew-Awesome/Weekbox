import { getOsProcessId, sameProcessId } from './spawned-process.util.js';
import { parseWindowsProcessTree, parsePosixProcessTree, findDescendantPids } from './process-tree.util.js';

var ACTIVE_PROCESSES_KEY = "weekbox_active_processes";
var _ProcessService = class _ProcessService {
  constructor(executables) {
    this.executables = executables;
    this.activeProcesses = /* @__PURE__ */ new Map();
    this.exitWaiters = /* @__PURE__ */ new Map();
    this.processMonitors = /* @__PURE__ */ new Map();
    this.processHandlers = /* @__PURE__ */ new Map();
    this.closingProcesses = /* @__PURE__ */ new Set();
  }
  readPersistedProcesses() {
    try {
      const records = JSON.parse(localStorage.getItem(ACTIVE_PROCESSES_KEY));
      return Array.isArray(records) ? records : [];
    } catch {
      return [];
    }
  }
  writePersistedProcesses(records) {
    try {
      localStorage.setItem(ACTIVE_PROCESSES_KEY, JSON.stringify(records));
    } catch {
    }
  }
  remember(key, process, metadata) {
    const records = this.readPersistedProcesses().filter(
      (record) => record.key !== key
    );
    records.push({ key, id: process.id, pid: process.pid, ...metadata });
    this.writePersistedProcesses(records);
  }
  forget(key) {
    this.writePersistedProcesses(
      this.readPersistedProcesses().filter((record) => record.key !== key)
    );
  }
  notifyStateChange(key, state) {
    document.dispatchEvent(
      new CustomEvent("weekbox-process-change", {
        detail: { key, state }
      })
    );
  }
  complete(key, onStateChange) {
    this.closingProcesses.delete(key);
    this.activeProcesses.delete(key);
    this.forget(key);
    const monitor = this.processMonitors.get(key);
    if (monitor) window.clearInterval(monitor);
    this.processMonitors.delete(key);
    const handler = this.processHandlers.get(key);
    if (handler) Neutralino.events.off("spawnedProcess", handler);
    this.processHandlers.delete(key);
    const waiters = this.exitWaiters.get(key) || [];
    this.exitWaiters.delete(key);
    waiters.forEach((resolve) => resolve());
    document.dispatchEvent(
      new CustomEvent("weekbox-process-exit", { detail: { key } })
    );
    this.notifyStateChange(key, "completed");
    onStateChange?.("completed");
  }
  async watch(key, process, onStateChange) {
    const handler = async (event) => {
      if (!sameProcessId(event.detail.id, process.id) || event.detail.action !== "exit")
        return;
      Neutralino.events.off("spawnedProcess", handler);
      this.processHandlers.delete(key);
      if (!this.closingProcesses.has(key)) {
        const descendantPid = await this.findRunningDescendant(process.pid);
        if (descendantPid && this.activeProcesses.get(key) === process && !this.closingProcesses.has(key)) {
          const recovered = { ...process, pid: descendantPid, recovered: true };
          this.activeProcesses.set(key, recovered);
          this.remember(key, recovered, process.metadata || {});
          this.monitor(key, descendantPid);
          return;
        }
      }
      if (this.activeProcesses.get(key) !== process) return;
      this.complete(key, onStateChange);
    };
    this.processHandlers.set(key, handler);
    try {
      return await Neutralino.events.on("spawnedProcess", handler);
    } catch (error) {
      this.processHandlers.delete(key);
      throw error;
    }
  }
  async watchOrMonitor(key, process, onStateChange) {
    try {
      await this.watch(key, process, onStateChange);
    } catch {
      process.recovered = true;
      this.remember(key, process, process.metadata || {});
      this.monitor(key, process.pid);
    }
  }
  async restore() {
    const records = this.readPersistedProcesses();
    if (records.length === 0) return [];
    const spawned = await Neutralino.os.getSpawnedProcesses().catch(() => []);
    const restored = [];
    for (const record of records) {
      const process = spawned.find(
        (item) => String(item.pid) === String(record.pid)
      );
      if (process) {
        const tracked = { ...process, metadata: { ...record } };
        this.activeProcesses.set(record.key, tracked);
        await this.watchOrMonitor(record.key, tracked);
        restored.push(record);
        continue;
      }
      if (!await this.isPidRunning(record.pid)) continue;
      this.activeProcesses.set(record.key, { ...record, recovered: true });
      this.monitor(record.key, record.pid);
      restored.push(record);
    }
    this.writePersistedProcesses(restored);
    return restored;
  }
  async isPidRunning(pid) {
    const safePid = Number.parseInt(pid, 10);
    if (!Number.isSafeInteger(safePid) || safePid <= 0) return false;
    try {
      if (window.NL_OS === "Windows") {
        const result = await Neutralino.os.execCommand(
          `tasklist /FI "PID eq ${safePid}" /NH`
        );
        return new RegExp(`\\b${safePid}\\b`).test(result.stdOut || "");
      }
      const result = await Neutralino.os.execCommand(`kill -0 ${safePid}`);
      return result.exitCode === 0;
    } catch {
      return false;
    }
  }
  async findRunningDescendant(pid) {
    const safePid = Number.parseInt(pid, 10);
    if (!Number.isSafeInteger(safePid) || safePid <= 0) return null;
    try {
      const windows = window.NL_OS === "Windows";
      const command = windows ? 'powershell -NoProfile -NonInteractive -Command "Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId | ConvertTo-Json -Compress"' : "ps -eo pid=,ppid=";
      const result = await Neutralino.os.execCommand(command);
      if (result.exitCode !== 0) return null;
      const processes = windows ? parseWindowsProcessTree(result.stdOut) : parsePosixProcessTree(result.stdOut);
      const descendants = findDescendantPids(processes, safePid);
      for (const descendantPid of descendants.reverse()) {
        if (await this.isPidRunning(descendantPid)) return descendantPid;
      }
      return null;
    } catch {
      return null;
    }
  }
  monitor(key, pid) {
    const trackedProcess = this.activeProcesses.get(key);
    let checking = false;
    const monitor = window.setInterval(async () => {
      if (checking || this.activeProcesses.get(key) !== trackedProcess) return;
      checking = true;
      try {
        if (await this.isPidRunning(pid)) return;
        if (this.activeProcesses.get(key) === trackedProcess)
          this.complete(key);
      } finally {
        checking = false;
      }
    }, 2e3);
    this.processMonitors.set(key, monitor);
  }
  async terminatePid(pid) {
    const safePid = Number.parseInt(pid, 10);
    if (!Number.isSafeInteger(safePid) || safePid <= 0) return false;
    try {
      const command = window.NL_OS === "Windows" ? `taskkill /PID ${safePid} /T /F` : `kill -TERM ${safePid}`;
      const result = await Neutralino.os.execCommand(command);
      return result.exitCode === 0;
    } catch {
      return false;
    }
  }
  async launch(key, executablePath, onStateChange, args = [], metadata = {}) {
    if (this.activeProcesses.has(key)) {
      onStateChange?.("already_running");
      return false;
    }
    let command = "";
    try {
      onStateChange?.("running");
      const isExe = String(executablePath).toLowerCase().endsWith(".exe");
      if (window.NL_OS === "Linux" && isExe) {
        const wineCheck = await Neutralino.os.execCommand("which wine");
        if (wineCheck.exitCode !== 0) {
          window.dispatchEvent(new CustomEvent("wine-missing"));
          onStateChange?.("error");
          return false;
        }
        command = [
          `wine "${executablePath}"`,
          ...args.map((arg) => `"${String(arg).replaceAll('"', '\\"')}"`)
        ].join(" ");
      } else {
        command = [
          `"${executablePath}"`,
          ...args.map((arg) => `"${String(arg).replaceAll('"', '\\"')}"`)
        ].join(" ");
      }
      const process = await Neutralino.os.spawnProcess(command, {
        cwd: this.executables.getDirectory(executablePath)
      });
      process.metadata = { ...metadata, executablePath };
      this.activeProcesses.set(key, process);
      this.remember(key, process, process.metadata);
      this.notifyStateChange(key, "launched");
      await this.watchOrMonitor(key, process, onStateChange);
      onStateChange?.("launched");
      return true;
    } catch (error) {
      console.error("Could not launch engine", {
        executablePath,
        command,
        error
      });
      errorHandler.show({
        error,
        action: "Launch engine",
        item: executablePath
      });
      onStateChange?.("error");
      return false;
    }
  }
  async close(key, onStateChange) {
    const process = this.activeProcesses.get(key);
    if (!process) return false;
    onStateChange?.("closing");
    this.closingProcesses.add(key);
    try {
      if (process.recovered) {
        if (!await this.terminatePid(process.pid)) throw new Error();
        this.complete(key, onStateChange);
        return true;
      }
      if (window.NL_OS === "Windows") {
        if (!await this.terminatePid(process.pid)) throw new Error();
        this.complete(key, onStateChange);
      } else {
        await Neutralino.os.updateSpawnedProcess(process.id, "exit");
      }
      return true;
    } catch (error) {
      this.closingProcesses.delete(key);
      onStateChange?.("error");
      return false;
    }
  }
  async closeAndWait(key, onStateChange) {
    const process = this.activeProcesses.get(key);
    if (!process) return false;
    let resolveExit;
    const exited = new Promise((resolve) => {
      resolveExit = resolve;
      const waiters = this.exitWaiters.get(key) || [];
      waiters.push(resolve);
      this.exitWaiters.set(key, waiters);
    });
    try {
      if (!await this.close(key, onStateChange)) throw new Error();
      let timeout;
      const completed = await Promise.race([
        exited.then(() => true),
        new Promise((resolve) => {
          timeout = window.setTimeout(() => resolve(false), 1e4);
        })
      ]);
      window.clearTimeout(timeout);
      if (!completed) {
        if (await this.isPidRunning(process.pid)) throw new Error();
        this.complete(key, onStateChange);
      }
      return true;
    } catch (error) {
      this.closingProcesses.delete(key);
      const waiters = this.exitWaiters.get(key) || [];
      this.exitWaiters.set(
        key,
        waiters.filter((resolve) => resolve !== resolveExit)
      );
      onStateChange?.("error");
      return false;
    }
  }
  isRunning(key) {
    return this.activeProcesses.has(key);
  }
};

var ProcessService = _ProcessService;

export { ProcessService };
