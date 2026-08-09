import type { IPlatformBridge, PlatformType } from './types';

/**
 * Adaptador de plataforma para el entorno Web / Navegador estándar (desarrollo y pruebas en navegador sin Neutralino ni Expo).
 */
export class WebAdapter implements IPlatformBridge {
  readonly platformName: PlatformType = 'web';
  private _isReady: boolean = true;
  private eventListeners: Map<string, Set<(data: any) => void>> = new Map();

  get isReady(): boolean {
    return this._isReady;
  }

  initialize(): void {
    setTimeout(() => {
      this.emitLocalEvent('ready', true);
    }, 50);
  }



  onEvent(eventName: string, listener: (data: any) => void): () => void {
    if (!this.eventListeners.has(eventName)) {
      this.eventListeners.set(eventName, new Set());
    }
    this.eventListeners.get(eventName)!.add(listener);

    return () => {
      this.eventListeners.get(eventName)?.delete(listener);
    };
  }

  private emitLocalEvent(eventName: string, data: any): void {
    const listeners = this.eventListeners.get(eventName);
    if (listeners) {
      listeners.forEach((callback) => callback(data));
    }
  }
}
