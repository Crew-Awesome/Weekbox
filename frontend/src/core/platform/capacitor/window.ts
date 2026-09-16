import type { IWindowService } from "@contracts";

/**
 * Mobile / Capacitor window driver implementing IWindowService (ISP / LSP).
 */
export class CapacitorWindow implements IWindowService {
  async minimize(): Promise<void> {
    console.info("[CapacitorWindow] minimize is a no-op on mobile devices.");
  }

  async maximize(): Promise<void> {
    console.info("[CapacitorWindow] maximize is a no-op on mobile devices.");
  }

  async toggleMaximize(): Promise<void> {
    console.info("[CapacitorWindow] toggleMaximize is a no-op on mobile devices.");
  }

  async isMaximized(): Promise<boolean> {
    return true;
  }

  async unmaximize(): Promise<void> {}

  async unminimize(): Promise<void> {}

  async setAlwaysOnTop(_onTop: boolean): Promise<void> {}

  async bringToFront(): Promise<void> {}

  async setFullScreen(): Promise<void> {
    if (document.documentElement.requestFullscreen) {
      await document.documentElement.requestFullscreen().catch(() => {});
    }
  }

  async exitFullScreen(): Promise<void> {
    if (document.exitFullscreen) {
      await document.exitFullscreen().catch(() => {});
    }
  }

  async show(): Promise<void> {}

  async hide(): Promise<void> {}

  async focus(): Promise<void> {
    if (typeof window !== "undefined") {
      window.focus?.();
    }
  }

  async move(_x: number, _y: number): Promise<void> {}

  async setSize(_width: number, _height: number): Promise<void> {}

  async getSize(): Promise<{ width: number; height: number }> {
    const width =
      typeof window !== "undefined" && typeof window.innerWidth === "number"
        ? window.innerWidth
        : 360;
    const height =
      typeof window !== "undefined" && typeof window.innerHeight === "number"
        ? window.innerHeight
        : 640;
    return { width, height };
  }

  async getPosition(): Promise<{ x: number; y: number }> {
    return { x: 0, y: 0 };
  }

  async getDisplays(): Promise<any[]> {
    return [];
  }

  async close(): Promise<void> {
    console.info("[CapacitorWindow] close requested on mobile.");
  }

  async center(): Promise<void> {}
}
