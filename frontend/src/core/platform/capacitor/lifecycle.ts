import type { PlatformCapabilities, PlatformType } from "@contracts";
import type { WebTransport } from "../web/transport";
import { Capacitor } from "@capacitor/core";

/**
 * Capacitor lifecycle and mobile capabilities (LSP / ISP).
 */
export class CapacitorLifecycle {
  readonly platformName: PlatformType = "capacitor";
  readonly capabilities: PlatformCapabilities = {
    canLaunchProcesses: false,
    canOpenFolders: false,
    canAccessNativeFileSystem: false,
    canShowNativeDialogs: true,
    canDownloadDirectStreams: false,
    canExtractArchives: false,
    canManageWindow: false,
    canSendOSNotifications: true,
  };

  private _isReady: boolean = true;
  private transport: WebTransport;

  constructor(transport: WebTransport) {
    this.transport = transport;
  }

  get isReady(): boolean {
    return this._isReady;
  }

  initialize(): void {
    setTimeout(() => {
      this.transport.emitLocalEvent("ready", true);
    }, 50);
  }

  async getVersion(): Promise<string> {
    const plat = typeof Capacitor?.getPlatform === "function" ? Capacitor.getPlatform() : "mobile";
    return `3.0.0-capacitor-${plat}`;
  }
}
