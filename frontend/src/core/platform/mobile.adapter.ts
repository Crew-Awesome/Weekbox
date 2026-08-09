import type { DiscordActivityPayload, IPlatformBridge, PlatformType } from './types';

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

  /**
   * Configura el listener para recibir mensajes enviados desde React Native hacia el WebView.
   */
  initialize(): void {
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

    /** Notifica que el adaptador móvil está listo */
    setTimeout(() => {
      this.emitLocalEvent('ready', true);
    }, 50);
  }

  /**
   * Envía un mensaje estructurado hacia la aplicación nativa de React Native.
   * @param {string} type - Tipo de acción.
   * @param {*} [payload] - Datos adjuntos.
   */
  private sendToHost(type: string, payload?: any): void {
    if (window.ReactNativeWebView?.postMessage) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type, payload }));
    } else {
      console.warn('[MobileAdapter] ReactNativeWebView no disponible para enviar mensaje.');
    }
  }

  sendPing(message: string): void {
    this.sendToHost('PING', { message });
  }

  runLongTask(steps: number = 5): void {
    this.sendToHost('LONG_TASK', { steps });
  }

  setDiscordActivity(_activity: DiscordActivityPayload): void {
    /** En dispositivos móviles, Discord Rich Presence nativo se omite de forma segura */
    console.info('[MobileAdapter] Discord RPC no aplicable en entorno móvil.');
  }

  triggerFeedback(type: 'success' | 'warning' | 'error' | 'light'): void {
    this.sendToHost('HAPTIC_FEEDBACK', { type });
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
