import { useViews } from './hooks/use-views';
import { useModals } from './hooks/use-modals';
import { useFlip } from './hooks/use-flip';

/**
 * @description API global para acceder a las utilidades de Weekbox.
 * Agrupa hooks, helpers, y configuraciones para ser importadas desde un único alias `@utils`.
 */
const Utils = {
  hooks: {
    useViews,
    useModals,
    useFlip,
  }
};

export default Utils;
