import type { IPlatformBridge } from './types';
import { DesktopAdapter } from './desktop.adapter';
import { WebAdapter } from './web.adapter';

/**
 * Detecta el entorno de ejecución actual y crea la instancia correspondiente del adaptador.
 * @returns {IPlatformBridge} Adaptador concreto para la plataforma activa.
 */
function createPlatformBridge(): IPlatformBridge {
  if (typeof window !== 'undefined') {
    /** Entorno de Escritorio (Neutralinojs / Node Extension) */
    if (typeof (window as any).NL_PORT !== 'undefined' || typeof window.Neutralino !== 'undefined' || typeof window.NodeExtension !== 'undefined') {
      return new DesktopAdapter();
    }
  }

  /** Entorno Web estándar / Fallback */
  return new WebAdapter();
}

/**
 * Instancia singleton global del Platform Bridge para toda la aplicación.
 */
export const platform: IPlatformBridge = createPlatformBridge();

// Inicializamos la plataforma automáticamente para simplificar su uso
platform.initialize();

export type * from './types';
export * from './desktop.adapter';
export * from './web.adapter';
