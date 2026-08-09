import type { IPlatformBridge } from './types';
import { DesktopAdapter } from './desktop.adapter';
import { MobileAdapter } from './mobile.adapter';
import { WebAdapter } from './web.adapter';

/**
 * Detecta el entorno de ejecución actual y crea la instancia correspondiente del adaptador.
 * @returns {IPlatformBridge} Adaptador concreto para la plataforma activa.
 */
function createPlatformBridge(): IPlatformBridge {
  if (typeof window !== 'undefined') {
    /** Entorno Móvil (WebView de React Native) */
    if (typeof window.ReactNativeWebView !== 'undefined') {
      return new MobileAdapter();
    }

    /** Entorno de Escritorio (Neutralinojs / Node Extension) */
    if (typeof window.Neutralino !== 'undefined' || typeof window.NodeExtension !== 'undefined') {
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

export type * from './types';
export * from './desktop.adapter';
export * from './mobile.adapter';
export * from './web.adapter';
