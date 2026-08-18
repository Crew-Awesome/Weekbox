import { useViews } from "./hooks/use-views";
import { useModals } from "./hooks/use-modals";

import { sanitizeHtml, htmlToPlainText } from "./sanitize";

/**
 * @description API global para acceder a las utilidades de Weekbox.
 * Agrupa hooks, helpers, y configuraciones para ser importadas desde un único alias `@utils`.
 */
const Utils = {
  hooks: {
    useViews,
    useModals,
  },
  sanitize: {
    sanitizeHtml,
    htmlToPlainText,
  },
};

export default Utils;
