import React, { createContext, useContext, useMemo } from "react";
import type { ReactNode } from "react";
import { container, type ServiceContainer } from "./container";
import type { IPlatformBridge } from "@platform";
import type {
  IModService,
  IEngineService,
  IProcessLauncher,
  IStorageService,
  ISettingsService,
  IWindowControls,
  IWindowService,
  INotificationService,
  ITaskMonitor,
} from "@contracts";

/**
 * Dependency Injection Context for Core Domain Services.
 */
export const ServicesContext = createContext<ServiceContainer>(container);

export interface ServicesProviderProps {
  children: ReactNode;
  container?: ServiceContainer;
}

/**
 * Provides the ServiceContainer to React component hierarchy (DIP).
 */
export const ServicesProvider: React.FC<ServicesProviderProps> = ({
  children,
  container: customContainer,
}) => {
  const activeContainer = useMemo(() => customContainer || container, [customContainer]);

  return (
    <ServicesContext.Provider value={activeContainer}>
      {children}
    </ServicesContext.Provider>
  );
};

/**
 * Hook to access the full DI service container.
 */
export function useServices(): ServiceContainer {
  return useContext(ServicesContext);
}

/**
 * Hook to access the platform bridge.
 */
export function usePlatform(): IPlatformBridge {
  return useServices().platform;
}

/**
 * Hook to access the Mod management service (ISP).
 */
export function useModService(): IModService {
  return useServices().mods;
}

/**
 * Hook to access the Engine management service (ISP).
 */
export function useEngineService(): IEngineService {
  return useServices().engines;
}

/**
 * Hook to access the Process launcher service (ISP).
 */
export function useProcessLauncher(): IProcessLauncher {
  return useServices().process;
}

/**
 * Hook to access the Storage management service (ISP).
 */
export function useStorageService(): IStorageService {
  return useServices().storage;
}

/**
 * Hook to access the Settings persistence service (ISP).
 */
export function useSettingsService(): ISettingsService {
  return useServices().settings;
}

/**
 * Hook to access window controls (minimize, maximize, close) without depending on geometry/display (ISP).
 */
export function useWindowControls(): IWindowControls {
  return useServices().window;
}

/**
 * Hook to access the full window service (ISP).
 */
export function useWindowService(): IWindowService {
  return useServices().window;
}

/**
 * Hook to access the notification service (ISP).
 */
export function useNotificationService(): INotificationService {
  return useServices().notification;
}

/**
 * Hook to access the background task monitor.
 */
export function useTaskMonitor(): ITaskMonitor {
  return useServices().taskMonitor;
}
