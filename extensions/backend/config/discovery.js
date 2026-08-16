export const DISCOVERY_CONFIG_VERSION = "2";

const DEFAULT_DISCOVERY_CONFIG = {
  version: DISCOVERY_CONFIG_VERSION,
  pageSize: 12,
  sourcePerPage: 50,
  maxConcurrentRequests: 2,
  maxRequestsPerSnapshot: 16,
  requestTimeoutMs: 12000,
  transientRetryCount: 1,
  newestMaxPagesPerCategory: 4,
  mostLikedMaxPagesPerCategory: 1,
  qualityTargetRate: 0.04,
  qualityConfidenceViews: 100,
  likeSaturation: 100,
  freshnessHalfLifeDays: 45,
  qualityWeight: 0.5,
  likesWeight: 0.2,
  freshnessWeight: 0.3,
  creatorPerSnapshot: 2,
  transportCacheFreshMs: 2 * 60 * 1000,
  snapshotFreshMs: 5 * 60 * 1000,
  snapshotStaleIfErrorMs: 15 * 60 * 1000,
  maximumSnapshots: 4,
};

export function validateDiscoveryConfig(config = {}) {
  const merged = { ...DEFAULT_DISCOVERY_CONFIG, ...config };
  const positiveKeys = [
    "pageSize",
    "sourcePerPage",
    "maxConcurrentRequests",
    "maxRequestsPerSnapshot",
    "requestTimeoutMs",
    "newestMaxPagesPerCategory",
    "mostLikedMaxPagesPerCategory",
    "qualityTargetRate",
    "qualityConfidenceViews",
    "likeSaturation",
    "freshnessHalfLifeDays",
    "creatorPerSnapshot",
    "transportCacheFreshMs",
    "snapshotFreshMs",
    "snapshotStaleIfErrorMs",
    "maximumSnapshots",
  ];
  if (
    positiveKeys.some(
      (key) => !Number.isFinite(merged[key]) || merged[key] <= 0,
    )
  ) {
    throw new Error("Discovery config contains an invalid value");
  }
  const weightSum =
    merged.qualityWeight + merged.likesWeight + merged.freshnessWeight;
  if (Math.abs(weightSum - 1) > 0.000001) {
    throw new Error("Discovery ranking weights must sum to 1");
  }
  return Object.freeze(merged);
}

export const DISCOVERY_CONFIG = validateDiscoveryConfig();
