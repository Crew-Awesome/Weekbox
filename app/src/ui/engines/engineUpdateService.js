import { getEngineUpdateCandidate } from "../../api/githubReleaseProvider.js";
import { ENGINE_DETAILS } from "../../config/engines.js";
import { FS } from "../../utils/filesystem.js";
import { getTargetLink, getTargetPlatform } from "./utils.js";
import { downloadEngine } from "./downloadEngine.js";
import { engineUpdateModal } from "./engineUpdateModal.js";
import { engineUpdateToast } from "./engineUpdateToast.js";

const CHECKED_AT_KEY = "weekbox-engine-update-check";
const SKIP_PREFIX = "weekbox-engine-update-skip-";
const INSTALLED_PREFIX = "weekbox-engine-update-installed-";
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

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

export const engineUpdateService = {
  async checkEngineUpdate(engineId, installedVersion) {
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
    if (!url) return { status: "unavailable" };
    if (FS.isEngineRunning(engineId, installedVersion)) {
      return { status: "running" };
    }

    const name = ENGINE_DETAILS[engineId]?.name || engineId;
    const shouldUpdate = await engineUpdateModal.confirm({
      engineId,
      name,
      icon: ENGINE_DETAILS[engineId]?.icon,
      candidate,
    });
    if (!shouldUpdate) {
      setValue(`${SKIP_PREFIX}${engineId}`, key);
      return { status: "skipped" };
    }

    engineUpdateToast.show(engineId, name);
    const updated = await downloadEngine.update(
      engineId,
      installedVersion,
      url,
      (progress) => engineUpdateToast.update(engineId, progress),
    );
    if (updated) {
      rememberInstalledEngineBuild(engineId, candidate);
      engineUpdateToast.complete(engineId);
      return { status: "updated" };
    }
    engineUpdateToast.error(engineId);
    return { status: "error" };
  },

  async check() {
    if (Date.now() - Number(getValue(CHECKED_AT_KEY) || 0) < CHECK_INTERVAL_MS)
      return;
    setValue(CHECKED_AT_KEY, String(Date.now()));
    if (!FS.isInitialized) await FS.init();
    const installed = await FS.getInstalledEngines();
    for (const engineId of ["codename", "alepsych", "psychonline"]) {
      const candidate = await getEngineUpdateCandidate(engineId);
      if (!candidate) continue;
      const version = candidate.isNightly ? "Nightly" : candidate.version;
      const installedVersions = installed.filter(
        (engine) => engine.id === engineId,
      );
      if (!installedVersions.length) continue;

      let installedVersion = version;
      if (candidate.isNightly) {
        if (!installedVersions.some((engine) => engine.version === version))
          continue;
      } else if (
        installedVersions.some((engine) => engine.version === version)
      ) {
        // A folder named for the latest release is already current.
        rememberInstalledEngineBuild(engineId, candidate);
        continue;
      } else {
        installedVersion = installedVersions
          .map((engine) => engine.version)
          .sort((a, b) =>
            b.localeCompare(a, undefined, {
              numeric: true,
              sensitivity: "base",
            }),
          )[0];
      }
      const platform = getTargetPlatform(candidate);
      const key = candidate.updateKeys?.[platform] || candidate.updateKey;
      if (!key) continue;
      if (
        getValue(`${SKIP_PREFIX}${engineId}`) === key ||
        getValue(`${INSTALLED_PREFIX}${engineId}`) === key
      )
        continue;
      const url = getTargetLink(candidate);
      if (!url || FS.isEngineRunning(engineId, installedVersion)) continue;
      const name = ENGINE_DETAILS[engineId]?.name || engineId;
      const shouldUpdate = await engineUpdateModal.confirm({
        engineId,
        name,
        icon: ENGINE_DETAILS[engineId]?.icon,
        candidate,
      });
      if (!shouldUpdate) {
        setValue(`${SKIP_PREFIX}${engineId}`, key);
        continue;
      }
      engineUpdateToast.show(engineId, name);
      const updated = await downloadEngine.update(
        engineId,
        installedVersion,
        url,
        (progress) => engineUpdateToast.update(engineId, progress),
      );
      if (updated) {
        rememberInstalledEngineBuild(engineId, candidate);
        engineUpdateToast.complete(engineId);
      } else {
        engineUpdateToast.error(engineId);
      }
    }
  },
};
