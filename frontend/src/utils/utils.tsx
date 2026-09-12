import { useModals } from "./hooks/use-modals";
import { useNetwork, useNetworkRecovery } from "./hooks/use-network";
import { useDeeplinkManager } from "./hooks/use-deeplink-manager";
import { useAppNavigation } from "./hooks/use-app-navigation";
import { useShowWindow } from "./hooks/use-show-window";
import { useToast } from "./hooks/use-toast";
import { useNotifications } from "./hooks/use-notifications";
import { extractColor } from "./extract-color";
import { toast } from "./toast";

import { sanitizeHtml, htmlToPlainText } from "./sanitize";

export { toast } from "./toast";
export { useToast } from "./hooks/use-toast";
export { useNotifications } from "./hooks/use-notifications";

/**
 * Global API for accessing Weekbox utilities.
 * Groups hooks, helpers, and configurations to be imported from a single alias `@utils`.
 */
const Utils = {
  toast,
  hooks: {
    useModals,
    useNetwork,
    useNetworkRecovery,
    useDeeplinkManager,
    useAppNavigation,
    useShowWindow,
    useToast,
    useNotifications,
  },
  sanitize: {
    sanitizeHtml,
    htmlToPlainText,
  },
  colors: {
    extractColor,
  },
};

export default Utils;

