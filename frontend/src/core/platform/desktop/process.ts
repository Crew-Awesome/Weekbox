import type {
  IProcessLauncher,
  LaunchExecutableOptions,
  ProcessLaunchResult,
} from "@contracts";
import type { DesktopTransport } from "./transport";

/**
 * Native process execution and control for Desktop environment.
 */
export class DesktopProcess implements IProcessLauncher {
  private transport: DesktopTransport;

  constructor(transport: DesktopTransport) {
    this.transport = transport;
  }

  async launchExecutable(
    folderPath: string,
    options?: LaunchExecutableOptions
  ): Promise<ProcessLaunchResult> {
    return (await this.transport.call("process.launch" as any, {
      folderPath,
      executableName: options?.executableName,
      instanceId: options?.instanceId,
      args: options?.args,
      env: options?.env,
      modFolderPath: options?.modFolderPath,
      modFolderPaths: options?.modFolderPaths,
    })) as any;
  }

  async killProcess(instanceId: string): Promise<{ ok: boolean; error?: string }> {
    return (await this.transport.call("process.kill" as any, { instanceId })) as any;
  }

  async isAnyProcessRunning(): Promise<boolean> {
    try {
      const res = await this.transport.call("process.isAnyRunning" as any);
      return Boolean(res);
    } catch {
      return false;
    }
  }

  async isInstanceRunning(instanceId: string): Promise<boolean> {
    try {
      const res = await this.transport.call("process.isInstanceRunning" as any, { instanceId });
      return Boolean(res);
    } catch {
      return false;
    }
  }
}
