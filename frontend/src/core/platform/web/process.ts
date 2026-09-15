import type {
  IProcessLauncher,
  LaunchExecutableOptions,
  ProcessLaunchResult,
} from "@contracts";

/**
 * Process launcher safe fallbacks for Web environment (LSP).
 */
export class WebProcess implements IProcessLauncher {
  async launchExecutable(
    _folderPath: string,
    _options?: LaunchExecutableOptions
  ): Promise<ProcessLaunchResult> {
    return { ok: false, error: "Game launching is not supported in the web environment." };
  }

  async killProcess(_instanceId: string): Promise<{ ok: boolean; error?: string }> {
    return { ok: true };
  }

  async isAnyProcessRunning(): Promise<boolean> {
    return false;
  }

  async isInstanceRunning(_instanceId: string): Promise<boolean> {
    return false;
  }
}
