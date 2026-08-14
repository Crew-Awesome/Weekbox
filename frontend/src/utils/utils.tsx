import { useViews } from './hooks/use-views';
import { useModals } from './hooks/use-modals';


/**
 * @description API global para acceder a las utilidades de Weekbox.
 * Agrupa hooks, helpers, y configuraciones para ser importadas desde un único alias `@utils`.
 */
const Utils = {
  hooks: {
    useViews,
    useModals,
  }
};

export default Utils;
