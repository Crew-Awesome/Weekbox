import type { IPlatformBridge, PlatformType } from './types';

/**
 * Adaptador de plataforma para el entorno Móvil (Expo / React Native WebView).
 */
export class MobileAdapter implements IPlatformBridge {
  readonly platformName: PlatformType = 'mobile';
  private _isReady: boolean = true;
  private eventListeners: Map<string, Set<(data: any) => void>> = new Map();

  get isReady(): boolean {
    return this._isReady;
  }

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('message', (event: MessageEvent) => {
        try {
          const parsed = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
          if (parsed && parsed.type) {
            this.emitLocalEvent(parsed.type, parsed.payload);
          }
        } catch {
          /** Ignora mensajes no formateados en JSON */
        }
      });
    }
  }

  /**
   * Notifica que el adaptador móvil está listo
   */
  initialize(): void {
    setTimeout(() => {
      this.emitLocalEvent('ready', true);
    }, 50);
  }

  getVersion(): Promise<string> {
    return new Promise((resolve) => {
      let attempts = 0;
      
      const unsubscribe = this.onEvent('VERSION_RESULT', (version: string) => {
        unsubscribe();
        resolve(version);
      });

      const trySend = () => {
        try {
          if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'GET_VERSION' }));
            
            // Tiempo de espera para la respuesta
            setTimeout(() => {
              unsubscribe();
              resolve('1.0.0 (Fallback)');
            }, 500);
          } else if (attempts < 20) {
            attempts++;
            setTimeout(trySend, 100);
          } else {
            unsubscribe();
            resolve('1.0.0 (Fallback)');
          }
        } catch (e) {
          unsubscribe();
          resolve('1.0.0 (Fallback)');
        }
      };

      trySend();
    });
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
