import { fsIoApi } from "./fs-io.mjs";
import { archiveExtractorApi } from "./archive-extractor.mjs";
import { storageMigratorApi } from "./storage-migrator.mjs";
import { flattenFolder } from "./flattener.mjs";

export * from "./fs-io.mjs";
export * from "./archive-extractor.mjs";
export * from "./storage-migrator.mjs";
export * from "./flattener.mjs";

/**
 * Unified Node.js File System API for Weekbox (Fachada / Facade Pattern).
 * Composes decoupled atomic domains (I/O, extraction, migration)
 * adhering strictly to the Single Responsibility Principle (SRP).
 */
export const fsApi = {
  ...fsIoApi,
  ...archiveExtractorApi,
  ...storageMigratorApi,
  flattenFolder,
};

export default fsApi;
