import type { IPlatformBridge } from "./types";
import { DesktopAdapter } from "./desktop";
import { WebAdapter } from "./web";
import { CapacitorAdapter } from "./capacitor";
import { Capacitor } from "@capacitor/core";

/**
 * Detects whether the active environment is a mobile / Capacitor platform.
 */
export function isMobilePlatform(): boolean {
  if (typeof window === "undefined") return false;

  const isNativeCapacitor =
    (window as any).Capacitor?.isNativePlatform?.() ||
    (typeof Capacitor !== "undefined" &&
      typeof Capacitor.isNativePlatform === "function" &&
      Capacitor.isNativePlatform());

  if (isNativeCapacitor) return true;

  const capacitorPlatform =
    typeof Capacitor?.getPlatform === "function" ? Capacitor.getPlatform() : "";
  if (capacitorPlatform === "android" || capacitorPlatform === "ios") {
    return true;
  }

  // Fallback check for mobile webview or capacitor wrapper
  if ((window as any).Capacitor && (window as any).Capacitor.platform !== "web") {
    return true;
  }

  return false;
}

/**
 * Detects the current runtime environment and creates the corresponding adapter instance (OCP).
 * @returns {IPlatformBridge} Concrete adapter for the active platform.
 */
function createPlatformBridge(): IPlatformBridge {
  const isTest =
    typeof (globalThis as any).process !== "undefined" &&
    (globalThis as any).process?.env?.NODE_ENV === "test";

  if (typeof window !== "undefined") {
    if (!isTest) {
      console.log(
        "APP_INIT: Checking environment...",
        "NL_TOKEN:",
        !!(window as any).NL_TOKEN,
        "Neutralino:",
        !!(window as any).Neutralino,
        "Capacitor:",
        isMobilePlatform()
      );
    }

    if (
      typeof (window as any).NL_TOKEN !== "undefined" &&
      typeof (window as any).Neutralino !== "undefined"
    ) {
      if (!isTest) {
        console.log("APP_INIT: Neutralino detected. Using DesktopAdapter.");
      }
      return new DesktopAdapter();
    }

    if (isMobilePlatform()) {
      if (!isTest) {
        console.log("APP_INIT: Capacitor platform detected. Using CapacitorAdapter.");
      }
      return new CapacitorAdapter();
    }
  }

  if (!isTest) {
    console.log("APP_INIT: Neutralino/Capacitor not detected. Using WebAdapter.");
  }
  return new WebAdapter();
}

/**
 * Global singleton instance of the Platform Bridge for the entire application.
 */
export const platform: IPlatformBridge = createPlatformBridge();

platform.initialize();

export type * from "./types";
export * from "./desktop";
export * from "./web";
export * from "./capacitor";
