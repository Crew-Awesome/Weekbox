import { fsApi as APINodeFileSystem } from "./node/fs/fs.mjs";
import { httpApi as APINodeHttp } from "./node/http/http.mjs";

let extContext = null;

const setExtensionContext = (ext) => {
  extContext = ext;
};

const callApi = async (namespace, method, params = {}) => {
  if (!extContext) throw new Error("Neutralino Extension context not available.");
  const response = await extContext.callApi(`${namespace}.${method}`, params);
  
  if (response && response.returnValue !== undefined) {
    return response.returnValue;
  }
  
  // Some APIs might just return success or other properties directly
  return response;
};

const operations = {
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
  "window.minimize": async () => callApi("window", "minimize"),
  "window.maximize": async () => callApi("window", "maximize"),
  "window.unmaximize": async () => callApi("window", "unmaximize"),
  "window.isMaximized": async () => callApi("window", "isMaximized"),
  "window.setFullScreen": async () => callApi("window", "setFullScreen"),
  "window.exitFullScreen": async () => callApi("window", "exitFullScreen"),
  "window.show": async () => callApi("window", "show"),
  "window.hide": async () => callApi("window", "hide"),
  "window.focus": async () => callApi("window", "focus"),
  "window.move": async ({ x, y }) => callApi("window", "move", { x, y }),
  "window.setSize": async ({ width, height }) => callApi("window", "setSize", { width, height }),
  "window.getSize": async () => callApi("window", "getSize"),
  "window.getPosition": async () => callApi("window", "getPosition"),
  "window.getDisplays": async () => callApi("computer", "getDisplays"),
  "window.close": async () => callApi("app", "exit"),
  "window.center": async () => {
     // Center manually
     const size = await callApi("window", "getSize");
     const displays = await callApi("computer", "getDisplays");
     const pos = await callApi("window", "getPosition");
     
     // Find the display the window is currently on
     let currentDisplay = displays[0];
     for (const display of displays) {
       const bx = display.bounds?.x || 0;
       const by = display.bounds?.y || 0;
       const bw = display.resolution.width;
       const bh = display.resolution.height;
       // Check if window is within this display's bounds
       if (
         pos.x >= bx &&
         pos.x < bx + bw &&
         pos.y >= by &&
         pos.y < by + bh
       ) {
         currentDisplay = display;
         break;
       }
     }

     const bx = currentDisplay.bounds?.x || 0;
     const by = currentDisplay.bounds?.y || 0;
     const centerX = bx + Math.floor((currentDisplay.resolution.width - size.width) / 2);
     const centerY = by + Math.floor((currentDisplay.resolution.height - size.height) / 2);
     await callApi("window", "move", { x: centerX, y: centerY });
  }
};

async function handleRequest(operation, params = {}, onProgress = null) {
  const handler = operations[operation];
  if (!handler) throw new Error(`Unknown backend operation: ${operation}`);
  return handler(params || {}, onProgress);
}

export { handleRequest, operations, setExtensionContext };
