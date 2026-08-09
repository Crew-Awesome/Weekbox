// Declaraciones globales de tipos para las APIs nativas de Neutralino, Node.js y React Native WebView.
declare global {
  interface Window {
    NODE?: {
      run: (func: string, param?: any) => void;
      stop: () => void;
    };
    Neutralino?: {
      init: () => void;
      events: {
        on: (eventName: string, handler: (event: any) => void) => void;
      };
    };
    NodeExtension?: new (debug?: boolean) => {
      run: (func: string, param?: any) => void;
      stop: () => void;
    };
    ReactNativeWebView?: {
      postMessage: (message: string) => void;
    };
  }
}

// Tipo de plataforma activa en tiempo de ejecución.
export type PlatformType = 'desktop' | 'mobile' | 'web';

/**
 * Definición del contrato común de la plataforma.
 * Permite a cualquier componente de la UI interactuar con servicios nativos
 * de forma agnóstica sin acoplarse a Neutralino, React Native o Web.
 */
export interface IPlatformBridge {
  // Nombre de la plataforma detectada
  readonly platformName: PlatformType;

  // Indica si la plataforma ha completado su inicialización
  readonly isReady: boolean;

  // Inicializa los listeners y recursos necesarios de la plataforma.
  initialize(): void;

  /**
   * Suscribe un listener a eventos emitidos por el backend o el host nativo.
   * @param {string} eventName - Nombre del evento a escuchar.
   * @param {Function} listener - Callback a ejecutar cuando se recibe el evento.
   * @returns {Function} Función de desuscripción.
   */
  onEvent(eventName: string, listener: (data: any) => void): () => void;
}
