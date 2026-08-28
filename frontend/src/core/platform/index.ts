import type { IPlatformBridge } from "./types";
import { DesktopAdapter } from "./desktop.adapter";
import { WebAdapter } from "./web.adapter";

/**
 * Detects the current runtime environment and creates the corresponding adapter instance.
 * @returns {IPlatformBridge} Concrete adapter for the active platform.
 */
function createPlatformBridge(): IPlatformBridge {
  if (typeof window !== "undefined") {
    console.log("APP_INIT: Checking for Neutralino...", "NL_TOKEN:", !!(window as any).NL_TOKEN, "Neutralino:", !!(window as any).Neutralino);
    if (
      typeof (window as any).NL_TOKEN !== "undefined" &&
      typeof (window as any).Neutralino !== "undefined"
    ) {
      console.log("APP_INIT: Neutralino detected. Using DesktopAdapter.");
      return new DesktopAdapter();
    }
  }

  console.log("APP_INIT: Neutralino not detected. Using WebAdapter.");
  return new WebAdapter();
}

/**
 * Global singleton instance of the Platform Bridge for the entire application.
 */
export const platform: IPlatformBridge = createPlatformBridge();

// Automatically initialize the platform to simplify usage
platform.initialize();

export type * from "./types";
export * from "./desktop.adapter";
export * from "./web.adapter";
