function sanitizePathSegment(value) {
  return String(value || "").replace(/[<>:"/\\|?*]+/g, "").trim();
}

function sanitizeModFolderName(value, fallback = "Mod") {
  const asciiName = sanitizePathSegment(value).normalize("NFKD").replace(/[^\x20-\x7E]/g, "").replace(/\s+/g, " ").trim();
  return asciiName || fallback;
}

function getParentPath(path) {
  return path.slice(0, Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\")));
}

function getRealEntries(entries) {
  return entries.filter((entry) => entry.entry !== "." && entry.entry !== "..");
}

function getModFolderName(mod) {
  return mod.folderName || sanitizePathSegment(mod.name);
}

function getEngineModFolderName(mod) {
  return mod.engineFolderName || getModFolderName(mod);
}

export { getParentPath, sanitizePathSegment, getRealEntries, getModFolderName, getEngineModFolderName, sanitizeModFolderName };
