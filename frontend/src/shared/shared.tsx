import { Sidebar } from './components/organisms/sidebar/sidebar';
import { ProgressBar } from './components/atoms/progress-bar/progress-bar';
import { AppVersion } from './components/atoms/app-version/app-version';

/**
 * @description API global para acceder a los componentes compartidos de Weekbox.
 * Esta estructura sigue la metodología de Atomic Design (Átomos, Moléculas, Organismos)
 * para facilitar la importación global mediante un único punto de acceso.
 */
const Shared = {
  /**
   * @description Componentes Átomos: Los bloques de construcción más básicos e indivisibles de la interfaz.
   * Ejemplos: Botones, etiquetas (labels), inputs de texto, íconos.
   */
  atoms: {
    ProgressBar,
    AppVersion,
  },

  /**
   * @description Componentes Moléculas: Agrupaciones simples de átomos construidas para funcionar como una unidad.
   * Ejemplos: Tarjetas (Cards), barras de búsqueda, campos de formulario completos.
   */
  molecules: {},

  /**
   * @description Componentes Organismos: Secciones complejas e independientes de la interfaz compuestas por moléculas y/o átomos.
   * Ejemplos: Barra lateral (Sidebar), barra de navegación (Header), pie de página (Footer).
   */
  organisms: {
    /**
     * @description Barra lateral principal de la aplicación.
     * Contiene el logo, la navegación de las secciones (Home, Library, Explore) y 
     * configuraciones rápidas, utilizando un diseño en capas (z-index) y curvas vectoriales.
     */
    Sidebar,
  },
};

export default Shared;
