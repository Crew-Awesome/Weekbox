import type { DiscordActivityPayload, IPlatformBridge, PlatformType } from './types';

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

  sendPing(message: string): void {
    console.log(`[WebAdapter] Ping simulado: ${message}`);
    setTimeout(() => {
      this.emitLocalEvent('pingResult', `[Simulación Web] Pong a: "${message}"`);
    }, 100);
  }

  runLongTask(steps: number = 5): void {
    console.log(`[WebAdapter] Tarea pesada simulada de ${steps} pasos`);
    let current = 1;
    const interval = setInterval(() => {
      this.emitLocalEvent('pingResult', `[Simulación Web] Tarea ${current}/${steps}`);
      if (current >= steps) {
        clearInterval(interval);
      }
      current++;
    }, 500);
  }

  setDiscordActivity(activity: DiscordActivityPayload): void {
    console.log('[WebAdapter] Discord RPC simulado:', activity);
  }

  triggerFeedback(type: 'success' | 'warning' | 'error' | 'light'): void {
    console.log(`[WebAdapter] Feedback táctil simulado: ${type}`);
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
