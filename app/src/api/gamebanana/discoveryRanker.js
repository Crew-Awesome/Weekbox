const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

export function scoreCandidate(candidate, { snapshotCreatedAt, config }) {
  const likes = Math.max(0, Number(candidate.likes) || 0);
  const views = Math.max(1, Number(candidate.views) || 0);
  const ageDays = Math.max(
    0,
    (snapshotCreatedAt - Number(candidate.createdAt || 0)) / 86400,
  );
  const quality = clamp(likes / views / config.qualityTargetRate);
  const likeVolume = clamp(
    Math.log1p(likes) / Math.log1p(config.likeSaturation),
  );
  // Fresh mods get a boost, but older well-liked mods can still compete.
  const freshness =
    0.35 + 0.65 * 2 ** (-ageDays / config.freshnessHalfLifeDays);
  const score =
    config.qualityWeight * quality +
    config.likesWeight * likeVolume +
    config.freshnessWeight * freshness;
  return { score, quality, likeVolume, freshness, ageDays };
}

export function rankCandidates(candidates, options) {
  return candidates
    .map((candidate) => ({
      ...candidate,
      ...scoreCandidate(candidate, options),
    }))
    .sort(
      (left, right) =>
        right.score - left.score ||
        right.createdAt - left.createdAt ||
        right.id - left.id,
    );
}

export function applyDiversity(ranked, { config }) {
  const selected = [];
  const deferred = [];
  const creatorCounts = new Map();

  for (const candidate of ranked) {
    const count = creatorCounts.get(candidate.creatorId) || 0;
    if (candidate.creatorId && count >= config.creatorPerSnapshot) {
      deferred.push(candidate);
      continue;
    }
    selected.push(candidate);
    if (candidate.creatorId) creatorCounts.set(candidate.creatorId, count + 1);
  }
  return [...selected, ...deferred];
}
