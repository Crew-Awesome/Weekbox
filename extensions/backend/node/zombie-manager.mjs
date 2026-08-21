/**
 * Zombie Manager
 * 
 * Handles keeping the Node process alive only when Neutralino/Frontend is active.
 * 
 * Logic:
 * - We start a timeout when the module is initialized.
 * - If we do not receive a ping (heartbeat) within X seconds, we assume the frontend is dead/closed abruptly and exit.
 * - However, when the frontend is reloading (F5), it might take a few seconds to reconnect. 
 * - If the frontend gracefully unloads, it can send a signal, but if we just rely on pings, we must give it a generous timeout (e.g. 15-30s) so it survives a page reload.
 */

export class ZombieManager {
  constructor(timeoutMs = 30000) {
    this.timeoutMs = timeoutMs;
    this.lastPingTime = Date.now();
    this.receivedFirstPing = false;
    this.interval = null;
  }

  start() {
    this.interval = setInterval(() => {
      if (this.receivedFirstPing) {
        if (Date.now() - this.lastPingTime > this.timeoutMs) {
          console.log("No heartbeat received from frontend in a while. Committing suicide to avoid zombie process.");
          process.exit(0);
        }
      }
    }, 5000);
  }

  ping() {
    this.receivedFirstPing = true;
    this.lastPingTime = Date.now();
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
}

export const zombieManager = new ZombieManager(30000);
