import type { BackendOperation, BackendResult } from "../backend/types";

/**
 * Event-driven communication contract (ISP).
 */
export interface IPlatformEvents {
  /**
   * Subscribes a listener to platform or backend events.
   * @returns Unsubscribe callback.
   */
  onEvent(eventName: string, listener: (data: any) => void): () => void;

  /**
   * Emits an event internally to local subscribers.
   */
  emitLocalEvent(eventName: string, data: any): void;
}

/**
 * Low-level backend communication transport contract (ISP).
 */
export interface IPlatformTransport {
  /**
   * Dispatches a typed backend operation through the platform bridge.
   */
  call<Operation extends BackendOperation>(
    operation: Operation,
    params?: unknown,
    signal?: AbortSignal,
    timeoutMs?: number
  ): Promise<BackendResult<Operation>>;
}
