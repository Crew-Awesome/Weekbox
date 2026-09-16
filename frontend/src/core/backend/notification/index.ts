import { platform } from "@platform";
import type {
  INotificationService,
  SystemNotificationOptions,
  NotificationResult,
} from "@contracts";

export type { SystemNotificationOptions, NotificationResult };

/**
 * @description Unified interface for Native OS Notifications.
 * Polymorphically delegates to the active platform notification driver (OCP / SRP).
 */
export const notificationApi: INotificationService = {
  showNotification: (options: SystemNotificationOptions) => {
    return platform.notification.showNotification(options);
  },
};

export default notificationApi;
