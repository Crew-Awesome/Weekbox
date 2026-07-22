import { errorHandler } from "../../ui/errors/errorHandler.js";

const ACTIVE_PROCESSES_KEY = "weekbox_active_processes";

export class ProcessService {
  constructor(executables) {
    this.executables = executables;
    this.activeProcesses = new Map();
    this.exitWaiters = new Map();
    this.processMonitors = new Map();
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
    } catch {}
  }

  remember(key, process, metadata) {
    const records = this.readPersistedProcesses().filter(
      (record) => record.key !== key,
    );
    records.push({ key, id: process.id, pid: process.pid, ...metadata });
    this.writePersistedProcesses(records);
  }

  forget(key) {
    this.writePersistedProcesses(
      this.readPersistedProcesses().filter((record) => record.key !== key),
    );
  }

  complete(key, onStateChange) {
    this.activeProcesses.delete(key);
    this.forget(key);
    const monitor = this.processMonitors.get(key);
    if (monitor) window.clearInterval(monitor);
    this.processMonitors.delete(key);
    const waiters = this.exitWaiters.get(key) || [];
    this.exitWaiters.delete(key);
    waiters.forEach((resolve) => resolve());
    document.dispatchEvent(
      new CustomEvent("weekbox-process-exit", { detail: { key } }),
    );
    onStateChange?.("completed");
  }

  watch(key, process, onStateChange) {
    const handler = (event) => {
      if (event.detail.id !== process.id || event.detail.action !== "exit")
        return;
      Neutralino.events.off("spawnedProcess", handler);
      this.complete(key, onStateChange);
    };
    return Neutralino.events.on("spawnedProcess", handler);
  }

  async restore() {
    const records = this.readPersistedProcesses();
    if (records.length === 0) return [];
    const spawned = await Neutralino.os.getSpawnedProcesses().catch(() => []);
    const restored = [];
    for (const record of records) {
      const process = spawned.find(
        (item) => String(item.pid) === String(record.pid),
      );
      if (process) {
        this.activeProcesses.set(record.key, process);
        void this.watch(record.key, process);
        restored.push(record);
        continue;
      }
      if (!(await this.isPidRunning(record.pid))) continue;
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
          `tasklist /FI "PID eq ${safePid}" /NH`,
        );
        return new RegExp(`\\b${safePid}\\b`).test(result.stdOut || "");
      }
      const result = await Neutralino.os.execCommand(`kill -0 ${safePid}`);
      return result.exitCode === 0;
    } catch {
      return false;
    }
  }

  monitor(key, pid) {
    const monitor = window.setInterval(async () => {
      if (await this.isPidRunning(pid)) return;
      this.complete(key);
    }, 2000);
    this.processMonitors.set(key, monitor);
  }

  async terminatePid(pid) {
    const safePid = Number.parseInt(pid, 10);
    if (!Number.isSafeInteger(safePid) || safePid <= 0) return false;
    try {
      const command =
        window.NL_OS === "Windows"
          ? `taskkill /PID ${safePid} /T /F`
          : `kill -TERM ${safePid}`;
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
      command = [
        `"${executablePath}"`,
        ...args.map((arg) => `"${String(arg).replaceAll('"', '\\"')}"`),
      ].join(" ");
      const process = await Neutralino.os.spawnProcess(command, {
        cwd: this.executables.getDirectory(executablePath),
      });
      this.activeProcesses.set(key, process);
      this.remember(key, process, metadata);
      await this.watch(key, process, onStateChange);
      onStateChange?.("launched");
      return true;
    } catch (error) {
      console.error("Could not launch engine", {
        executablePath,
        command,
        error,
      });
      errorHandler.show({
        error,
        action: "Launch engine",
        item: executablePath,
      });
      onStateChange?.("error");
      return false;
    }
  }

  async close(key, onStateChange) {
    const process = this.activeProcesses.get(key);
    if (!process) return false;
    onStateChange?.("closing");
    try {
      if (process.recovered) {
        if (!(await this.terminatePid(process.pid))) throw new Error();
        this.complete(key, onStateChange);
        return true;
      }
      await Neutralino.os.updateSpawnedProcess(process.id, "exit");
      return true;
    } catch (error) {
      onStateChange?.("error");
      return false;
    }
  }

  async closeAndWait(key, onStateChange) {
    const process = this.activeProcesses.get(key);
    if (!process) return false;
    if (process.recovered) return this.close(key, onStateChange);
    onStateChange?.("closing");
    let resolveExit;
    const exited = new Promise((resolve) => {
      resolveExit = resolve;
      const waiters = this.exitWaiters.get(key) || [];
      waiters.push(resolve);
      this.exitWaiters.set(key, waiters);
    });
    try {
      await Neutralino.os.updateSpawnedProcess(process.id, "exit");
      await exited;
      return true;
    } catch (error) {
      const waiters = this.exitWaiters.get(key) || [];
      this.exitWaiters.set(
        key,
        waiters.filter((resolve) => resolve !== resolveExit),
      );
      onStateChange?.("error");
      return false;
    }
  }

  isRunning(key) {
    return this.activeProcesses.has(key);
  }
}
