export function formatBytes(bytes) {
  const value = Number(bytes);
  if (!value) return "Unknown size";
  const units = ["Bytes", "KB", "MB", "GB", "TB"];
  const index = Math.floor(Math.log(value) / Math.log(1024));
  return `${Number((value / 1024 ** index).toFixed(2))} ${units[index]}`;
}

export function timeAgo(value) {
  const seconds = Math.max(
    0,
    Math.floor((Date.now() - Date.parse(value)) / 1000),
  );
  const units = [
    [31536000, "y"],
    [2592000, "mo"],
    [86400, "d"],
    [3600, "h"],
    [60, "m"],
  ];
  const match = units.find(([amount]) => seconds >= amount);
  return match ? `${Math.floor(seconds / match[0])}${match[1]}` : `${seconds}s`;
}

export function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
