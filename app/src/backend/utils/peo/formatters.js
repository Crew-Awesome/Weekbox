import {
  formatBytes as formatByteValue,
  formatTimeAgo,
} from "../formatters.js";

export function formatBytes(bytes) {
  return formatByteValue(bytes, 2, "Unknown size");
}

export function timeAgo(value) {
  return formatTimeAgo((Date.now() - Date.parse(value)) / 1000, "N/A");
}

export function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
