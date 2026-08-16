/**
 * Global type declarations for Neutralino, Node.js, and React Native WebView native APIs.
 */
import type { BackendOperation, BackendResult } from '../backend/types';

declare global {
  interface Window {
    NODE?: {
      run: (func: string, param?: any) => void;
      call: <T = unknown>(operation: string, params?: unknown, timeoutMs?: number) => Promise<T>;
      stop: () => void;
    };
    Neutralino?: {
      init: () => void;
      events: {
        on: (eventName: string, handler: (event: any) => void) => void;
      };
      app?: {
        getConfig: () => Promise<any>;
      };
      filesystem?: any;
    };
    NodeExtension?: new (debug?: boolean) => {
      run: (func: string, param?: any) => void;
      call: <T = unknown>(operation: string, params?: unknown, timeoutMs?: number) => Promise<T>;
      stop: () => void;
    };
  }
}

/** Active platform type at runtime */
export type PlatformType = 'desktop' | 'web';

/**
 * Definición del contrato común de la plataforma.
 * Permite a cualquier componente de la UI interactuar con servicios nativos
 * de forma agnóstica sin acoplarse a Neutralino, React Native o Web.
 */
export interface IPlatformBridge {
  /** Detected platform name */
  readonly platformName: PlatformType;

  /** Indicates if the platform has completed its initialization */
  readonly isReady: boolean;

  /** Initializes listeners and required platform resources */
  initialize(): void;

  /**
   * Obtiene la versión actual de la aplicación de forma asíncrona.
   * Dependiendo de la plataforma, esto puede leerse de Neutralino o solicitarse a React Native.
   */
  getVersion(): Promise<string>;

  /**
   * Suscribe un listener a eventos emitidos por el backend o el host nativo.
   * @param {string} eventName - Nombre del evento a escuchar.
   * @param {Function} listener - Callback a ejecutar cuando se recibe el evento.
   * @returns {Function} Función de desuscripción.
   */
  onEvent(eventName: string, listener: (data: any) => void): () => void;

  /** Calls a backend operation through the active platform adapter. */
  call<Operation extends BackendOperation>(
    operation: Operation,
    params?: unknown,
  ): Promise<BackendResult<Operation>>;
}
