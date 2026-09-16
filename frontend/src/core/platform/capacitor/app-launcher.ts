import { AppLauncher } from "@capacitor/app-launcher";
import { Capacitor } from "@capacitor/core";
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
      const targetUrl = platform === "ios" ? `${packageOrScheme}://` : `package:${packageOrScheme}`;
      const { value } = await AppLauncher.canOpenUrl({ url: targetUrl });
      if (value) {
        await this.setAppInstalledCache(packageOrScheme, true);
        return true;
      }
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

    const targetUrl = platform === "ios" ? `${packageOrScheme}://` : `package:${packageOrScheme}`;

    try {
      const res = await AppLauncher.openUrl({ url: targetUrl });
      if (res && res.completed) {
        await this.setAppInstalledCache(packageOrScheme, true);
        return true;
      }
    } catch {}

    // Fallback on Android: try opening market or web
    return false;
  }

  /**
   * Opens the official store listing for the base game.
   * On Android: opens Google Play Store directly.
   * On iOS: opens Apple App Store.
   */
  static async openBaseGameStore(): Promise<void> {
    const platform =
      typeof Capacitor?.getPlatform === "function" ? Capacitor.getPlatform() : "android";

    if (platform === "ios") {
      if (typeof window !== "undefined") {
        window.open(FNF_APPSTORE_URL, "_system");
      }
      return;
    }

    // Android: attempt market:// intent, then fallback to web
    try {
      const res = await AppLauncher.openUrl({ url: FNF_PLAYSTORE_MARKET });
      if (res && res.completed) return;
    } catch {}

    if (typeof window !== "undefined") {
      window.open(FNF_PLAYSTORE_URL, "_system");
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
}
