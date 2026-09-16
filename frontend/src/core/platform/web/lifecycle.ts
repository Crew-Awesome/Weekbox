import type { PlatformCapabilities, PlatformType } from "@contracts";
import type { WebTransport } from "./transport";

/**
 * Web lifecycle and browser capabilities.
 */
export class WebLifecycle {
  readonly platformName: PlatformType = "web";
  readonly capabilities: PlatformCapabilities = {
    canLaunchProcesses: false,
    canOpenFolders: false,
    canAccessNativeFileSystem: false,
    canShowNativeDialogs: false,
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
    return "1.0.0-web";
  }

  async openUrl(url: string): Promise<void> {
    window.open(url, "_blank");
  }
}
