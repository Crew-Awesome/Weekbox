export const storageBridge = {
  async init() {
    const isNeutralino = typeof Neutralino !== "undefined";
    if (!isNeutralino) return;

    try {
      const keys = await Neutralino.storage.getKeys();
      for (const key of keys) {
        try {
          const value = await Neutralino.storage.getData(key);
          Storage.prototype.setItem.call(window.localStorage, key, value);
        } catch (err) {
          console.warn(`Could not read key: ${key}`, err);
        }
      }
      console.log("WeekBox: LocalStorage synced correctly.");
    } catch (err) {
      console.warn("Neutralino storage empty or unavailable.");
    }

    const originalSet = Storage.prototype.setItem;
    const originalRemove = Storage.prototype.removeItem;
    const originalClear = Storage.prototype.clear;
    const isNativeStorageKey = (key) => /^[a-zA-Z-_0-9]{1,50}$/.test(key);

    window.localStorage.setItem = function (key, value) {
      originalSet.call(window.localStorage, key, value);
      if (!isNativeStorageKey(key)) return;
      Neutralino.storage
        .setData(key, String(value))
        .catch((e) => console.warn(e));
    };

    window.localStorage.removeItem = function (key) {
      originalRemove.call(window.localStorage, key);
      if (!isNativeStorageKey(key)) return;
      Neutralino.storage.removeData(key).catch((e) => console.warn(e));
    };

    window.localStorage.clear = function () {
      originalClear.call(window.localStorage);
      Neutralino.storage
        .getKeys()
        .then((keys) => {
          keys.forEach((k) => Neutralino.storage.removeData(k));
        })
        .catch((e) => console.warn(e));
    };
  },
};
