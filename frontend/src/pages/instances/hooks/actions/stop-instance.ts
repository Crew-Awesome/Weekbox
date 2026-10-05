import { useProcessStore } from "../../../../store";

/**
 * Handles stopping an active game or engine process by its instance key.
 */
export async function stopInstance(currentInstanceKey: string): Promise<void> {
  if (!currentInstanceKey) return;
  await useProcessStore.getState().stopInstance(currentInstanceKey);
}
