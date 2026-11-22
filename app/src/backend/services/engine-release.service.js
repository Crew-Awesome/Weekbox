import {
  getEngineReleaseVersions,
  getEngineUpdateCandidate,
} from "../providers/github/github-release.provider.js";
import { resolveItchDownloadUrl } from "../providers/itch/itch-release.provider.js";

export const engineReleaseService = {
  getVersions(engineId) {
    return getEngineReleaseVersions(engineId);
  },

  getUpdateCandidate(engineId) {
    return getEngineUpdateCandidate(engineId);
  },

  resolveItchDownloadUrl(itch, platform) {
    return resolveItchDownloadUrl(itch, platform);
  },
};
