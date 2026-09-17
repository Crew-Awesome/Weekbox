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
  IWindowService,
  INotificationService,
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
 * Segregated Platform Bridge Interface (ISP / DIP).
 * Composes specialized contracts into a structured bridge,
 * allowing components and stores to consume only the specific interfaces they require.
 */
export interface IPlatformBridge
  extends IPlatformLifecycle,
    IPlatformTransport,
    IPlatformEvents {
  readonly mods: IModService;
  readonly engines: IEngineService;
  readonly process: IProcessLauncher;
  readonly storage: IStorageService;
  readonly settings: ISettingsService;
  readonly window: IWindowService;
  readonly notification: INotificationService;
  /** Opens a URL or native path */
  openUrl(url: string): Promise<void>;
  /** Dynamic property delegation for runtime extensibility */
  [key: string]: any;
}
