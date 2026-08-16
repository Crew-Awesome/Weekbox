import { platform } from './platform';
import { fs } from './backend/fs';
import { http } from './backend/http';
import { gameBananaApi } from './services/gamebanana';

export * from './services/gamebanana/types';

/**
 * @description API global para acceder al Núcleo (Core) de Weekbox.
 * Agrupa la lógica de bajo nivel, adaptadores de plataforma, sistema de archivos y servicios externos.
 */
const Core = {
  /**
   * @description Adaptador principal de la plataforma (detecta Neutralino o Web automáticamente).
   */
  platform,
  
  /**
   * @description Módulos y utilidades del sistema de archivos unificado (Neutralino + Node).
   */
  fs,
  http,

  /**
   * @description Servicios externos para consumo de APIs (GameBanana, GameJolt, etc.).
   */
  services: {
    gamebanana: gameBananaApi,
    backend: {
      call: platform.call.bind(platform),
    },
  }
};

export default Core;
