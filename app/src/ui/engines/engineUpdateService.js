import { getEngineUpdateCandidate } from "../../api/githubReleaseProvider.js";
import { ENGINE_DETAILS } from "../../config/engines.js";
import { FS } from "../../utils/filesystem.js";
import { getTargetLink } from "./utils.js";
import { downloadEngine } from "./downloadEngine.js";

const CHECKED_AT_KEY = "weekbox-engine-update-check";
const SKIP_PREFIX = "weekbox-engine-update-skip-";
const INSTALLED_PREFIX = "weekbox-engine-update-installed-";
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

function getValue(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

function setValue(key, value) {
  try { localStorage.setItem(key, value); } catch {}
}

export const engineUpdateService = {
  async check() {
    if (Date.now() - Number(getValue(CHECKED_AT_KEY) || 0) < CHECK_INTERVAL_MS) return;
    setValue(CHECKED_AT_KEY, String(Date.now()));
    if (!FS.isInitialized) await FS.init();
    const installed = await FS.getInstalledEngines();
    for (const engineId of ["codename", "alepsych", "psychonline"]) {
      const candidate = await getEngineUpdateCandidate(engineId);
      if (!candidate) continue;
      const version = candidate.isNightly
        ? "Nightly"
        : candidate.version;
      if (!installed.some((engine) => engine.id === engineId && engine.version === version)) continue;
      const key = candidate.updateKey;
      if (getValue(`${SKIP_PREFIX}${engineId}`) === key ||
          getValue(`${INSTALLED_PREFIX}${engineId}`) === key) continue;
      const url = getTargetLink(candidate);
      if (!url || FS.isEngineRunning(engineId, version)) continue;
      const name = ENGINE_DETAILS[engineId]?.name || engineId;
      if (!window.confirm(`${name} has an update available. Update now?`)) {
        setValue(`${SKIP_PREFIX}${engineId}`, key);
        continue;
      }
      const updated = await downloadEngine.update(engineId, version, url);
      if (updated) {
        setValue(`${INSTALLED_PREFIX}${engineId}`, key);
        window.alert(`${name} was updated. Your installed mods were kept.`);
      } else {
        window.alert(`Could not update ${name}. Your existing installation was kept.`);
      }
    }
  },
};
