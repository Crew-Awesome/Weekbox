import { fsIoApi } from "./node/fs/fs-io.mjs";
import { archiveExtractorApi } from "./node/fs/archive-extractor.mjs";
import { storageMigratorApi } from "./node/fs/storage-migrator.mjs";
import { flattenFolder } from "./node/fs/flattener.mjs";
import { httpApi as APINodeHttp } from "./node/http/http.mjs";
import { deeplinkApi as APINodeDeeplink } from "./node/deeplink/deeplink.mjs";
import { winApi as APINodeWindow } from "./node/win/win.mjs";
import { notificationApi as APINodeNotification } from "./node/notification/notification.mjs";
import { processApi as APINodeProcess } from "./node/process/process-runner.mjs";
import { zombieManager } from "./node/zombie-manager.mjs";

let extContext = null;

zombieManager.start();

const setExtensionContext = (ext) => {
  extContext = ext;
  APINodeDeeplink.startServer(extContext);
  APINodeProcess.setExitCallback((data) => {
    if (extContext) {
      extContext.sendMessage("process:exit", data);
    }
  });
};

const callApi = async (namespace, method, params = {}) => {
  if (!extContext) throw new Error("Neutralino Extension context not available.");
  const response = await extContext.callApi(`${namespace}.${method}`, params);
  
  if (response && response.returnValue !== undefined) {
    return response.returnValue;
  }
  
  return response;
};

/**
 * Extensible Operations Registry (OCP).
 * Allows registering new domains and handlers without modifying the core dispatcher.
 */
const operationRegistry = new Map();

export function registerOperation(name, handler) {
  operationRegistry.set(name, handler);
}

export function registerOperations(ops) {
  for (const [name, handler] of Object.entries(ops)) {
    operationRegistry.set(name, handler);
  }
}

// 1. System domain
registerOperations({
  "system.ping": () => {
    zombieManager.ping();
    return { ok: true };
  },
  "system.suicide": () => {
    console.log("Suicide signal received. Exiting Node.js.");
    process.exit(0);
  },
  "deeplink.isPrimary": () => APINodeDeeplink.isPrimary,
});

// 2. File System atomic I/O domain
registerOperations({
  "fs.readDirectory": async ({ path }) => fsIoApi.readDirectory(path),
  "fs.readFile": async ({ path }) => fsIoApi.readFile(path),
  "fs.readBinaryFile": async ({ path }) => fsIoApi.readBinaryFile(path),
  "fs.writeFile": async ({ path, content }) => fsIoApi.writeFile(path, content),
  "fs.writeBinaryFile": async ({ path, content }) => fsIoApi.writeBinaryFile(path, content),
  "fs.remove": async ({ path }) => fsIoApi.remove(path),
  "fs.exists": async ({ path }) => fsIoApi.exists(path),
  "fs.getStats": async ({ path }) => fsIoApi.getStats(path),
  "fs.createDirectory": async ({ path }) => fsIoApi.createDirectory(path),
});

// 3. Archive extraction & flattening domain
registerOperations({
  "fs.extractArchive": async ({ archivePath, destFolder, progressId }, onProgress) =>
    archiveExtractorApi.extractArchive(archivePath, destFolder, (file) => {
      if (onProgress) {
        if (file === "__FLATTENING_START__") {
          onProgress({ progressId, status: "Flattening folder structure...", flattening: true });
        } else {
          onProgress({ currentFile: file, progressId, status: "Extracting archive..." });
        }
      }
    }),
  "fs.flattenFolder": async ({ path }) => flattenFolder(path),
});

// 4. HTTP networking domain
registerOperations({
  "http.fetchJson": async ({ url, options, signal }) => APINodeHttp.fetchJson({ url, options, signal }),
  "http.fetchText": async ({ url, options, signal }) => APINodeHttp.fetchText({ url, options, signal }),
  "http.downloadToFile": async ({ url, destPath, progressId, options, signal }, onProgress) =>
    APINodeHttp.downloadToFile({
      url,
      destPath,
      options,
      signal,
      onProgress: (downloaded, total) => onProgress({ downloaded, total, progressId }),
    }),
});

// 5. Window management domain
registerOperations({
  "window.minimize": async () => APINodeWindow.minimize(callApi),
  "window.maximize": async () => APINodeWindow.maximize(callApi),
  "window.unmaximize": async () => APINodeWindow.unmaximize(callApi),
  "window.isMaximized": async () => APINodeWindow.isMaximized(callApi),
  "window.setFullScreen": async () => APINodeWindow.setFullScreen(callApi),
  "window.exitFullScreen": async () => APINodeWindow.exitFullScreen(callApi),
  "window.show": async () => APINodeWindow.show(callApi),
  "window.hide": async () => APINodeWindow.hide(callApi),
  "window.focus": async () => APINodeWindow.focus(callApi),
  "window.move": async ({ x, y }) => APINodeWindow.move(callApi, { x, y }),
  "window.setSize": async ({ width, height }) => APINodeWindow.setSize(callApi, { width, height }),
  "window.getSize": async () => APINodeWindow.getSize(callApi),
  "window.getPosition": async () => APINodeWindow.getPosition(callApi),
  "window.getDisplays": async () => APINodeWindow.getDisplays(callApi),
  "window.close": async () => APINodeWindow.close(callApi),
  "window.center": async () => APINodeWindow.center(callApi),
});

// 6. OS notification domain
registerOperations({
  "notification.show": async ({ title, content, icon }) =>
    APINodeNotification.show(callApi, { title, content, icon }),
});

// 7. Process lifecycle runner domain
registerOperations({
  "process.launch": async ({ folderPath, executableName, instanceId, args, env, modFolderPath, modFolderPaths }) =>
    APINodeProcess.launch({ folderPath, executableName, instanceId, args, env, modFolderPath, modFolderPaths }),
  "process.kill": async ({ instanceId }) => APINodeProcess.kill(instanceId),
  "process.isAnyRunning": () => APINodeProcess.isAnyRunning(),
  "process.getRunning": () => APINodeProcess.getRunningList(),
  "process.isInstanceRunning": ({ instanceId }) => APINodeProcess.isInstanceRunning(instanceId),
});

// 8. Storage inspection & migration domain
registerOperations({
  "storage.validateFolder": async ({ targetPath, type }) =>
    storageMigratorApi.validateStorageFolder(targetPath, type),
  "storage.inspect": async ({ folderPath }) => storageMigratorApi.inspectStorage(folderPath),
  "storage.migrate": async ({ sourcePath, targetPath, selectedItemNames }, onProgress) =>
    storageMigratorApi.migrateStorage({ sourcePath, targetPath, selectedItemNames }, onProgress),
});

/**
 * Backward compatibility dictionary accessor.
 */
export const operations = new Proxy({}, {
  get(_, prop) {
    return operationRegistry.get(prop);
  },
  has(_, prop) {
    return operationRegistry.has(prop);
  },
  ownKeys() {
    return Array.from(operationRegistry.keys());
  },
  getOwnPropertyDescriptor(_, prop) {
    if (operationRegistry.has(prop)) {
      return { configurable: true, enumerable: true, value: operationRegistry.get(prop) };
    }
    return undefined;
  },
});

async function handleRequest(operation, params = {}, onProgress = null) {
  const handler = operationRegistry.get(operation);
  if (!handler) throw new Error(`Unknown backend operation: ${operation}`);
  return handler(params || {}, onProgress);
}

export { handleRequest, setExtensionContext };
