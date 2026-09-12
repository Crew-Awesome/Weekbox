/**
 * Global type declarations for Neutralino, Node.js, and React Native WebView native APIs.
 */
import type { BackendOperation, BackendResult } from "../backend/types";

declare global {
  interface Window {
    NODE?: {
      run: (func: string, param?: any) => void;
      call: <T = unknown>(
        operation: string,
        params?: unknown,
        timeoutMs?: number,
        signal?: AbortSignal,
      ) => Promise<T>;
      stop: () => void;
    };
    Neutralino?: {
      init: () => void;
      events: {
        on: (eventName: string, handler: (event: any) => void) => void;
      };
      app?: {
        getConfig: () => Promise<any>;
        exit: () => Promise<void>;
      };
      filesystem?: any;
      window?: {
        minimize: () => Promise<void>;
        maximize: () => Promise<void>;
        unmaximize: () => Promise<void>;
        setFullScreen: () => Promise<void>;
        exitFullScreen: () => Promise<void>;
        show: () => Promise<void>;
        hide: () => Promise<void>;
        focus: () => Promise<void>;
        move: (x: number, y: number) => Promise<void>;
        setSize: (width: number, height: number) => Promise<void>;
        getSize: () => Promise<{ width: number; height: number }>;
        getPosition: () => Promise<{ x: number; y: number }>;
      };
      computer?: {
        getDisplays: () => Promise<any[]>;
      };
      os?: {
        execCommand: (
          command: string,
        ) => Promise<{
          pid: number;
          exitCode: number;
          stdOut: string;
          stdErr: string;
        }>;
        open: (url: string) => Promise<void>;
        getPath?: (name: string) => Promise<string>;
        showNotification?: (title: string, content: string, icon?: string) => Promise<void>;
      };
    };
    NL_ARGS?: string[];
    NL_OS?: string;
    NL_CWD?: string;
    NL_PATH?: string;
    NodeExtension?: new (debug?: boolean) => {
      run: (func: string, param?: any) => void;
      call: <T = unknown>(
        operation: string,
        params?: unknown,
        timeoutMs?: number,
        signal?: AbortSignal,
      ) => Promise<T>;
      stop: () => void;
    };
  }
}

/** Active platform type at runtime */
export type PlatformType = "desktop" | "web";

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
    signal?: AbortSignal
  ): Promise<BackendResult<Operation>>;

  /** Downloads a mod archive. Implementations vary by platform. */
  downloadMod(url: string, modId?: string, modName?: string, onProgress?: (progress: number, statusText?: string) => void, signal?: AbortSignal): Promise<void>;

  /** Opens a URL in the default web browser. */
  openUrl(url: string): Promise<void>;

  /** Registers a mod as installed in the data directory. */
  registerInstalledMod(modData: any): Promise<void>;

  /** Checks if a mod is installed by reading the registry. */
  isModInstalled(modId: string): Promise<boolean>;

  /** Uninstalls a mod (removes from registry and deletes files). */
  uninstallMod(modId: string): Promise<void>;
}
