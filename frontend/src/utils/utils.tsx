import { useModals } from "./hooks/use-modals";
import {
  useNetwork,
  useNetworkRecovery,
  useNetworkStore,
  checkNetworkConnectivity,
  setNetworkOnline,
} from "./hooks/use-network";
import { useDeeplinkManager } from "./hooks/use-deeplink-manager";
import { useAppNavigation } from "./hooks/use-app-navigation";
import { useShowWindow } from "./hooks/use-show-window";
import { useToast } from "./hooks/use-toast";
import { useNotifications } from "./hooks/use-notifications";
import { useBlurOnTop } from "./hooks/blur-on-top";
import { useModalPattern } from "./hooks/use-modal-pattern";
import { useModalBackdrop } from "./hooks/use-modal-backdrop";
import { useTranslationSettings } from "./hooks/use-translation-settings";
import {
  extractColor,
  isExtractColorActive,
  setExtractColorActive,
  subscribeExtractColor,
  useExtractColor,
} from "./extract-color";
import { toast } from "./toast";

import { sanitizeHtml, htmlToPlainText } from "./sanitize";
import { extractModIdOrUrl, handleDirectModLookup } from "./mod-search-helper";
import { SoundEffects } from "./sound";

export type { MorphModalData } from "./hooks/use-modals";
export { SoundEffects, playSound, isSoundEffectsEnabled } from "./sound";

export { toast } from "./toast";
export { useToast } from "./hooks/use-toast";
export { useNotifications } from "./hooks/use-notifications";
export { useBlurOnTop } from "./hooks/blur-on-top";
export { useModalPattern, isModalPatternActive, setModalPatternActive } from "./hooks/use-modal-pattern";
export { useModalBackdrop, isModalBackdropActive, setModalBackdropActive } from "./hooks/use-modal-backdrop";
export {
  useTranslationSettings,
  isTranslateDescriptionsActive,
  setTranslateDescriptionsActive,
  getTranslationLanguage,
  setTranslationLanguage,
} from "./hooks/use-translation-settings";
export {
  extractColor,
  isExtractColorActive,
  setExtractColorActive,
  subscribeExtractColor,
  useExtractColor,
} from "./extract-color";
export { extractModIdOrUrl, handleDirectModLookup } from "./mod-search-helper";

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
    useNetworkStore,
    checkNetworkConnectivity,
    setNetworkOnline,
    useDeeplinkManager,
    useAppNavigation,
    useShowWindow,
    useToast,
    useNotifications,
    useExtractColor,
    useBlurOnTop,
    useModalPattern,
    useModalBackdrop,
    useTranslationSettings,
  },
  sanitize: {
    sanitizeHtml,
    htmlToPlainText,
  },
  colors: {
    extractColor,
    isExtractColorActive,
    setExtractColorActive,
    subscribeExtractColor,
  },
  modSearch: {
    extractModIdOrUrl,
    handleDirectModLookup,
  },
  sound: SoundEffects,
};

export default Utils;


