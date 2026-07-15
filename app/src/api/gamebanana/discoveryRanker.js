const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const finite = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);

export function scoreCandidate(candidate, { snapshotCreatedAt, config, history }) {
  const likes = Math.max(0, finite(candidate.likes));
  const views = Math.max(1, finite(candidate.views), likes);
  const ageDays = Math.max(0, (snapshotCreatedAt - finite(candidate.createdAt)) / 86400);
  const alpha = config.priorLikeRate * config.priorStrengthViews;
  const beta = (1 - config.priorLikeRate) * config.priorStrengthViews;
  const posteriorRate = (likes + alpha) / (views + alpha + beta);
  const quality = clamp((posteriorRate - config.qualityLowRate) / (config.qualityHighRate - config.qualityLowRate));
  const likeVolume = clamp(Math.log1p(likes) / Math.log1p(config.likeSaturation));
  const viewVolume = clamp(Math.log1p(views) / Math.log1p(config.viewSaturation));
  const freshness = 2 ** (-ageDays / config.freshnessHalfLifeDays);
  const previous = history?.[candidate.id];
  const elapsedDays = previous && Math.max(0, (snapshotCreatedAt - previous.observedAt) / 86400);
  const hasHistory = previous && elapsedDays >= config.metricHistoryMinimumHours / 24;
  const likeDelta = hasHistory ? Math.max(0, likes - previous.likes) : likes;
  const viewDelta = hasHistory ? Math.max(0, views - previous.views) : views;
  const velocity = (likeDelta + viewDelta / Math.max(config.viewSaturation / config.likeSaturation, 1)) /
    (hasHistory ? elapsedDays : ageDays + config.proxyAgeOffsetDays);
  const momentum = clamp(Math.log1p(velocity) / Math.log1p(config.likeSaturation)) *
    (hasHistory ? 1 : config.coldStartMomentumMultiplier);
  const evidence = 1 - Math.exp(-views / config.confidenceViews);
  const weights = config.relevanceWeights;
  const relevance = weights.quality * quality + weights.likeVolume * likeVolume +
    weights.viewVolume * viewVolume + weights.freshness * freshness + weights.momentum * momentum;
  const score = relevance * (config.confidenceFloor + (1 - config.confidenceFloor) * evidence) +
    config.explorationWeight * freshness * (1 - evidence);
  return { score: finite(score), quality, likeVolume, viewVolume, freshness, momentum, evidence, ageDays };
}

function sortScored(left, right) {
  return right.score - left.score || right.createdAt - left.createdAt || right.id - left.id;
}

export function rankCandidates(candidates, options) {
  return candidates.map((candidate) => ({ ...candidate, ...scoreCandidate(candidate, options) })).sort(sortScored);
}

export function applyDiversity(ranked, { config, singleEngine = false }) {
  const selected = [];
  const passes = [
    { creatorPerPage: config.diversity.creatorPerPage, relaxDimensions: false },
    { creatorPerPage: 2, relaxDimensions: false },
    { creatorPerPage: Infinity, relaxDimensions: true },
    { creatorPerPage: Infinity, relaxDimensions: true, noSoftLimits: true },
  ];
  const used = new Set();
  for (const pass of passes) {
    for (const candidate of ranked) {
      if (used.has(candidate.id)) continue;
      const creatorCount = selected.filter((item) => item.creatorId && item.creatorId === candidate.creatorId).length;
      const recentCreatorCount = selected.slice(-config.diversity.creatorWindowSize).filter((item) => item.creatorId && item.creatorId === candidate.creatorId).length;
      const engineCount = selected.filter((item) => item.engineId && item.engineId === candidate.engineId).length;
      const categoryCount = selected.filter((item) => item.categoryId && item.categoryId === candidate.categoryId).length;
      const consecutive = selected.slice(-config.diversity.maxConsecutiveEngine).every((item) => item.engineId === candidate.engineId);
      const violatesCreator = candidate.creatorId && (creatorCount >= pass.creatorPerPage || recentCreatorCount >= config.diversity.creatorPerWindow);
      const sameDimension = candidate.engineId && candidate.categoryId && String(candidate.engineId) === String(candidate.categoryId);
      const violatesDimensions = !singleEngine && !pass.relaxDimensions &&
        ((candidate.engineId && engineCount >= config.diversity.enginePerPage) ||
          (!sameDimension && candidate.categoryId && categoryCount >= config.diversity.categoryPerPage) ||
          (candidate.engineId && consecutive));
      if (!pass.noSoftLimits && (violatesCreator || violatesDimensions)) continue;
      selected.push(candidate);
      used.add(candidate.id);
    }
  }
  return selected;
}
