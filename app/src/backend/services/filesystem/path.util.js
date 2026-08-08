function sanitizePathSegment(value) {
  return String(value || "")
    .replace(/[<>:"/\\|?*]+/g, "")
    .trim();
}

function sanitizeModFolderName(value, fallback = "Mod") {
  const asciiName = sanitizePathSegment(value)
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return asciiName || fallback;
}

function getParentPath(path) {
  return path.slice(0, Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\")));
}

function normalizeComparablePath(path) {
  return String(path || "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/")
    .replace(/\/$/, "")
    .toLocaleLowerCase();
}

function pathsOverlap(left, right) {
  const first = normalizeComparablePath(left);
  const second = normalizeComparablePath(right);
  return Boolean(
    first &&
    second &&
    (first === second ||
      first.startsWith(`${second}/`) ||
      second.startsWith(`${first}/`)),
  );
}

function getDistinctStorageParentPath(rootPath, executablePath) {
  const root = String(rootPath || "")
    .trim()
    .replace(/[\\/]+$/, "");
  if (!root) return "";
  const candidate = `${root}/WeekBoxData`;
  if (!pathsOverlap(candidate, executablePath)) return candidate;
  return `${root}/WeekBoxData-storage`;
}

function getStorageDestinationDecision(
  entries,
  { replaceExisting = false, repairingNestedStorage = false } = {},
) {
  const realEntries = getRealEntries(entries);
  const canRepairNestedStorage =
    repairingNestedStorage &&
    realEntries.length === 1 &&
    realEntries[0].type === "DIRECTORY" &&
    realEntries[0].entry.toLowerCase() === "weekbox";
  if (!realEntries.length || canRepairNestedStorage) {
    return { action: "use", canRepairNestedStorage };
  }
  return {
    action: replaceExisting ? "replace" : "reject",
    canRepairNestedStorage: false,
  };
}

function getRealEntries(entries) {
  return (Array.isArray(entries) ? entries : []).filter(
    (entry) => entry?.entry !== "." && entry?.entry !== "..",
  );
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
  return sanitizePathSegment(value)
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase();
}

export {
  getParentPath,
  normalizeComparablePath,
  pathsOverlap,
  getDistinctStorageParentPath,
  getStorageDestinationDecision,
  sanitizePathSegment,
  getRealEntries,
  getModFolderName,
  getEngineModFolderName,
  sanitizeModFolderName,
  normalizeFolderName,
};
