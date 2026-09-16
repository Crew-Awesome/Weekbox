import type { ITaskMonitor } from "@contracts";

/**
 * Decoupled task monitor registry (DIP).
 * Allows UI and domain stores to register task liveness checkers without monkey-patching window.
 */
export class TaskMonitor implements ITaskMonitor {
  private checkers: Set<() => boolean> = new Set();

  registerActiveTaskChecker(checker: () => boolean): () => void {
    this.checkers.add(checker);
    return () => {
      this.checkers.delete(checker);
    };
  }

  hasActiveTasks(): boolean {
    for (const checker of this.checkers) {
      try {
        if (checker()) return true;
      } catch {}
    }
    return false;
  }
}

export const taskMonitor = new TaskMonitor();
