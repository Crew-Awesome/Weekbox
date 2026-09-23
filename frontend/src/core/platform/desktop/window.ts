import type { IWindowService } from "@contracts";
import type { DesktopTransport } from "./transport";
import type { BackendOperation } from "../../backend/types";

/**
 * Native window management for Desktop (Neutralino + Node backend).
 */
export class DesktopWindow implements IWindowService {
  private transport: DesktopTransport;

  constructor(transport: DesktopTransport) {
    this.transport = transport;
  }

  async minimize(): Promise<void> {
    if (window.Neutralino?.window?.minimize) {
      return await window.Neutralino.window.minimize();
    }
    await this.transport.call("window.minimize" as BackendOperation);
  }

  async maximize(): Promise<void> {
    if (window.Neutralino?.window?.maximize) {
      return await window.Neutralino.window.maximize();
    }
    await this.transport.call("window.maximize" as BackendOperation);
  }

  async unmaximize(): Promise<void> {
    if (window.Neutralino?.window?.unmaximize) {
      return await window.Neutralino.window.unmaximize();
    }
    await this.transport.call("window.unmaximize" as BackendOperation);
  }

  async unminimize(): Promise<void> {
    if (window.Neutralino?.window?.unminimize) {
      return await window.Neutralino.window.unminimize();
    }
    await this.transport.call("window.unminimize" as BackendOperation);
  }

  async setAlwaysOnTop(onTop: boolean): Promise<void> {
    if (window.Neutralino?.window?.setAlwaysOnTop) {
      return await window.Neutralino.window.setAlwaysOnTop(onTop);
    }
    await this.transport.call("window.setAlwaysOnTop" as BackendOperation, { onTop });
  }

  async bringToFront(): Promise<void> {
    try {
      if (window.Neutralino?.window) {
        await window.Neutralino.window.show().catch(() => {});
        const isWindows = window.NL_OS === "Windows";
        if (isWindows) {
          if (window.Neutralino.window.unminimize) {
            await window.Neutralino.window.unminimize().catch(() => {});
          }
          if (window.Neutralino.window.setAlwaysOnTop) {
            await window.Neutralino.window.setAlwaysOnTop(true).catch(() => {});
            await window.Neutralino.window.focus().catch(() => {});
            setTimeout(async () => {
              try {
                const win = window.Neutralino?.window;
                if (win?.setAlwaysOnTop) {
                  await win.setAlwaysOnTop(false).catch(() => {});
                }
                await win?.focus?.().catch(() => {});
              } catch {}
            }, 200);
          } else {
            await window.Neutralino.window.focus().catch(() => {});
          }
        } else {
          await window.Neutralino.window.focus().catch(() => {});
        }
        return;
      }
      await this.transport.call("window.focus" as BackendOperation).catch(() => {});
    } catch (e) {
      console.warn("[DesktopWindow] Could not bring window to front:", e);
    }
  }

  async setFullScreen(): Promise<void> {
    if (window.Neutralino?.window?.setFullScreen) {
      return await window.Neutralino.window.setFullScreen();
    }
    await this.transport.call("window.setFullScreen" as BackendOperation);
  }

  async exitFullScreen(): Promise<void> {
    if (window.Neutralino?.window?.exitFullScreen) {
      return await window.Neutralino.window.exitFullScreen();
    }
    await this.transport.call("window.exitFullScreen" as BackendOperation);
  }

  async show(): Promise<void> {
    if (window.Neutralino?.window?.show) {
      return await window.Neutralino.window.show();
    }
    await this.transport.call("window.show" as BackendOperation);
  }

  async hide(): Promise<void> {
    if (window.Neutralino?.window?.hide) {
      return await window.Neutralino.window.hide();
    }
    await this.transport.call("window.hide" as BackendOperation);
  }

  async focus(): Promise<void> {
    if (window.Neutralino?.window?.focus) {
      return await window.Neutralino.window.focus();
    }
    await this.transport.call("window.focus" as BackendOperation);
  }

  async move(x: number, y: number): Promise<void> {
    if (window.Neutralino?.window?.move) {
      return await window.Neutralino.window.move(x, y);
    }
    await this.transport.call("window.move" as BackendOperation, { x, y });
  }

  async setSize(width: number, height: number): Promise<void> {
    if (window.Neutralino?.window?.setSize) {
      return await window.Neutralino.window.setSize(width, height);
    }
    await this.transport.call("window.setSize" as BackendOperation, { width, height });
  }

  async getSize(): Promise<{ width: number; height: number }> {
    if (window.Neutralino?.window?.getSize) {
      return await window.Neutralino.window.getSize();
    }
    return (await this.transport.call("window.getSize" as BackendOperation)) as {
      width: number;
      height: number;
    };
  }

  async getPosition(): Promise<{ x: number; y: number }> {
    if (window.Neutralino?.window?.getPosition) {
      return await window.Neutralino.window.getPosition();
    }
    return (await this.transport.call("window.getPosition" as BackendOperation)) as {
      x: number;
      y: number;
    };
  }

  async getDisplays(): Promise<any[]> {
    if (window.Neutralino?.computer?.getDisplays) {
      return await window.Neutralino.computer.getDisplays();
    }
    return (await this.transport.call("window.getDisplays" as BackendOperation)) as any[];
  }

  async close(): Promise<void> {
    if (window.Neutralino?.app) {
      if (window.NL_OS === "Darwin" && (window.Neutralino.app as any).killProcess) {
        return await (window.Neutralino.app as any).killProcess();
      }
      if (window.Neutralino.app.exit) {
        return await window.Neutralino.app.exit();
      }
    }
    await this.transport.call("window.close" as BackendOperation);
  }

  async center(): Promise<void> {
    if (window.Neutralino) {
      try {
        const size = await this.getSize().catch(() => null);
        const displays = await this.getDisplays().catch(() => []);
        const pos = await this.getPosition().catch(() => null);

        if (!size || !pos || !Array.isArray(displays) || displays.length === 0) {
          return;
        }

        let currentDisplay = displays[0];
        for (const display of displays) {
          const bx = display.bounds?.x || 0;
          const by = display.bounds?.y || 0;
          const bw = display.resolution?.width || 1920;
          const bh = display.resolution?.height || 1080;
          if (
            pos.x >= bx &&
            pos.x < bx + bw &&
            pos.y >= by &&
            pos.y < by + bh
          ) {
            currentDisplay = display;
            break;
          }
        }

        const bx = currentDisplay?.bounds?.x || 0;
        const by = currentDisplay?.bounds?.y || 0;
        const resW = currentDisplay?.resolution?.width || 1920;
        const resH = currentDisplay?.resolution?.height || 1080;

        const centerX = bx + Math.floor((resW - (size?.width || 800)) / 2);
        const centerY = by + Math.floor((resH - (size?.height || 600)) / 2);

        await this.move(centerX, centerY);
        return;
      } catch (error) {
        console.warn("[DesktopWindow] Could not center window natively:", error);
      }
    }

    await this.transport.call("window.center" as BackendOperation);
  }
}
