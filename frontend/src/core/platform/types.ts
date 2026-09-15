/**
 * Global type declarations for Neutralino, Node.js, and React Native WebView native APIs.
 */
import type {
  IPlatformLifecycle,
  IPlatformTransport,
  IPlatformEvents,
  IModService,
  IEngineService,
  IProcessLauncher,
  IStorageService,
  ISettingsService,
} from "@contracts";

export type * from "@contracts";

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
        unminimize?: () => Promise<void>;
        setAlwaysOnTop?: (onTop: boolean) => Promise<void>;
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

/**
 * Composite Platform Bridge Interface (ISP / Backward Compatibility).
 * Composes specialized contracts into a unified bridge for existing components,
 * while allowing new components to depend only on specific segregated interfaces.
 */
export interface IPlatformBridge
  extends IPlatformLifecycle,
    IPlatformTransport,
    IPlatformEvents,
    IModService,
    IEngineService,
    IProcessLauncher,
    IStorageService,
    ISettingsService {
  /** Opens a URL in the browser */
  openUrl(url: string): Promise<void>;
}
