import { platform, type IPlatformBridge } from "@platform";
import type {
  IModService,
  IEngineService,
  IProcessLauncher,
  IStorageService,
  ISettingsService,
  IWindowService,
  INotificationService,
  ITaskMonitor,
} from "@contracts";
import { ModService } from "./services/mods/mod";
import { EngineService } from "./services/engines/engine";
import { ProcessService } from "./services/process/process";
import { StorageService } from "./services/storage/storage";
import { SettingsService } from "./services/settings/settings";
import { taskMonitor } from "./platform/task-monitor";

/**
 * Service registry and dependency injection container (DIP).
 * Allows modular registration and retrieval of domain services,
 * decoupling high-level consumers from concrete infrastructure implementations.
 */
export interface ServiceContainer {
  readonly platform: IPlatformBridge;
  readonly mods: IModService;
  readonly engines: IEngineService;
  readonly process: IProcessLauncher;
  readonly storage: IStorageService;
  readonly settings: ISettingsService;
  readonly window: IWindowService;
  readonly notification: INotificationService;
  readonly taskMonitor: ITaskMonitor;
}

/**
 * Creates an instantiated service container configured with the provided platform bridge or defaults.
 */
export function createServiceContainer(customBridge?: IPlatformBridge): ServiceContainer {
  const activePlatform = customBridge || platform;

  return {
    platform: activePlatform,
    mods: new ModService(activePlatform),
    engines: new EngineService(activePlatform),
    process: new ProcessService(activePlatform),
    storage: new StorageService(activePlatform),
    settings: new SettingsService(activePlatform),
    window: activePlatform.window,
    notification: activePlatform.notification,
    taskMonitor,
  };
}

/**
 * Global default service container.
 */
export const container: ServiceContainer = createServiceContainer();
