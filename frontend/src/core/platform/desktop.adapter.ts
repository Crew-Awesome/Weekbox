import type { IPlatformBridge, PlatformType } from './types';
import neuConfig from '../../../../neutralino.config.json';

/**
 * Adaptador de plataforma para el entorno de Escritorio (Neutralinojs + Extensión Node.js).
 */
export class DesktopAdapter implements IPlatformBridge {
  readonly platformName: PlatformType = 'desktop';
  private _isReady: boolean = false;
  private eventListeners: Map<string, Set<(data: any) => void>> = new Map();

  get isReady(): boolean {
    return this._isReady;
  }

  /**
   * Inicializa la conexión con Neutralino y la extensión de Node.js.
   */
  initialize(): void {
    const neutralino = window.Neutralino;
    const NodeExt = window.NodeExtension;

    if (neutralino && NodeExt) {
      neutralino.init();
      window.NODE = new NodeExt(true);

      /** Listens for ping results from the Node.js extension */
      neutralino.events.on('pingResult', (event: { detail: any }) => {
        this.emitLocalEvent('pingResult', event.detail);
      });

      /** Notifies when the Neutralino native environment is ready */
      neutralino.events.on('ready', () => {
        this._isReady = true;
        this.emitLocalEvent('ready', true);
      });
    }
  }

  async getVersion(): Promise<string> {
    return neuConfig.version || '1.0.0';
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
