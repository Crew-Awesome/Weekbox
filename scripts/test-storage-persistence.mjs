import assert from "node:assert/strict";
import { appSettings } from "../app/src/backend/core/system/settings.service.js";
import { getDistinctStorageParentPath } from "../app/src/backend/services/filesystem/path.util.js";

globalThis.document = { dispatchEvent() {} };
globalThis.CustomEvent ??= class CustomEvent {
  constructor(type, init) {
    this.type = type;
    this.detail = init?.detail;
  }
};

const writes = [];
globalThis.Neutralino = {
  filesystem: {
    async writeFile(path, contents) {
      await new Promise((resolve) => setTimeout(resolve, 1));
      writes.push({ path, contents });
    },
  },
};

const defaultParent = getDistinctStorageParentPath(
  "C:/Users/Administrator/AppData/Local",
  "C:/Users/Administrator/AppData/Local/WeekBox/WeekBox.exe",
);
const destination = `${defaultParent}/WeekBox`;

appSettings.initialized = true;
appSettings.path = `${destination}/data/settings.json`;
appSettings.set("storageParentPath", defaultParent);
await appSettings.write();

const saved = JSON.parse(writes.at(-1).contents);
assert.equal(defaultParent, "C:/Users/Administrator/AppData/Local/WeekBoxData");
assert.equal(saved.settings.storageParentPath.value, defaultParent);
assert.equal(destination, "C:/Users/Administrator/AppData/Local/WeekBoxData/WeekBox");

console.log("Storage persistence regression check passed.");
