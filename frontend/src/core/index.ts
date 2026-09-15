import { platform } from "./platform";
import { fs } from "./backend/fs";
import { http } from "./backend/http";
import { windowApi } from "./backend/window";
import { osApi } from "./backend/os";
import { notificationApi } from "./backend/notification";
import { gameBananaApi } from "./services/gamebanana";
import { translateModText } from "./services/translation";
import { fetchEngineReleases } from "./services/engines/engine-releases.service";

export * from "./services/gamebanana/types";
export * from "./services/translation";
export * from "./services/engines/engine-releases.service";

/**
 * @description API global para acceder al Núcleo (Core) de Weekbox.
 * Agrupa la lógica de bajo nivel, adaptadores de plataforma, sistema de archivos y servicios externos.
 */
const Core = {
  /**
   * @description Adaptador principal de la plataforma (detecta Neutralino o Web automáticamente).
   */
  platform,
  Platform: platform,


  /**
   * @description Módulos y utilidades del sistema de archivos unificado (Neutralino + Node).
   */
  fs,
  http,
  window: windowApi,
  os: osApi,
  notification: notificationApi,

  /**
   * @description Servicios externos para consumo de APIs (GameBanana, GameJolt, etc.).
   */
  services: {
    gamebanana: gameBananaApi,
    translation: {
      translateModText,
    },
    engines: {
      fetchEngineReleases,
    },
    backend: {
      call: platform.call.bind(platform),
    },
  },
};

export default Core;
