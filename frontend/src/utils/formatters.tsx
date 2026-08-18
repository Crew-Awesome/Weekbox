// @ts-nocheck
const BYTE_UNITS = ["Bytes", "KB", "MB", "GB", "TB"];
const TIME_UNITS = [
  [31536000, "y"],
  [2592000, "mo"],
  [86400, "d"],
  [3600, "h"],
  [60, "m"],
];

export function formatBytes(bytes, decimals = 2, fallback = "0 Bytes") {
  const value = Number(bytes);
  if (!value) return fallback;
  const precision = decimals < 0 ? 0 : decimals;
  const index = Math.floor(Math.log(value) / Math.log(1024));
  return `${parseFloat((value / 1024 ** index).toFixed(precision))} ${BYTE_UNITS[index]}`;
}

export function formatTimeAgo(seconds, fallback = "N/A", inclusive = true) {
  if (!Number.isFinite(seconds)) return fallback;
  const elapsed = Math.max(0, Math.floor(seconds));
  const match = TIME_UNITS.find(([amount]) =>
    inclusive ? elapsed >= amount : elapsed / amount > 1,
  );
  return match ? `${Math.floor(elapsed / match[0])}${match[1]}` : `${elapsed}s`;
}
