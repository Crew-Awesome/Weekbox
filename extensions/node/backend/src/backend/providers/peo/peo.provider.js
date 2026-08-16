import { PeoModService } from "../../services/peo/peo.service.js";

// Stable facade used by the launcher; implementation lives in focused modules.
export const peoApi = new PeoModService();
