import { getEngineUpdateCandidate } from "../../api/githubReleaseProvider.js";
import { ENGINE_DETAILS } from "../../config/engines.js";
import { FS } from "../../utils/filesystem.js";
import { getTargetLink, getTargetPlatform } from "./utils.js";
import { downloadEngine } from "./downloadEngine.js";
import { engineUpdateModal } from "./engineUpdateModal.js";
import { engineUpdateToast } from "./engineUpdateToast.js";

const SKIP_PREFIX = "weekbox-engine-update-skip-";
const INSTALLED_PREFIX = "weekbox-engine-update-installed-";
const AUTO_CHECK_INTERVAL_MS = 3 * 60 * 60 * 1000;
let scheduledCheck = null;

function getValue(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function setValue(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {}
}

export function rememberInstalledEngineBuild(engineId, versionData) {
  const platform = getTargetPlatform(versionData);
  const key =
    versionData.updateKeys?.[platform] ||
    versionData.updateKey ||
    (versionData.isNightly
      ? null
      : `release:${versionData.releaseVersion || versionData.version}`);
  if (key) setValue(`${INSTALLED_PREFIX}${engineId}`, key);
}

async function findAvailableUpdate(engineId, installedVersion) {
  const candidate = await getEngineUpdateCandidate(engineId);
  if (!candidate) return { status: "unavailable" };

  const platform = getTargetPlatform(candidate);
  const key = candidate.updateKeys?.[platform] || candidate.updateKey;
  if (!key) return { status: "unavailable" };
  if (getValue(`${SKIP_PREFIX}${engineId}`) === key)
    return { status: "skipped" };
  if (getValue(`${INSTALLED_PREFIX}${engineId}`) === key)
    return { status: "current" };

  if (candidate.isNightly && installedVersion !== "Nightly") {
    return { status: "current" };
  }
  if (!candidate.isNightly && installedVersion === candidate.version) {
    rememberInstalledEngineBuild(engineId, candidate);
    return { status: "current" };
  }

  const url = getTargetLink(candidate);
  return url
    ? { status: "available", candidate, key, url }
    : { status: "unavailable" };
}

export const engineUpdateService = {
  startScheduledChecks() {
    if (scheduledCheck) return;
    scheduledCheck = setInterval(
      () => this.checkForUpdatesInBackground(),
      AUTO_CHECK_INTERVAL_MS,
    );
  },

  async checkForUpdatesInBackground() {
    if (!FS.isInitialized) await FS.init();
    const installed = await FS.getInstalledEngines();
    for (const engineId of ["codename", "alepsych", "psychonline"]) {
      const installedVersion = installed.find(
        (engine) =>
          engine.id === engineId &&
          (engineId === "psychonline"
            ? engine.version === "Latest"
            : engine.version === "Nightly"),
      )?.version;
      if (!installedVersion) continue;

      const update = await findAvailableUpdate(engineId, installedVersion);
      if (update.status !== "available") continue;
      const name = ENGINE_DETAILS[engineId]?.name || engineId;
      engineUpdateToast.offer(
        engineId,
        name,
        ENGINE_DETAILS[engineId]?.icon,
        () => this.promptAndUpdate(engineId, installedVersion, update),
      );
    }
  },

  async promptAndUpdate(engineId, installedVersion, update) {
    if (FS.isEngineRunning(engineId, installedVersion)) {
      return { status: "running" };
    }
    const name = ENGINE_DETAILS[engineId]?.name || engineId;
    const choice = await engineUpdateModal.confirm({
      engineId,
      name,
      icon: ENGINE_DETAILS[engineId]?.icon,
      candidate: update.candidate,
    });
    if (choice === "skip") {
      setValue(`${SKIP_PREFIX}${engineId}`, update.key);
      return { status: "skipped" };
    }
    if (choice !== "update") return { status: "dismissed" };

    engineUpdateToast.show(engineId, name);
    const updated = await downloadEngine.update(
      engineId,
      installedVersion,
      update.url,
      (progress) => engineUpdateToast.update(engineId, progress),
    );
    if (updated) {
      rememberInstalledEngineBuild(engineId, update.candidate);
      engineUpdateToast.complete(engineId);
      return { status: "updated" };
    }
    engineUpdateToast.error(engineId);
    return { status: "error" };
  },

  async checkEngineUpdate(engineId, installedVersion) {
    const update = await findAvailableUpdate(engineId, installedVersion);
    if (update.status !== "available") return update;
    return this.promptAndUpdate(engineId, installedVersion, update);
  },
};
