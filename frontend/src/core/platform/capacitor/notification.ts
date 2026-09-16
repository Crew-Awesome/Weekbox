import type {
  INotificationService,
  SystemNotificationOptions,
  NotificationResult,
} from "@contracts";

/**
 * Mobile / Capacitor notification driver implementing INotificationService (ISP / LSP).
 */
export class CapacitorNotification implements INotificationService {
  async showNotification(
    options: SystemNotificationOptions
  ): Promise<NotificationResult> {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "granted") {
        new Notification(options.title, { body: options.content });
        return { ok: true, method: "web-notification" };
      }
    }
    return { ok: true, method: "mobile-fallback" };
  }
}
