import { registerPlugin } from "@capacitor/core";
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
  private lastLaunchedPackage: string = FNF_MOBILE_PACKAGE;
  private runningPackages: Set<string> = new Set();

  async launchExecutable(
    folderPath: string,
    options?: LaunchExecutableOptions
  ): Promise<ProcessLaunchResult> {
    const isBaseGame =
      folderPath === "base_game" ||
      folderPath === "vslice" ||
      folderPath.includes("vslice") ||
      (options?.args && options.args.some((a) => a.includes("vslice") || a.includes("base")));

    if (isBaseGame) {
      this.lastLaunchedPackage = FNF_MOBILE_PACKAGE;
      const launched = await CapacitorAppLauncher.launchBaseGame();
      if (launched) {
        this.runningPackages.add(FNF_MOBILE_PACKAGE);
        return { ok: true, pid: 1001 };
      }
      this.runningPackages.delete(FNF_MOBILE_PACKAGE);
      return {
        ok: false,
        error: "Base Game is not installed or could not be launched.",
      };
    }

    let packageName = "";
    if (folderPath.startsWith("package:")) {
      packageName = folderPath.replace(/^package:/, "").trim();
    } else {
      const lower = folderPath.toLowerCase();
      if (lower.includes("psych")) {
        packageName = "com.shadowmario.psychengine";
      } else if (lower.includes("codename")) {
        packageName = "org.codenameengine.fnf";
      } else if (lower.includes("kade")) {
        packageName = "com.kade.kadeengine";
      } else {
        packageName = folderPath.replace(/\.exe$/i, "");
      }
    }

    this.lastLaunchedPackage = packageName;

    const isInstalled = await CapacitorAppLauncher.isAppInstalled(packageName);
    if (!isInstalled) {
      const baseInstalled = await CapacitorAppLauncher.isBaseGameInstalled();
      if (baseInstalled) {
        this.lastLaunchedPackage = FNF_MOBILE_PACKAGE;
        const launched = await CapacitorAppLauncher.launchBaseGame();
        if (launched) {
          this.runningPackages.add(FNF_MOBILE_PACKAGE);
          return { ok: true, pid: 1001 };
        }
      }
      return {
        ok: false,
        error: `Engine package "${packageName}" is not installed on this device.`,
      };
    }

    const launched = await CapacitorAppLauncher.launchApp(packageName);
    if (launched) {
      this.runningPackages.add(packageName);
      return { ok: true, pid: 1002 };
    }
    return { ok: false, error: `Could not launch package ${packageName} in mobile/Capacitor environment.` };
  }

  async killProcess(
    instanceId?: string
  ): Promise<{ ok: boolean; error?: string }> {
    const pkg = this.lastLaunchedPackage || FNF_MOBILE_PACKAGE;
    try {
      const AppManager = registerPlugin<any>("AppManager");
      await AppManager.killApp({ packageName: pkg });
      if (pkg !== FNF_MOBILE_PACKAGE) {
        await AppManager.killApp({ packageName: FNF_MOBILE_PACKAGE });
      }
      if (instanceId && instanceId.toLowerCase().includes("vslice")) {
        await AppManager.killApp({ packageName: FNF_MOBILE_PACKAGE });
      }
    } catch {}
    this.runningPackages.clear();
    return {
      ok: true,
    };
  }

  async isAnyProcessRunning(): Promise<boolean> {
    const isBaseRunning = await this.isInstanceRunning(FNF_MOBILE_PACKAGE);
    if (isBaseRunning) return true;
    if (this.lastLaunchedPackage && this.lastLaunchedPackage !== FNF_MOBILE_PACKAGE) {
      return await this.isInstanceRunning(this.lastLaunchedPackage);
    }
    return false;
  }

  async isInstanceRunning(instanceId?: string): Promise<boolean> {
    let pkg = this.lastLaunchedPackage || FNF_MOBILE_PACKAGE;
    if (instanceId) {
      const lower = instanceId.toLowerCase();
      if (lower.includes("vslice") || lower.includes("base") || lower.includes("funkin")) {
        pkg = FNF_MOBILE_PACKAGE;
      } else if (lower.includes("psych")) {
        pkg = "com.shadowmario.psychengine";
      } else if (lower.includes("codename")) {
        pkg = "org.codenameengine.fnf";
      } else if (lower.includes("kade")) {
        pkg = "com.kade.kadeengine";
      }
    }

    try {
      const AppManager = registerPlugin<any>("AppManager");
      const res = await AppManager.isAppRunning({ packageName: pkg });
      if (res && typeof res.running === "boolean") {
        if (!res.running) {
          this.runningPackages.delete(pkg);
        } else {
          this.runningPackages.add(pkg);
        }
        return res.running;
      }
    } catch {}
    return this.runningPackages.has(pkg);
  }

  async getRunningList(): Promise<string[]> {
    return Array.from(this.runningPackages);
  }
}
