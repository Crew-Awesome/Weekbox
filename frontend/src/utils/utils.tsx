import { useModals } from "./hooks/use-modals";
import { useNetwork, useNetworkRecovery } from "./hooks/use-network";
import { useDeeplinkManager } from "./hooks/use-deeplink-manager";
import { useAppNavigation } from "./hooks/use-app-navigation";
import { extractColor } from "./extract-color";

import { sanitizeHtml, htmlToPlainText } from "./sanitize";

/**
 * Global API for accessing Weekbox utilities.
 * Groups hooks, helpers, and configurations to be imported from a single alias `@utils`.
 */
const Utils = {
  hooks: {
    useModals,
    useNetwork,
    useNetworkRecovery,
    useDeeplinkManager,
    useAppNavigation,
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
