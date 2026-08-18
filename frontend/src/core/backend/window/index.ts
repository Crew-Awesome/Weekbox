import { platform } from "../../platform";
import type { BackendOperation } from "../types";

/**
 * @description Unified interface for Window management.
 * Controls the application window through the adapter layer, falling back to Web APIs where applicable.
 */
export const windowApi = {
  async minimize() {
    if (platform.platformName === "web") return;
    if (window.Neutralino?.window?.minimize) return await window.Neutralino.window.minimize();
    return await platform.call("window.minimize" as BackendOperation);
  },

  async maximize() {
    if (platform.platformName === "web") return;
    if (window.Neutralino?.window?.maximize) return await window.Neutralino.window.maximize();
    return await platform.call("window.maximize" as BackendOperation);
  },

  async unmaximize() {
    if (platform.platformName === "web") return;
    if (window.Neutralino?.window?.unmaximize) return await window.Neutralino.window.unmaximize();
    return await platform.call("window.unmaximize" as BackendOperation);
  },

  async setFullScreen() {
    if (platform.platformName === "web") {
      document.documentElement.requestFullscreen?.();
      return;
    }
    if (window.Neutralino?.window?.setFullScreen) return await window.Neutralino.window.setFullScreen();
    return await platform.call("window.setFullScreen" as BackendOperation);
  },

  async exitFullScreen() {
    if (platform.platformName === "web") {
      document.exitFullscreen?.();
      return;
    }
    if (window.Neutralino?.window?.exitFullScreen) return await window.Neutralino.window.exitFullScreen();
    return await platform.call("window.exitFullScreen" as BackendOperation);
  },

  async show() {
    if (platform.platformName === "web") return;
    if (window.Neutralino?.window?.show) return await window.Neutralino.window.show();
    return await platform.call("window.show" as BackendOperation);
  },

  async hide() {
    if (platform.platformName === "web") return;
    if (window.Neutralino?.window?.hide) return await window.Neutralino.window.hide();
    return await platform.call("window.hide" as BackendOperation);
  },

  async focus() {
    if (platform.platformName === "web") {
      window.focus();
      return;
    }
    if (window.Neutralino?.window?.focus) return await window.Neutralino.window.focus();
    return await platform.call("window.focus" as BackendOperation);
  },

  async move(x: number, y: number) {
    if (platform.platformName === "web") {
      window.moveTo(x, y);
      return;
    }
    if (window.Neutralino?.window?.move) return await window.Neutralino.window.move(x, y);
    return await platform.call("window.move" as BackendOperation, { x, y });
  },

  async setSize(width: number, height: number) {
    if (platform.platformName === "web") {
      window.resizeTo(width, height);
      return;
    }
    if (window.Neutralino?.window?.setSize) return await window.Neutralino.window.setSize(width, height);
    return await platform.call("window.setSize" as BackendOperation, { width, height });
  },

  async getSize(): Promise<{ width: number; height: number }> {
    if (platform.platformName === "web") {
      return { width: window.outerWidth, height: window.outerHeight };
    }
    if (window.Neutralino?.window?.getSize) return await window.Neutralino.window.getSize();
    return (await platform.call("window.getSize" as BackendOperation)) as { width: number; height: number };
  },

  async getPosition(): Promise<{ x: number; y: number }> {
    if (platform.platformName === "web") {
      return { x: window.screenX, y: window.screenY };
    }
    if (window.Neutralino?.window?.getPosition) return await window.Neutralino.window.getPosition();
    return (await platform.call("window.getPosition" as BackendOperation)) as { x: number; y: number };
  },

  async getDisplays(): Promise<any[]> {
    if (platform.platformName === "web") {
      // Basic fallback
      return [{
         id: 0,
         resolution: { width: window.screen.width, height: window.screen.height },
         bounds: { x: 0, y: 0, width: window.screen.width, height: window.screen.height }
      }];
    }
    if (window.Neutralino?.computer?.getDisplays) return await window.Neutralino.computer.getDisplays();
    return (await platform.call("window.getDisplays" as BackendOperation)) as any[];
  },

  async close() {
    if (platform.platformName === "web") {
      window.close();
      return;
    }
    if (window.Neutralino?.app?.exit) return await window.Neutralino.app.exit();
    return await platform.call("window.close" as BackendOperation);
  },

  async center() {
    if (platform.platformName === "web") {
      // Fallback center logic for web popups
      const x = (window.screen.width - window.outerWidth) / 2;
      const y = (window.screen.height - window.outerHeight) / 2;
      window.moveTo(x, y);
      return;
    }
    
    // Natively center in frontend
    if (window.Neutralino) {
      try {
        const size = await windowApi.getSize();
        const displays = await windowApi.getDisplays();
        const pos = await windowApi.getPosition();

        let currentDisplay = displays[0];
        if (Array.isArray(displays)) {
          for (const display of displays) {
            const bx = display.bounds?.x || 0;
            const by = display.bounds?.y || 0;
            const bw = display.resolution?.width || 1920;
            const bh = display.resolution?.height || 1080;
            if (pos.x >= bx && pos.x < bx + bw && pos.y >= by && pos.y < by + bh) {
              currentDisplay = display;
              break;
            }
          }
        }
        
        const bx = currentDisplay?.bounds?.x || 0;
        const by = currentDisplay?.bounds?.y || 0;
        const resW = currentDisplay?.resolution?.width || 1920;
        const resH = currentDisplay?.resolution?.height || 1080;

        const centerX = bx + Math.floor((resW - (size?.width || 800)) / 2);
        const centerY = by + Math.floor((resH - (size?.height || 600)) / 2);

        await windowApi.move(centerX, centerY);
        return;
      } catch (error) {
        console.warn("Could not center window natively", error);
      }
    }

    return await platform.call("window.center" as BackendOperation);
  }
};

export default windowApi;
