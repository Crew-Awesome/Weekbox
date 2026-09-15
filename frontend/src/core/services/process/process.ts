import type {
  IProcessLauncher,
  LaunchExecutableOptions,
  ProcessLaunchResult,
} from "@contracts";
import { platform } from "@platform";

/**
 * Domain service managing process launching and termination (SRP / OCP).
 */
export class ProcessService implements IProcessLauncher {
  private readonly provider: IProcessLauncher;

  constructor(provider?: IProcessLauncher) {
    this.provider = provider || platform;
  }

  async launchExecutable(
    folderPath: string,
    options?: LaunchExecutableOptions
  ): Promise<ProcessLaunchResult> {
    return this.provider.launchExecutable(folderPath, options);
  }

  async killProcess(instanceId: string): Promise<{ ok: boolean; error?: string }> {
    return this.provider.killProcess(instanceId);
  }

  async isAnyProcessRunning(): Promise<boolean> {
    return this.provider.isAnyProcessRunning();
  }

  async isInstanceRunning(instanceId: string): Promise<boolean> {
    return this.provider.isInstanceRunning(instanceId);
  }
}

export const processService = new ProcessService();
