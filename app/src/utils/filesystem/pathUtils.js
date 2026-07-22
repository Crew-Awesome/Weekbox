export function sanitizePathSegment(value) {
  return String(value || "")
    .replace(/[<>:"/\\|?*]+/g, "")
    .trim();
}

// Mod folders are also passed to external extractors and engine command-line
// arguments. Keep those names portable across Windows tools that do not handle
// every Unicode path reliably.
export function sanitizeModFolderName(value, fallback = "Mod") {
  const asciiName = sanitizePathSegment(value)
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return asciiName || fallback;
}

export function getParentPath(path) {
  return path.slice(0, Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\")));
}

export function getRealEntries(entries) {
  return entries.filter((entry) => entry.entry !== "." && entry.entry !== "..");
}

export function getModFolderName(mod) {
  return mod.folderName || sanitizePathSegment(mod.name);
}
