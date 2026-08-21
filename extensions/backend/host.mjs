import { fsApi as APINodeFileSystem } from "./node/fs/fs.mjs";
import { httpApi as APINodeHttp } from "./node/http/http.mjs";
import { deeplinkApi as APINodeDeeplink } from "./node/deeplink/deeplink.mjs";
import { winApi as APINodeWindow } from "./node/win/win.mjs";

import { zombieManager } from "./node/zombie-manager.mjs";

let extContext = null;

// Start the zombie manager
zombieManager.start();

const setExtensionContext = (ext) => {
  extContext = ext;
  APINodeDeeplink.startServer(extContext);
};

const callApi = async (namespace, method, params = {}) => {
  if (!extContext) throw new Error("Neutralino Extension context not available.");
  const response = await extContext.callApi(`${namespace}.${method}`, params);
  
  if (response && response.returnValue !== undefined) {
    return response.returnValue;
  }
  
  return response;
};

const operations = {
  "system.ping": () => {
    zombieManager.ping();
    return { ok: true };
  },
  "system.suicide": () => {
    console.log("Suicide signal received. Exiting Node.js.");
    process.exit(0);
  },
  "deeplink.isPrimary": () => APINodeDeeplink.isPrimary,
  "fs.readDirectory": async ({ path }) => APINodeFileSystem.readDirectory(path),
  "fs.readFile": async ({ path }) => APINodeFileSystem.readFile(path),
  "fs.readBinaryFile": async ({ path }) => APINodeFileSystem.readBinaryFile(path),
  "fs.writeFile": async ({ path, content }) => APINodeFileSystem.writeFile(path, content),
  "fs.writeBinaryFile": async ({ path, content }) => APINodeFileSystem.writeBinaryFile(path, content),
  "fs.remove": async ({ path }) => APINodeFileSystem.remove(path),
  "fs.exists": async ({ path }) => APINodeFileSystem.exists(path),
  "fs.getStats": async ({ path }) => APINodeFileSystem.getStats(path),
  "fs.createDirectory": async ({ path }) => APINodeFileSystem.createDirectory(path),
  "fs.extractArchive": async ({ archivePath, destFolder }) => APINodeFileSystem.extractArchive(archivePath, destFolder),
  "http.fetchJson": async ({ url, options }) => APINodeHttp.fetchJson({ url, options }),
  "http.fetchText": async ({ url, options }) => APINodeHttp.fetchText({ url, options }),
  "http.downloadToFile": async ({ url, destPath, options }, onProgress) => APINodeHttp.downloadToFile({ url, destPath, options, onProgress }),
  
  // Window API
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
  "window.center": async () => APINodeWindow.center(callApi)
};

async function handleRequest(operation, params = {}, onProgress = null) {
  const handler = operations[operation];
  if (!handler) throw new Error(`Unknown backend operation: ${operation}`);
  return handler(params || {}, onProgress);
}

export { handleRequest, operations, setExtensionContext };
