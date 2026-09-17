/**
 * Normalizes and sanitizes engine IDs for filesystem operations.
 */
export function sanitizeEngineId(engineId?: string): string {
  return (engineId || "vslice")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .toLowerCase();
}

/**
 * Normalizes and sanitizes engine version strings for filesystem operations.
 */
export function sanitizeVersion(version?: string): string {
  return (version || "latest")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "");
}
