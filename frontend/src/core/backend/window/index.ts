import { platform } from "@platform";
import type { IWindowService } from "@contracts";

/**
 * @description Unified interface for Window management.
 * Polymorphically delegates to the active platform window driver (OCP / SRP).
 */
export const windowApi: IWindowService = {
  minimize: () => platform.window.minimize(),
  maximize: () => platform.window.maximize(),
  unmaximize: () => platform.window.unmaximize(),
  unminimize: () => platform.window.unminimize(),
  setAlwaysOnTop: (onTop: boolean) => platform.window.setAlwaysOnTop(onTop),
  bringToFront: () => platform.window.bringToFront(),
  setFullScreen: () => platform.window.setFullScreen(),
  exitFullScreen: () => platform.window.exitFullScreen(),
  show: () => platform.window.show(),
  hide: () => platform.window.hide(),
  focus: () => platform.window.focus(),
  move: (x: number, y: number) => platform.window.move(x, y),
  setSize: (width: number, height: number) => platform.window.setSize(width, height),
  getSize: () => platform.window.getSize(),
  getPosition: () => platform.window.getPosition(),
  getDisplays: () => platform.window.getDisplays(),
  close: () => platform.window.close(),
  center: () => platform.window.center(),
};

export default windowApi;
