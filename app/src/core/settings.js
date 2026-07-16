export const appSettings = {
  defaultSettings: {
    launchOnStartup: false,
    blurOutOfFocus: true,
    hideOnLaunch: false,
    autoStartAfterDownload: false,
    multithreadDownloads: true,
    storageParentPath: null,
    checkUpdatesOnStartup: true,
    checkUpdatesInBackground: true,
  },
  get(key) {
    try {
      const saved = localStorage.getItem(`weekbox_setting_${key}`);
      return saved !== null ? JSON.parse(saved) : this.defaultSettings[key];
    } catch {
      return this.defaultSettings[key];
    }
  },
  set(key, value) {
    localStorage.setItem(`weekbox_setting_${key}`, JSON.stringify(value));
    document.dispatchEvent(
      new CustomEvent("settings-changed", { detail: { key, value } }),
    );
  },
};
