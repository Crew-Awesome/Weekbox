import type { PlatformCapabilities, PlatformType } from "@contracts";
import type { DesktopTransport } from "./transport";
import { taskMonitor } from "../task-monitor";
import neuConfig from "../../../../../neutralino.config.json";

/**
 * Lifecycle and system event handling for Desktop.
 */
export class DesktopLifecycle {
  readonly platformName: PlatformType = "desktop";
  readonly capabilities: PlatformCapabilities = {
    canLaunchProcesses: true,
    canOpenFolders: true,
    canAccessNativeFileSystem: true,
    canShowNativeDialogs: true,
    canDownloadDirectStreams: true,
    canExtractArchives: true,
    canManageWindow: true,
    canSendOSNotifications: true,
  };

  private _isReady: boolean = false;
  private transport: DesktopTransport;
  private isAnyProcessRunning: () => Promise<boolean>;
  private getSettings: () => Promise<Record<string, any>>;

  constructor(
    transport: DesktopTransport,
    isAnyProcessRunning: () => Promise<boolean>,
    getSettings: () => Promise<Record<string, any>>
  ) {
    this.transport = transport;
    this.isAnyProcessRunning = isAnyProcessRunning;
    this.getSettings = getSettings;
  }

  get isReady(): boolean {
    return this._isReady;
  }

  initialize(): void {
    const neutralino = window.Neutralino;
    const NodeExt = window.NodeExtension;

    if (neutralino && NodeExt) {
      neutralino.init();
      window.NODE = new NodeExt(true);

      neutralino.events.on("pingResult", (event: { detail: any }) => {
        this.transport.emitLocalEvent("pingResult", event.detail);
      });

      neutralino.events.on("newInstance", (event: any) => {
        this.transport.emitLocalEvent("newInstance", event);
      });

      neutralino.events.on("deeplinkArgs", (event: any) => {
        this.transport.emitLocalEvent("deeplinkArgs", event);
      });

      neutralino.events.on("download:progress", (event: any) => {
        this.transport.emitLocalEvent("download:progress", event.detail);
      });

      neutralino.events.on("process:exit", (event: any) => {
        this.transport.emitLocalEvent("process:exit", event.detail);
      });

      neutralino.events.on("windowClose", async () => {
        const settings: any = await this.getSettings().catch(() => ({}));
        const preventClose = settings?.preventCloseOnActive !== false;

        let isProcessActive = false;
        try {
          isProcessActive = await this.isAnyProcessRunning();
        } catch {}

        const hasActiveTasks =
          isProcessActive ||
          taskMonitor.hasActiveTasks() ||
          (typeof (window as any).__WB_HAS_ACTIVE_TASKS === "function"
            ? (window as any).__WB_HAS_ACTIVE_TASKS()
            : false);

        if (preventClose && hasActiveTasks) {
          const msg = isProcessActive
            ? "Cannot close WeekBox while a game instance is running. Please close the game first."
            : "Cannot close WeekBox while an installation, download, or storage migration is in progress.";

          (window.Neutralino?.os as any)?.showNotification?.("Action Blocked", msg);
          if (typeof window !== "undefined" && (window as any).wbToast) {
            (window as any).wbToast.warning(msg, {
              title: "Action Blocked",
            });
          }
          return;
        }

        try {
          if (window.NL_OS === "Darwin" && (neutralino.app as any)?.killProcess) {
            await (neutralino.app as any).killProcess();
          } else {
            await neutralino.app?.exit();
          }
        } catch {
          window.close();
        }
      });

      neutralino.events.on("ready", () => {
        this._isReady = true;
        this.transport.emitLocalEvent("ready", true);

        let lastPingCheck = Date.now();
        const sendHeartbeat = () => {
          this.transport.call("system.ping" as any).catch(() => {});
        };

        sendHeartbeat();

        setInterval(() => {
          const now = Date.now();
          if (now - lastPingCheck > 12000) {
            sendHeartbeat();
          }
          lastPingCheck = now;
          sendHeartbeat();
        }, 5000);

        if (typeof window !== "undefined") {
          window.addEventListener("focus", sendHeartbeat);
          window.addEventListener("online", sendHeartbeat);
          document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "visible") {
              sendHeartbeat();
            }
          });
        }
      });
    }
  }

  async getVersion(): Promise<string> {
    return neuConfig.version || "1.0.0";
  }

  async openUrl(url: string): Promise<void> {
    if (window.Neutralino?.os?.open) {
      await window.Neutralino.os.open(url);
    } else {
      window.open(url, "_blank");
    }
  }
}
