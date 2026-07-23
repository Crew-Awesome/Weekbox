const SETTINGS_FILE_NAME = "settings.json";
const SETTINGS_SCHEMA_VERSION = 1;
const LEGACY_PREFIX = "weekbox_setting_";
const SETTINGS_PATH_KEY = "weekbox-settings-data-path";

/**
 * Add new settings here. The type is stored alongside each value in the JSON
 * file so the format can grow beyond booleans and strings without a migration.
 */
const settingDefinitions = {
  launchOnStartup: { type: "boolean", defaultValue: false },
  registerProtocolLinks: { type: "boolean", defaultValue: true },
  blurOutOfFocus: { type: "boolean", defaultValue: true },
  hideOnLaunch: { type: "boolean", defaultValue: false },
  autoStartAfterDownload: { type: "boolean", defaultValue: false },
  multithreadDownloads: { type: "boolean", defaultValue: true },
  multithreadStorageMoves: { type: "boolean", defaultValue: true },
  storageParentPath: { type: "string", defaultValue: null, nullable: true },
  storageMoveRecommendationDismissed: { type: "boolean", defaultValue: false },
  checkUpdatesOnStartup: { type: "boolean", defaultValue: true },
  checkUpdatesInBackground: { type: "boolean", defaultValue: true },
  checkAppUpdatesOnStartup: { type: "boolean", defaultValue: true },
  diagnosticReportingEnabled: { type: "boolean", defaultValue: true },
  diagnosticReportingConsentAnswered: { type: "boolean", defaultValue: false },
  firstRunStorageSetupComplete: { type: "boolean", defaultValue: false },
};

function isValidValue(definition, value) {
  if (value === null) return Boolean(definition.nullable);
  return typeof value === definition.type;
}

function createDefaultDocument() {
  return {
    version: SETTINGS_SCHEMA_VERSION,
    settings: Object.fromEntries(
      Object.entries(settingDefinitions).map(([key, definition]) => [
        key,
        { type: definition.type, value: definition.defaultValue },
      ]),
    ),
  };
}

function normaliseDocument(document) {
  const defaults = createDefaultDocument();
  if (!document || typeof document !== "object") return defaults;

  const savedSettings = document.settings;
  if (!savedSettings || typeof savedSettings !== "object") return defaults;

  for (const [key, definition] of Object.entries(settingDefinitions)) {
    const saved = savedSettings[key];
    if (
      saved &&
      saved.type === definition.type &&
      isValidValue(definition, saved.value)
    ) {
      defaults.settings[key] = { type: definition.type, value: saved.value };
    }
  }

  // Preserve settings written by a newer version of WeekBox.
  for (const [key, saved] of Object.entries(savedSettings)) {
    if (!(key in defaults.settings) && saved && typeof saved === "object") {
      defaults.settings[key] = saved;
    }
  }

  return defaults;
}

export const appSettings = {
  defaultSettings: Object.fromEntries(
    Object.entries(settingDefinitions).map(([key, definition]) => [
      key,
      definition.defaultValue,
    ]),
  ),
  document: createDefaultDocument(),
  path: null,
  initialized: false,
  writeQueue: Promise.resolve(),

  async resolveDataPath(defaultDataPath) {
    try {
      return (
        (await Neutralino.storage.getData(SETTINGS_PATH_KEY)) || defaultDataPath
      );
    } catch {
      return defaultDataPath;
    }
  },

  async init(dataPath) {
    if (this.initialized || typeof Neutralino === "undefined") return;
    if (!dataPath) {
      console.warn("WeekBox settings: data path is unavailable.");
      return;
    }

    this.path = `${dataPath}/${SETTINGS_FILE_NAME}`;

    try {
      await Neutralino.filesystem.createDirectory(dataPath).catch(async () => {
        await Neutralino.filesystem.getStats(dataPath);
      });

      let fileExists = true;
      try {
        this.document = normaliseDocument(
          JSON.parse(await Neutralino.filesystem.readFile(this.path)),
        );
      } catch (error) {
        fileExists = false;
        if (error?.code && error.code !== "NE_FS_FILRDER") {
          console.warn(
            "WeekBox settings: could not read settings file.",
            error,
          );
        }
        this.document = createDefaultDocument();
      }

      const legacyKeys = this.getLegacyKeys();
      if (!fileExists) this.migrateLegacySettings(legacyKeys);
      await this.write();
      this.removeLegacySettings(legacyKeys);
      await Neutralino.storage.setData(SETTINGS_PATH_KEY, dataPath);
      this.initialized = true;
    } catch (error) {
      console.warn("WeekBox settings: file storage is unavailable.", error);
    }
  },

  async setDataPath(dataPath) {
    if (!dataPath || this.path === `${dataPath}/${SETTINGS_FILE_NAME}`) return;
    this.path = `${dataPath}/${SETTINGS_FILE_NAME}`;
    await this.write();
    await Neutralino.storage.setData(SETTINGS_PATH_KEY, dataPath);
  },

  getLegacyKeys() {
    return Array.from({ length: localStorage.length }, (_, index) =>
      localStorage.key(index),
    ).filter((key) => key?.startsWith(LEGACY_PREFIX));
  },

  migrateLegacySettings(keys) {
    for (const key of keys) {
      const settingKey = key.slice(LEGACY_PREFIX.length);
      const definition = settingDefinitions[settingKey];
      if (!definition) continue;
      try {
        const value = JSON.parse(localStorage.getItem(key));
        if (isValidValue(definition, value)) {
          this.document.settings[settingKey] = { type: definition.type, value };
        }
      } catch {
        // Invalid legacy values are replaced by their declared defaults.
      }
    }
  },

  removeLegacySettings(keys) {
    for (const key of keys) localStorage.removeItem(key);
  },

  get(key) {
    const definition = settingDefinitions[key];
    if (!definition) return undefined;
    const saved = this.document.settings[key];
    return saved && isValidValue(definition, saved.value)
      ? saved.value
      : definition.defaultValue;
  },

  set(key, value) {
    const definition = settingDefinitions[key];
    if (!definition) throw new Error(`Unknown setting: ${key}`);
    if (!isValidValue(definition, value)) {
      throw new TypeError(`Invalid value for setting: ${key}`);
    }

    this.document.settings[key] = { type: definition.type, value };
    if (this.initialized) this.write().catch(() => {});
    document.dispatchEvent(
      new CustomEvent("settings-changed", { detail: { key, value } }),
    );
  },

  async write() {
    if (!this.path) return;
    const contents = `${JSON.stringify(this.document, null, 2)}\n`;
    this.writeQueue = this.writeQueue
      .catch(() => {})
      .then(() => Neutralino.filesystem.writeFile(this.path, contents));
    return this.writeQueue;
  },
};
