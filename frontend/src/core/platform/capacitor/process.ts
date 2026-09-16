import type {
  IProcessLauncher,
  LaunchExecutableOptions,
  ProcessLaunchResult,
} from "@contracts";
import { CapacitorAppLauncher, FNF_MOBILE_PACKAGE } from "./app-launcher";

/**
 * Mobile / Capacitor process launcher driver.
 * Blocks .exe launching (not supported on mobile) and integrates with native mobile app intents.
 */
export class CapacitorProcess implements IProcessLauncher {
  async launchExecutable(
    folderPath: string,
    options?: LaunchExecutableOptions
  ): Promise<ProcessLaunchResult> {
    const isBaseGame =
      folderPath.includes("vslice") ||
      (options?.args && options.args.some((a) => a.includes("vslice") || a.includes("base")));

    if (isBaseGame) {
      const launched = await CapacitorAppLauncher.launchBaseGame();
      if (launched) {
        return { ok: true, pid: 1001 };
      }
      return {
        ok: false,
        error: "Base Game is not installed or could not be launched.",
      };
    }

    if (folderPath.includes(".exe") || !folderPath.startsWith("package:")) {
      return {
        ok: false,
        error:
          "Direct .exe executables are not supported in the mobile/Capacitor environment. Custom engine APKs or mobile ports are required.",
      };
    }

    const packageName = folderPath.replace(/^package:/, "").trim();
    const launched = await CapacitorAppLauncher.launchApp(packageName || FNF_MOBILE_PACKAGE);
    return launched
      ? { ok: true, pid: 1002 }
      : { ok: false, error: `Could not launch package ${packageName} in mobile/Capacitor environment.` };
  }

  async killProcess(
    _instanceId: string
  ): Promise<{ ok: boolean; error?: string }> {
    return {
      ok: false,
      error: "Process termination is not supported in the mobile/Capacitor environment.",
    };
  }

  async isAnyProcessRunning(): Promise<boolean> {
    return false;
  }

  async isInstanceRunning(_instanceId: string): Promise<boolean> {
    return false;
  }

  async getRunningList(): Promise<string[]> {
    return [];
  }
}
