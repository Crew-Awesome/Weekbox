import { AppLauncher } from "@capacitor/app-launcher";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { CapacitorJsonStorage } from "./json-storage";

export const FNF_MOBILE_PACKAGE = "me.funkin.fnf";
export const FNF_PLAYSTORE_URL = "https://play.google.com/store/apps/details?id=me.funkin.fnf";
export const FNF_PLAYSTORE_MARKET = "market://details?id=me.funkin.fnf";
export const FNF_APPSTORE_URL = "https://apps.apple.com/app/friday-night-funkin/id6475704944";

/**
 * Mobile App Launcher utility for detecting installed games and launching them.
 */
export class CapacitorAppLauncher {
  private static readonly INSTALLED_CACHE_PATH = "data/mobile_installed_apps.json";

  /**
   * Checks if an app is installed on the mobile device.
   */
  static async isAppInstalled(packageOrScheme: string): Promise<boolean> {
    const isNative =
      (typeof Capacitor !== "undefined" &&
        typeof Capacitor.isNativePlatform === "function" &&
        Capacitor.isNativePlatform()) ||
      (typeof window !== "undefined" && Boolean((window as any).Capacitor?.isNativePlatform?.()));

    if (!isNative) {
      // In web/desktop simulator, check persistent cache
      const cache = await CapacitorJsonStorage.readJson<Record<string, boolean>>(
        this.INSTALLED_CACHE_PATH,
        {}
      );
      return Boolean(cache[packageOrScheme]);
    }

    try {
      const platform = typeof Capacitor?.getPlatform === "function" ? Capacitor.getPlatform() : "android";

      // 1. Try raw package name first (required by Capacitor Android AppLauncher for getPackageInfo)
      try {
        const { value } = await AppLauncher.canOpenUrl({ url: packageOrScheme });
        if (value) {
          await this.setAppInstalledCache(packageOrScheme, true);
          return true;
        }
      } catch {}

      // 2. Try URL scheme / package prefix
      const targetUrl = platform === "ios" ? `${packageOrScheme}://` : `package:${packageOrScheme}`;
      try {
        const { value } = await AppLauncher.canOpenUrl({ url: targetUrl });
        if (value) {
          await this.setAppInstalledCache(packageOrScheme, true);
          return true;
        }
      } catch {}
    } catch {}

    // Fallback: check stored cache in case queries permission prevents broad inspection
    const cache = await CapacitorJsonStorage.readJson<Record<string, boolean>>(
      this.INSTALLED_CACHE_PATH,
      {}
    );
    return Boolean(cache[packageOrScheme]);
  }

  /**
   * Manually records that an app is installed.
   */
  static async setAppInstalledCache(packageOrScheme: string, installed: boolean): Promise<void> {
    const cache = await CapacitorJsonStorage.readJson<Record<string, boolean>>(
      this.INSTALLED_CACHE_PATH,
      {}
    );
    cache[packageOrScheme] = installed;
    await CapacitorJsonStorage.writeJson(this.INSTALLED_CACHE_PATH, cache);
  }

  /**
   * Launches an installed application via custom URL or package intent.
   */
  static async launchApp(packageOrScheme: string): Promise<boolean> {
    const platform =
      typeof Capacitor?.getPlatform === "function" ? Capacitor.getPlatform() : "android";

    // 1. On Android, try launching package directly via AppLauncher (manager.getLaunchIntentForPackage)
    try {
      const res = await AppLauncher.openUrl({ url: packageOrScheme });
      if (res && res.completed) {
        await this.setAppInstalledCache(packageOrScheme, true);
        return true;
      }
    } catch {}

    // 2. Try URI scheme / package prefix
    const targetUrl = platform === "ios" ? `${packageOrScheme}://` : `package:${packageOrScheme}`;
    try {
      const res = await AppLauncher.openUrl({ url: targetUrl });
      if (res && res.completed) {
        await this.setAppInstalledCache(packageOrScheme, true);
        return true;
      }
    } catch {}

    return false;
  }

  /**
   * Opens the official store listing for the base game.
   * On Android: opens Google Play Store directly.
   * On iOS: opens Apple App Store.
   */
  static async openBaseGameStore(): Promise<void> {
    const isNative =
      (typeof Capacitor !== "undefined" &&
        typeof Capacitor.isNativePlatform === "function" &&
        Capacitor.isNativePlatform()) ||
      (typeof window !== "undefined" && Boolean((window as any).Capacitor?.isNativePlatform?.()));

    if (isNative) {
      const platform =
        typeof Capacitor?.getPlatform === "function" ? Capacitor.getPlatform() : "android";

      if (platform === "ios") {
        try {
          const res = await AppLauncher.openUrl({ url: FNF_APPSTORE_URL });
          if (res && res.completed) return;
        } catch {}
        if (typeof window !== "undefined") {
          window.open(FNF_APPSTORE_URL, "_blank");
        }
        return;
      }

      // Android native: attempt market:// intent, then fallback to direct package URL
      try {
        const res = await AppLauncher.openUrl({ url: FNF_PLAYSTORE_MARKET });
        if (res && res.completed) return;
      } catch {}
      try {
        const res = await AppLauncher.openUrl({ url: FNF_PLAYSTORE_URL });
        if (res && res.completed) return;
      } catch {}
    }

    // Web / browser fallback: open the official search / store page in new tab
    if (typeof window !== "undefined") {
      window.open("https://play.google.com/store/search?q=fnf&c=apps&h", "_blank");
    }
  }

  /**
   * Checks if Friday Night Funkin' Base Game is installed.
   */
  static async isBaseGameInstalled(): Promise<boolean> {
    return this.isAppInstalled(FNF_MOBILE_PACKAGE);
  }

  /**
   * Launches Friday Night Funkin' Base Game.
   */
  static async launchBaseGame(): Promise<boolean> {
    return this.launchApp(FNF_MOBILE_PACKAGE);
  }

  /**
   * Prompts user to uninstall an Android package using the native OS dialog.
   */
  static async uninstallPackage(packageName: string): Promise<boolean> {
    const isNative =
      (typeof Capacitor !== "undefined" &&
        typeof Capacitor.isNativePlatform === "function" &&
        Capacitor.isNativePlatform()) ||
      (typeof window !== "undefined" && Boolean((window as any).Capacitor?.isNativePlatform?.()));

    if (isNative) {
      try {
        const AppManager = registerPlugin<any>("AppManager");
        await AppManager.uninstallPackage({ packageName });
        await this.setAppInstalledCache(packageName, false);
        return true;
      } catch (e) {
        console.warn("AppManager.uninstallPackage failed:", e);
      }
    }
    await this.setAppInstalledCache(packageName, false);
    return false;
  }

  /**
   * Prompts user to uninstall Friday Night Funkin' Base Game using the native OS dialog on Android.
   */
  static async uninstallBaseGame(): Promise<boolean> {
    return await this.uninstallPackage(FNF_MOBILE_PACKAGE);
  }
}

