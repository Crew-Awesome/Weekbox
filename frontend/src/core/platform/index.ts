import type { IPlatformBridge } from "./types";
import { DesktopAdapter } from "./desktop";
import { WebAdapter } from "./web";

/**
 * Detects the current runtime environment and creates the corresponding adapter instance.
 * @returns {IPlatformBridge} Concrete adapter for the active platform.
 */
function createPlatformBridge(): IPlatformBridge {
  const isTest =
    typeof (globalThis as any).process !== "undefined" &&
    (globalThis as any).process?.env?.NODE_ENV === "test";

  if (typeof window !== "undefined") {
    if (!isTest) {
      console.log("APP_INIT: Checking for Neutralino...", "NL_TOKEN:", !!(window as any).NL_TOKEN, "Neutralino:", !!(window as any).Neutralino);
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
  }

  if (!isTest) {
    console.log("APP_INIT: Neutralino not detected. Using WebAdapter.");
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
