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
  return (Array.isArray(entries) ? entries : []).filter((entry) => entry?.entry !== "." && entry?.entry !== "..");
}

function getModFolderName(mod) {
  return mod.folderName || sanitizePathSegment(mod.name);
}

function getEngineModFolderName(mod) {
  const name = mod.engineFolderName || getModFolderName(mod);
  // Psych Online loads folder names directly.  Retain a stable mod ID suffix
  // when an imported folder would otherwise collide with another mod.
  if (mod.engineId === "psychonline" && !mod.engineFolderName && mod.id) {
    return `${name}--${String(mod.id).replace(/[^a-z0-9_-]/gi, "_")}`;
  }
  return name;
}

function normalizeFolderName(value) {
  return sanitizePathSegment(value).replace(/\s+/g, " ").trim().toLocaleLowerCase();
}

export { getParentPath, sanitizePathSegment, getRealEntries, getModFolderName, getEngineModFolderName, sanitizeModFolderName, normalizeFolderName };
