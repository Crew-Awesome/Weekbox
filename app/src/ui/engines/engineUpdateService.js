import { getEngineUpdateCandidate } from "../../api/githubReleaseProvider.js";
import { ENGINE_DETAILS } from "../../config/engines.js";
import { FS } from "../../utils/filesystem.js";
import { getTargetLink, getTargetPlatform } from "./utils.js";
import { downloadEngine } from "./downloadEngine.js";
import { engineUpdateModal } from "./engineUpdateModal.js";
import { engineUpdateToast } from "./engineUpdateToast.js";
import { appSettings } from "../../core/settings.js";
import { networkStatus } from "../../core/networkStatus.js";

const SKIP_PREFIX = "weekbox-engine-update-skip-";
const UPDATE_STATE_FILE = "engineupdatestate.json";
const AUTO_CHECK_INTERVAL_MS = 3 * 60 * 60 * 1000;
let scheduledCheck = null;

function getBuildStateKey(engineId, installedVersion) {
  return `${engineId}:${installedVersion}`;
}

async function readUpdateState() {
  if (!FS.isInitialized) await FS.init();
  try {
    const state = JSON.parse(
      await FS.api.read(`${FS.dataPath}/${UPDATE_STATE_FILE}`),
    );
    return state && typeof state === "object" ? state : {};
  } catch {
    return {};
  }
}

async function getInstalledBuild(engineId, installedVersion) {
  const state = await readUpdateState();
  return state.builds?.[getBuildStateKey(engineId, installedVersion)] || null;
}

async function saveInstalledBuild(engineId, installedVersion, buildKey) {
  const state = await readUpdateState();
  state.builds ||= {};
  state.builds[getBuildStateKey(engineId, installedVersion)] = buildKey;
  await FS.api.write(
    `${FS.dataPath}/${UPDATE_STATE_FILE}`,
    JSON.stringify(state, null, 2),
  );
}

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

export async function rememberInstalledEngineBuild(
  engineId,
  versionData,
  installedVersion = versionData.version,
) {
  const platform = getTargetPlatform(versionData);
  const key =
    versionData.updateKeys?.[platform] ||
    versionData.updateKey ||
    (versionData.isNightly
      ? null
      : `release:${versionData.releaseVersion || versionData.version}`);
  if (key) await saveInstalledBuild(engineId, installedVersion, key);
}

async function findAvailableUpdate(engineId, installedVersion) {
  // A numbered Psych Online install is deliberately pinned. Only its moving
  // Latest entry follows new releases.
  if (engineId === "psychonline" && installedVersion !== "Latest") {
    return { status: "pinned" };
  }
  const candidate = await getEngineUpdateCandidate(engineId);
  if (!candidate) return { status: "unavailable" };

  const platform = getTargetPlatform(candidate);
  const key = candidate.updateKeys?.[platform] || candidate.updateKey;
  if (!key) return { status: "unavailable" };
  if (getValue(`${SKIP_PREFIX}${engineId}`) === key)
    return { status: "skipped" };
  const savedBuild = await getInstalledBuild(engineId, installedVersion);
  if (savedBuild === key) return { status: "current" };

  // Older installs did not record which release the moving Latest folder
  // contained. Establish a baseline once instead of offering a false update.
  if (engineId === "psychonline" && installedVersion === "Latest") {
    await saveInstalledBuild(engineId, installedVersion, key);
    return { status: "current" };
  }

  if (candidate.isNightly && installedVersion !== "Nightly") {
    return { status: "current" };
  }
  if (!candidate.isNightly && installedVersion === candidate.version) {
    await rememberInstalledEngineBuild(engineId, candidate, installedVersion);
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
    if (!networkStatus.online) return;
    if (appSettings.get("checkUpdatesOnStartup")) {
      void this.checkForUpdatesInBackground();
    }
    scheduledCheck = setInterval(() => {
      if (appSettings.get("checkUpdatesInBackground")) {
        void this.checkForUpdatesInBackground();
      }
    }, AUTO_CHECK_INTERVAL_MS);
  },

  async checkForUpdatesInBackground() {
    if (!networkStatus.online) return;
    if (!FS.isInitialized) await FS.init();
    const installed = await FS.getInstalledEngines();
    for (const engineId of ["codename", "psychonline"]) {
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
      await rememberInstalledEngineBuild(
        engineId,
        update.candidate,
        installedVersion,
      );
      engineUpdateToast.complete(engineId);
      return { status: "updated" };
    }
    engineUpdateToast.error(engineId);
    return { status: "error" };
  },

  async checkEngineUpdate(engineId, installedVersion) {
    if (!networkStatus.online) return { status: "offline" };
    const update = await findAvailableUpdate(engineId, installedVersion);
    if (update.status !== "available") return update;
    return this.promptAndUpdate(engineId, installedVersion, update);
  },
};
