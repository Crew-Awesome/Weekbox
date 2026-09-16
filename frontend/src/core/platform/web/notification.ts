import type {
  INotificationService,
  SystemNotificationOptions,
  NotificationResult,
} from "@contracts";

/**
 * Web notification service using standard HTML5 Notification API.
 */
export class WebNotification implements INotificationService {
  async showNotification(options: SystemNotificationOptions): Promise<NotificationResult> {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "granted") {
        new Notification(options.title, { body: options.content });
        return { ok: true, method: "web-notification" };
      } else if (Notification.permission !== "denied") {
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
          new Notification(options.title, { body: options.content });
          return { ok: true, method: "web-notification" };
        }
      }
    }
    return { ok: false, error: "Web notifications unavailable or permission denied" };
  }
}
