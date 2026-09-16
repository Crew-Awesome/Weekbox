import type { IWindowService } from "@contracts";

/**
 * Web window management fallbacks using standard DOM APIs.
 */
export class WebWindow implements IWindowService {
  async minimize(): Promise<void> {
    // No-op in browser
  }

  async maximize(): Promise<void> {
    document.documentElement.requestFullscreen?.().catch(() => {});
  }

  async unmaximize(): Promise<void> {
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    }
  }

  async unminimize(): Promise<void> {
    // No-op in browser
  }

  async setAlwaysOnTop(_onTop: boolean): Promise<void> {
    // No-op in browser
  }

  async bringToFront(): Promise<void> {
    if (typeof window !== "undefined") {
      window.focus();
    }
  }

  async setFullScreen(): Promise<void> {
    document.documentElement.requestFullscreen?.().catch(() => {});
  }

  async exitFullScreen(): Promise<void> {
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    }
  }

  async show(): Promise<void> {
    // No-op in browser
  }

  async hide(): Promise<void> {
    // No-op in browser
  }

  async focus(): Promise<void> {
    if (typeof window !== "undefined") {
      window.focus();
    }
  }

  async move(x: number, y: number): Promise<void> {
    if (typeof window !== "undefined") {
      window.moveTo(x, y);
    }
  }

  async setSize(width: number, height: number): Promise<void> {
    if (typeof window !== "undefined") {
      window.resizeTo(width, height);
    }
  }

  async getSize(): Promise<{ width: number; height: number }> {
    if (typeof window !== "undefined") {
      return { width: window.outerWidth, height: window.outerHeight };
    }
    return { width: 1280, height: 720 };
  }

  async getPosition(): Promise<{ x: number; y: number }> {
    if (typeof window !== "undefined") {
      return { x: window.screenX, y: window.screenY };
    }
    return { x: 0, y: 0 };
  }

  async getDisplays(): Promise<any[]> {
    if (typeof window !== "undefined") {
      return [
        {
          id: 0,
          resolution: {
            width: window.screen.width,
            height: window.screen.height,
          },
          bounds: {
            x: 0,
            y: 0,
            width: window.screen.width,
            height: window.screen.height,
          },
        },
      ];
    }
    return [];
  }

  async close(): Promise<void> {
    if (typeof window !== "undefined") {
      window.close();
    }
  }

  async center(): Promise<void> {
    if (typeof window !== "undefined") {
      const x = (window.screen.width - window.outerWidth) / 2;
      const y = (window.screen.height - window.outerHeight) / 2;
      window.moveTo(x, y);
    }
  }
}
