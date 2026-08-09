import type { DiscordActivityPayload, IPlatformBridge, PlatformType } from './types';

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

      /** Escucha el resultado de pings desde la extensión Node.js */
      neutralino.events.on('pingResult', (event: { detail: any }) => {
        this.emitLocalEvent('pingResult', event.detail);
      });

      /** Notifica cuando el entorno nativo de Neutralino está listo */
      neutralino.events.on('ready', () => {
        this._isReady = true;
        this.emitLocalEvent('ready', true);
      });
    }
  }

  sendPing(message: string): void {
    window.NODE?.run('ping', message);
  }

  runLongTask(steps: number = 5): void {
    window.NODE?.run('longRun', steps);
  }

  setDiscordActivity(activity: DiscordActivityPayload): void {
    window.NODE?.run('setActivity', activity);
  }

  triggerFeedback(type: 'success' | 'warning' | 'error' | 'light'): void {
    console.log(`[DesktopAdapter] Feedback nativo ejecutado: ${type}`);
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
