import { SniroModService } from "./sniro/service.js";

// Stable facade used by the launcher; implementation lives in focused modules.
export const sniroApi = new SniroModService();
