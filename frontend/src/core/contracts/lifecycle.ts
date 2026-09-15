import type { PlatformCapabilities } from "./capabilities";

/** Active platform identifier at runtime */
export type PlatformType = "desktop" | "web";

/**
 * Contract for platform lifecycle management (SRP / ISP).
 */
export interface IPlatformLifecycle {
  /** Detected platform identifier */
  readonly platformName: PlatformType;

  /** Indicates if the platform has completed initial handshakes */
  readonly isReady: boolean;

  /** Explicit platform capabilities (LSP) */
  readonly capabilities: PlatformCapabilities;

  /** Initializes listeners and platform resources */
  initialize(): void;

  /** Retrieves the application version */
  getVersion(): Promise<string>;
}
