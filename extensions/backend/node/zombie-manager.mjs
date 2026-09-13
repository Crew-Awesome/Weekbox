/**
 * Zombie Manager
 * 
 * Handles keeping the Node process alive only while Neutralino/Frontend is active.
 * Includes intelligent sleep/suspension detection to prevent false-positive terminations
 * when the host machine enters sleep or low-power standby modes.
 */

export class ZombieManager {
  constructor(timeoutMs = 90000) {
    this.timeoutMs = timeoutMs;
    this.lastPingTime = Date.now();
    this.lastTickTime = Date.now();
    this.receivedFirstPing = false;
    this.interval = null;
  }

  /**
   * Verifies whether the parent Neutralino process is still running.
   */
  isParentAlive() {
    try {
      if (!process.ppid) return true;
      process.kill(process.ppid, 0);
      return true;
    } catch (e) {
      return e.code === "EPERM";
    }
  }

  start() {
    this.lastTickTime = Date.now();
    this.interval = setInterval(() => {
      const now = Date.now();
      const elapsedSinceLastTick = now - this.lastTickTime;
      this.lastTickTime = now;

      /**
       * Detect system sleep or suspension.
       * If the interval (expected ~5000ms) was delayed significantly (e.g. > 12000ms),
       * the operating system was suspended. We reset lastPingTime to grant the frontend
       * a complete grace period upon system wake.
       */
      if (elapsedSinceLastTick > 12000) {
        console.log(`[ZombieManager] System suspension/sleep detected (${elapsedSinceLastTick}ms elapsed). Resetting heartbeat.`);
        this.lastPingTime = now;
        return;
      }

      if (this.receivedFirstPing) {
        const timeSinceLastPing = now - this.lastPingTime;
        if (timeSinceLastPing > this.timeoutMs) {
          const parentAlive = this.isParentAlive();
          if (!parentAlive) {
            console.log("[ZombieManager] Parent process is dead. Committing suicide to avoid zombie process.");
            process.exit(0);
          } else if (timeSinceLastPing > this.timeoutMs * 2) {
            console.log("[ZombieManager] No heartbeat received from frontend in extended timeout. Committing suicide.");
            process.exit(0);
          }
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

export const zombieManager = new ZombieManager(90000);
