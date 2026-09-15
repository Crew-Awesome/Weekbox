import type { ToastItem, ToastType } from "../components/atoms/toast";

export type ToastPosition =
  | "top-right"
  | "top-left"
  | "bottom-right"
  | "bottom-left"
  | "top-center"
  | "bottom-center";

type ToastListener = (toasts: ToastItem[]) => void;
type PositionListener = (position: ToastPosition) => void;
export interface ToastSettings {
  enabled: boolean;
  detailed: boolean;
  minimized: boolean;
}
type SettingsListener = (settings: ToastSettings) => void;

interface ToastOptions {
  title?: string;
  duration?: number;
  progress?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

class ToastManager {
  private toasts: ToastItem[] = [];
  private listeners: Set<ToastListener> = new Set();
  private positionListeners: Set<PositionListener> = new Set();
  private settingsListeners: Set<SettingsListener> = new Set();
  private maxToasts = 5;
  private position: ToastPosition = "top-right";
  private enabled = true;
  private detailed = true;
  private minimized = false;

  constructor() {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("wb_toast_position") as ToastPosition | null;
        if (
          saved &&
          [
            "top-right",
            "top-left",
            "bottom-right",
            "bottom-left",
            "top-center",
            "bottom-center",
          ].includes(saved)
        ) {
          this.position = saved;
        }

        const savedEnabled = localStorage.getItem("wb_toasts_enabled");
        if (savedEnabled !== null) {
          this.enabled = savedEnabled !== "false";
        }

        const savedDetailed = localStorage.getItem("wb_toasts_detailed");
        if (savedDetailed !== null) {
          this.detailed = savedDetailed !== "false";
        }
      } catch {}
    }
  }

  private notify() {
    this.listeners.forEach((listener) => listener([...this.toasts]));
  }

  public subscribe(listener: ToastListener): () => void {
    this.listeners.add(listener);
    listener([...this.toasts]);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public subscribePosition(listener: PositionListener): () => void {
    this.positionListeners.add(listener);
    listener(this.position);
    return () => {
      this.positionListeners.delete(listener);
    };
  }

  public getPosition(): ToastPosition {
    return this.position;
  }

  public setPosition(pos: ToastPosition): void {
    this.position = pos;
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("wb_toast_position", pos);
      } catch {}
    }
    this.positionListeners.forEach((listener) => listener(this.position));
  }

  private notifySettings() {
    const currentSettings: ToastSettings = {
      enabled: this.enabled,
      detailed: this.detailed,
      minimized: this.minimized,
    };
    this.settingsListeners.forEach((listener) => listener(currentSettings));
  }

  public subscribeSettings(listener: SettingsListener): () => void {
    this.settingsListeners.add(listener);
    listener({
      enabled: this.enabled,
      detailed: this.detailed,
      minimized: this.minimized,
    });
    return () => {
      this.settingsListeners.delete(listener);
    };
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(val: boolean): void {
    this.enabled = val;
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("wb_toasts_enabled", String(val));
      } catch {}
    }
    this.notifySettings();
  }

  public isDetailed(): boolean {
    return this.detailed;
  }

  public setDetailed(val: boolean): void {
    this.detailed = val;
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("wb_toasts_detailed", String(val));
      } catch {}
    }
    this.notifySettings();
  }

  public isMinimized(): boolean {
    return this.minimized;
  }

  public setMinimized(val: boolean): void {
    this.minimized = val;
    this.notifySettings();
  }

  public toggleMinimized(): void {
    this.setMinimized(!this.minimized);
  }

  public getToasts(): ToastItem[] {
    return [...this.toasts];
  }

  public show(
    message: React.ReactNode,
    type: ToastType = "info",
    options?: ToastOptions | string,
  ): string {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const parsedOptions: ToastOptions =
      typeof options === "string" ? { title: options } : options || {};

    const newToast: ToastItem = {
      id,
      type,
      message,
      title: parsedOptions.title,
      duration: parsedOptions.duration !== undefined ? parsedOptions.duration : 4000,
      progress: parsedOptions.progress,
      action: parsedOptions.action,
    };

    this.toasts = [newToast, ...this.toasts].slice(0, this.maxToasts);
    this.notify();

    return id;
  }

  public update(id: string, updates: Partial<Omit<ToastItem, "id">>): boolean {
    let found = false;
    this.toasts = this.toasts.map((t) => {
      if (t.id === id) {
        found = true;
        return { ...t, ...updates };
      }
      return t;
    });
    if (found) {
      this.notify();
    }
    return found;
  }

  public info(message: React.ReactNode, options?: ToastOptions | string): string {
    return this.show(message, "info", options);
  }

  public success(message: React.ReactNode, options?: ToastOptions | string): string {
    return this.show(message, "success", options);
  }

  public warning(message: React.ReactNode, options?: ToastOptions | string): string {
    return this.show(message, "warning", options);
  }

  public error(message: React.ReactNode, options?: ToastOptions | string): string {
    return this.show(message, "error", options);
  }

  public dismiss(id?: string) {
    if (!id) {
      this.toasts = [];
    } else {
      this.toasts = this.toasts.filter((t) => t.id !== id);
    }
    this.notify();
  }
}

export const toast = new ToastManager();

if (typeof window !== "undefined") {
  (window as unknown as { toast: ToastManager }).toast = toast;
}
