
import { fsApi as APINodeFileSystem } from "./node/fs/fs.mjs";
import { httpApi as APINodeHttp } from "./node/http/http.mjs";

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
  "http.fetchJson": async ({ url, options }) => APINodeHttp.fetchJson({ url, options }),
  "http.fetchText": async ({ url, options }) => APINodeHttp.fetchText({ url, options }),
};

async function handleRequest(operation, params = {}) {
  const handler = operations[operation];
  if (!handler) throw new Error(`Unknown backend operation: ${operation}`);
  return handler(params || {});
}

export { handleRequest, operations };
