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
function normaliseDocument(document2) {
  const defaults = createDefaultDocument();
  if (!document2 || typeof document2 !== "object") return defaults;
  const savedSettings = document2.settings;
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
  for (const [key, saved] of Object.entries(savedSettings)) {
    if (!(key in defaults.settings) && saved && typeof saved === "object") {
      defaults.settings[key] = saved;
    }
  }
  return defaults;
}
var SETTINGS_FILE_NAME,
  SETTINGS_SCHEMA_VERSION,
  LEGACY_PREFIX,
  SETTINGS_PATH_KEY,
  settingDefinitions,
  appSettings;

SETTINGS_FILE_NAME = "settings.json";
SETTINGS_SCHEMA_VERSION = 1;
LEGACY_PREFIX = "weekbox_setting_";
SETTINGS_PATH_KEY = "weekbox-settings-data-path-v2";
settingDefinitions = {
  language: { type: "string", defaultValue: "en" },
  firstRunLanguageSetupComplete: { type: "boolean", defaultValue: false },
  launchOnStartup: { type: "boolean", defaultValue: false },
  registerProtocolLinks: { type: "boolean", defaultValue: true },
  blurOutOfFocus: { type: "boolean", defaultValue: true },
  hideOnLaunch: { type: "boolean", defaultValue: false },
  autoStartAfterDownload: { type: "boolean", defaultValue: false },
  multithreadDownloads: { type: "boolean", defaultValue: true },
  multithreadStorageMoves: { type: "boolean", defaultValue: true },
  storagePath: { type: "string", defaultValue: null, nullable: true },
  storageMoveRecommendationDismissed: { type: "boolean", defaultValue: false },
  checkUpdatesOnStartup: { type: "boolean", defaultValue: true },
  checkUpdatesInBackground: { type: "boolean", defaultValue: true },
  checkAppUpdatesOnStartup: { type: "boolean", defaultValue: true },
  wineCommand: { type: "string", defaultValue: null, nullable: true },
  firstRunStorageSetupComplete: { type: "boolean", defaultValue: false },
};

appSettings = {
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
      await Neutralino.storage
        .setData(SETTINGS_PATH_KEY, dataPath)
        .catch((error) =>
          console.warn(
            "WeekBox settings: native path storage unavailable.",
            error,
          ),
        );
      this.initialized = true;
    } catch (error) {
      console.warn("WeekBox settings: file storage is unavailable.", error);
    }
  },
  async load(dataPath) {
    if (typeof Neutralino === "undefined" || !dataPath) return false;
    const nextPath = `${dataPath}/${SETTINGS_FILE_NAME}`;
    try {
      const document2 = JSON.parse(
        await Neutralino.filesystem.readFile(nextPath),
      );
      this.document = normaliseDocument(document2);
      this.path = nextPath;
      return true;
    } catch {
      return false;
    }
  },
  async setDataPath(dataPath) {
    const nextPath = dataPath && `${dataPath}/${SETTINGS_FILE_NAME}`;
    if (!nextPath) return;
    if (this.path === nextPath) {
      await Neutralino.storage
        .setData(SETTINGS_PATH_KEY, dataPath)
        .catch(() => {});
      return;
    }
    const previousPath = this.path;
    this.path = nextPath;
    try {
      await this.write(nextPath);
    } catch (error) {
      this.path = previousPath;
      throw error;
    }
    await Neutralino.storage
      .setData(SETTINGS_PATH_KEY, dataPath)
      .catch((error) =>
        console.warn(
          "WeekBox settings: native path storage unavailable.",
          error,
        ),
      );
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
      } catch {}
    }
  },
  removeLegacySettings(keys) {
    for (const key of keys) localStorage.removeItem(key);
  },
  get(key) {
    const definition = settingDefinitions[key];
    if (!definition) return void 0;
    const saved = this.document.settings[key];
    return saved && isValidValue(definition, saved.value)
      ? saved.value
      : definition.defaultValue;
  },
  getLegacy(key) {
    const saved = this.document.settings[key];
    return saved && typeof saved === "object" ? saved.value : undefined;
  },
  set(key, value, { persist = true } = {}) {
    const definition = settingDefinitions[key];
    if (!definition) throw new Error(`Unknown setting: ${key}`);
    if (!isValidValue(definition, value)) {
      throw new TypeError(`Invalid value for setting: ${key}`);
    }
    this.document.settings[key] = { type: definition.type, value };
    if (this.initialized && persist) this.write().catch(() => {});
    document.dispatchEvent(
      new CustomEvent("settings-changed", { detail: { key, value } }),
    );
  },
  async write(path = this.path) {
    if (!path) return;
    const contents = `${JSON.stringify(this.document, null, 2)}
`;
    const previous = this.writeQueue;
    const next = previous
      .catch(() => {})
      .then(() => Neutralino.filesystem.writeFile(path, contents));
    const settled = next.catch(() => {});
    this.writeQueue = settled;
    settled.finally(() => {
      if (this.writeQueue === settled) this.writeQueue = Promise.resolve();
    });
    return next;
  },
};

export { appSettings };
