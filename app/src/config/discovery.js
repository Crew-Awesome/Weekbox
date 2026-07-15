export const DISCOVERY_CONFIG_VERSION = "1";

const DEFAULT_DISCOVERY_CONFIG = {
  version: DISCOVERY_CONFIG_VERSION,
  pageSize: 12,
  initialCandidateTarget: 72,
  sourcePerPage: 50,
  maxConcurrentRequests: 2,
  maxRequestsPerSnapshot: 12,
  requestTimeoutMs: 12000,
  transientRetryCount: 1,
  newestMaxPagesPerCategory: 3,
  mostLikedMaxPagesPerCategory: 2,
  primaryMaxAgeDays: 180,
  fallbackMaxAgeDays: 365,
  priorLikeRate: 0.012,
  priorStrengthViews: 400,
  qualityLowRate: 0.004,
  qualityHighRate: 0.04,
  confidenceViews: 400,
  confidenceFloor: 0.35,
  explorationWeight: 0.08,
  likeSaturation: 50,
  viewSaturation: 10000,
  freshnessHalfLifeDays: 21,
  proxyAgeOffsetDays: 1,
  coldStartMomentumMultiplier: 0.5,
  metricHistoryMinimumHours: 6,
  transportCacheFreshMs: 5 * 60 * 1000,
  snapshotFreshMs: 10 * 60 * 1000,
  snapshotStaleIfErrorMs: 60 * 60 * 1000,
  maximumSnapshots: 8,
  relevanceWeights: {
    quality: 0.32,
    likeVolume: 0.14,
    viewVolume: 0.08,
    freshness: 0.26,
    momentum: 0.2,
  },
  diversity: {
    creatorPerPage: 1,
    creatorPerWindow: 2,
    creatorWindowSize: 24,
    enginePerPage: 6,
    categoryPerPage: 4,
    maxConsecutiveEngine: 2,
  },
};

function assertPositive(config, key) {
  if (!Number.isFinite(config[key]) || config[key] <= 0) {
    throw new Error(`Discovery config ${key} must be a positive number`);
  }
}

export function validateDiscoveryConfig(config) {
  const merged = {
    ...DEFAULT_DISCOVERY_CONFIG,
    ...config,
    relevanceWeights: {
      ...DEFAULT_DISCOVERY_CONFIG.relevanceWeights,
      ...config?.relevanceWeights,
    },
    diversity: { ...DEFAULT_DISCOVERY_CONFIG.diversity, ...config?.diversity },
  };

  [
    "pageSize",
    "initialCandidateTarget",
    "sourcePerPage",
    "maxConcurrentRequests",
    "maxRequestsPerSnapshot",
    "requestTimeoutMs",
    "newestMaxPagesPerCategory",
    "mostLikedMaxPagesPerCategory",
    "priorStrengthViews",
    "confidenceViews",
    "likeSaturation",
    "viewSaturation",
    "freshnessHalfLifeDays",
    "proxyAgeOffsetDays",
    "metricHistoryMinimumHours",
    "transportCacheFreshMs",
    "snapshotFreshMs",
    "snapshotStaleIfErrorMs",
    "maximumSnapshots",
  ].forEach((key) => assertPositive(merged, key));

  if (
    merged.priorLikeRate < 0 ||
    merged.priorLikeRate > 1 ||
    merged.qualityLowRate >= merged.qualityHighRate ||
    merged.confidenceFloor < 0 ||
    merged.confidenceFloor > 1 ||
    merged.explorationWeight < 0 ||
    merged.coldStartMomentumMultiplier < 0 ||
    merged.transientRetryCount < 0
  ) {
    throw new Error("Discovery config contains an invalid normalized value");
  }

  const weightSum = Object.values(merged.relevanceWeights).reduce(
    (sum, value) => sum + value,
    0,
  );
  if (
    Object.values(merged.relevanceWeights).some(
      (value) => !Number.isFinite(value) || value < 0,
    ) ||
    Math.abs(weightSum - 1) > 0.000001
  ) {
    throw new Error("Discovery relevance weights must sum to 1");
  }

  return Object.freeze({
    ...merged,
    relevanceWeights: Object.freeze({ ...merged.relevanceWeights }),
    diversity: Object.freeze({ ...merged.diversity }),
  });
}

export const DISCOVERY_CONFIG = validateDiscoveryConfig(DEFAULT_DISCOVERY_CONFIG);
