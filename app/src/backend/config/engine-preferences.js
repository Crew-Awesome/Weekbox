import { appSettings } from "../core/system/settings.service.js";

export const DEFAULT_ENGINE_ORDER = [
  "vslice",
  "codename",
  "psych",
  "pslice",
  "fpsplus",
  "psychonline",
];

function readJsonSetting(key, fallback) {
  try {
    const value = JSON.parse(appSettings.get(key));
    return value && typeof value === "object" ? value : fallback;
  } catch {
    return fallback;
  }
}

function readEngineOrder() {
  const preferences = readJsonSetting("engineVersionPreferences", {});
  if (Array.isArray(preferences.engineOrder)) return preferences.engineOrder;
  try {
    const legacy = JSON.parse(
      localStorage.getItem("weekbox_engine_order") || "[]",
    );
    if (!Array.isArray(legacy)) return [];
    preferences.engineOrder = legacy;
    appSettings.set("engineVersionPreferences", JSON.stringify(preferences));
    return legacy;
  } catch {
    return [];
  }
}

export function getEngineOrder(availableIds = DEFAULT_ENGINE_ORDER) {
  const available = [...new Set(availableIds)];
  const saved = [...new Set(readEngineOrder())];
  return [...new Set([...saved, ...DEFAULT_ENGINE_ORDER, ...available])].filter(
    (id) => available.includes(id),
  );
}

// who would even remember me if i died one day
// all it is, all i am
// a annoyance to a lot
// and i wish to not be what most people think i am
// but im just forgetable
// i will never be happy :c

export function setEngineOrder(order) {
  const preferences = readJsonSetting("engineVersionPreferences", {});
  preferences.engineOrder = [...new Set(order)];
  appSettings.set("engineVersionPreferences", JSON.stringify(preferences));
}

export function getEngineVersionOrder(engineId, versions) {
  const available = [...new Set(versions)];
  const preferences = readJsonSetting("engineVersionPreferences", {});
  const saved = Array.isArray(preferences[engineId]?.order)
    ? preferences[engineId].order
    : [];
  return [...new Set([...saved, ...available])].filter((version) =>
    available.includes(version),
  );
}

export function setEngineVersionOrder(engineId, order) {
  const preferences = readJsonSetting("engineVersionPreferences", {});
  preferences[engineId] = {
    ...preferences[engineId],
    order: [...new Set(order)],
  };
  appSettings.set("engineVersionPreferences", JSON.stringify(preferences));
}

export function getPreferredEngineVersion(engineId, versions) {
  const orderedVersions = getEngineVersionOrder(engineId, versions);
  const preferences = readJsonSetting("engineVersionPreferences", {});
  const preferred = preferences[engineId]?.preferred;
  return orderedVersions.includes(preferred)
    ? preferred
    : orderedVersions[0] || null;
}

export function setPreferredEngineVersion(engineId, version) {
  const preferences = readJsonSetting("engineVersionPreferences", {});
  preferences[engineId] = {
    ...preferences[engineId],
    preferred: version || null,
  };
  appSettings.set("engineVersionPreferences", JSON.stringify(preferences));
}

export function getEngineVersionName(engineId, version, fallback) {
  const preferences = readJsonSetting("engineVersionPreferences", {});
  const name = preferences[engineId]?.names?.[version];
  return typeof name === "string" && name.trim() ? name.trim() : fallback;
}

export function setEngineVersionName(engineId, version, name, fallback) {
  const preferences = readJsonSetting("engineVersionPreferences", {});
  const enginePreferences = preferences[engineId] || {};
  const names = { ...(enginePreferences.names || {}) };
  const trimmedName = String(name || "")
    .trim()
    .slice(0, 80);
  if (!trimmedName || trimmedName === fallback) delete names[version];
  else names[version] = trimmedName;
  if (Object.keys(names).length) enginePreferences.names = names;
  else delete enginePreferences.names;
  preferences[engineId] = enginePreferences;
  appSettings.set("engineVersionPreferences", JSON.stringify(preferences));
}
