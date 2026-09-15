import { platform } from "@platform";
import { fs } from "./backend/fs";
import { http } from "./backend/http";
import { windowApi } from "./backend/window";
import { osApi } from "./backend/os";
import { notificationApi } from "./backend/notification";
import { gameBananaApi } from "./services/gamebanana";
import { translateModText } from "./services/translation";
import { fetchEngineReleases } from "./services/engines/engine-releases";
import { container } from "./container";
import { modService } from "./services/mods/mod";
import { engineService } from "./services/engines/engine";
import { processService } from "./services/process/process";
import { storageService } from "./services/storage/storage";
import { settingsService } from "./services/settings/settings";

export * from "@platform";
export * from "@contracts";
export * from "./container";
export * from "./services/gamebanana/types";
export * from "./services/translation";
export * from "./services/engines/engine-releases";
export * from "./services/mods/mod";
export * from "./services/engines/engine";
export * from "./services/process/process";
export * from "./services/storage/storage";
export * from "./services/settings/settings";

/**
 * @description API global para acceder al Núcleo (Core) de Weekbox.
 * Agrupa la lógica de bajo nivel, adaptadores de plataforma, sistema de archivos y servicios desacoplados (SOLID).
 */
const Core = {
  /**
   * @description Adaptador principal de la plataforma (detecta Neutralino o Web automáticamente).
   * Implementa IPlatformBridge componiendo interfaces segregadas para máxima compatibilidad (ISP / LSP).
   */
  platform,
  Platform: platform,

  /**
   * @description Contenedor de Inversión de Dependencias (DIP).
   */
  container,

  /**
   * @description Módulos y utilidades del sistema de archivos unificado (Neutralino + Node).
   */
  fs,
  http,
  window: windowApi,
  os: osApi,
  notification: notificationApi,

  /**
   * @description Servicios de dominio segregados y externos (SRP / OCP / ISP).
   */
  services: {
    container,
    mods: modService,
    storage: storageService,
    process: processService,
    settings: settingsService,
    gamebanana: gameBananaApi,
    translation: {
      translateModText,
    },
    engines: {
      fetchEngineReleases,
      service: engineService,
      downloadEngine: engineService.downloadEngine.bind(engineService),
      isEngineInstalled: engineService.isEngineInstalled.bind(engineService),
      openEngineFolder: engineService.openEngineFolder.bind(engineService),
      getInstalledEngines: engineService.getInstalledEngines.bind(engineService),
      registerInstalledEngine: engineService.registerInstalledEngine.bind(engineService),
      uninstallEngine: engineService.uninstallEngine.bind(engineService),
    },
    backend: {
      call: platform.call.bind(platform),
    },
  },
};

export default Core;
