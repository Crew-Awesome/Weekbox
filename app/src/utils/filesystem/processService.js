import { errorHandler } from "../../ui/errors/errorHandler.js";

export class ProcessService {
  constructor(executables) {
    this.executables = executables;
    this.activeProcesses = new Map();
    this.exitWaiters = new Map();
  }

  async launch(key, executablePath, onStateChange, args = []) {
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
      const handler = (event) => {
        if (event.detail.id !== process.id || event.detail.action !== "exit")
          return;
        Neutralino.events.off("spawnedProcess", handler);
        this.activeProcesses.delete(key);
        const waiters = this.exitWaiters.get(key) || [];
        this.exitWaiters.delete(key);
        waiters.forEach((resolve) => resolve());
        onStateChange?.("completed");
      };
      await Neutralino.events.on("spawnedProcess", handler);
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
