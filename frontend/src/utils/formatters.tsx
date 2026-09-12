const BYTE_UNITS = ["Bytes", "KB", "MB", "GB", "TB"] as const;
const TIME_UNITS: [number, string][] = [
  [31536000, "y"],
  [2592000, "mo"],
  [86400, "d"],
  [3600, "h"],
  [60, "m"],
];

/**
 * Formats byte values into human-readable strings (e.g. "12.5 MB").
 */
export function formatBytes(bytes: number | string | null | undefined, decimals = 2, fallback = "0 Bytes"): string {
  const value = Number(bytes);
  if (!value) return fallback;
  const precision = decimals < 0 ? 0 : decimals;
  const index = Math.floor(Math.log(value) / Math.log(1024));
  return `${parseFloat((value / 1024 ** index).toFixed(precision))} ${BYTE_UNITS[index] ?? "Bytes"}`;
}

/**
 * Formats elapsed seconds into concise relative time strings (e.g. "2h", "15m").
 */
export function formatTimeAgo(seconds: number | null | undefined, fallback = "N/A", inclusive = true): string {
  if (typeof seconds !== "number" || !Number.isFinite(seconds)) return fallback;
  const elapsed = Math.max(0, Math.floor(seconds));
  const match = TIME_UNITS.find(([amount]) =>
    inclusive ? elapsed >= amount : elapsed / amount > 1,
  );
  return match ? `${Math.floor(elapsed / match[0])}${match[1]}` : `${elapsed}s`;
}

