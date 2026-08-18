export const RANKER_CONFIG = {
  qualityTargetRate: 0.04,
  qualityConfidenceViews: 100,
  likeSaturation: 100,
  freshnessHalfLifeDays: 45,
  qualityWeight: 0.5,
  likesWeight: 0.2,
  freshnessWeight: 0.3,
  creatorPerSnapshot: 2,
};

const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));

export function scoreCandidate(
  candidate: any,
  snapshotCreatedAt: number = Date.now(),
) {
  const likes = Math.max(0, Number(candidate.likes) || 0);
  const views = Math.max(1, Number(candidate.views) || 0);
  const createdAtSecs = Number(
    candidate.createdAt || candidate.submittedAt || 0,
  );
  const ageDays = Math.max(
    0,
    (snapshotCreatedAt / 1000 - createdAtSecs) / 86400,
  );

  const qualityConfidence = clamp(
    views / Math.max(1, RANKER_CONFIG.qualityConfidenceViews),
  );
  const quality = clamp(
    (likes / views / RANKER_CONFIG.qualityTargetRate) * qualityConfidence,
  );
  const likeVolume = clamp(
    Math.log1p(likes) / Math.log1p(RANKER_CONFIG.likeSaturation),
  );

  // Los mods nuevos reciben un boost, pero los viejos bien rankeados aun compiten
  const freshness =
    0.35 + 0.65 * 2 ** (-ageDays / RANKER_CONFIG.freshnessHalfLifeDays);

  const score =
    RANKER_CONFIG.qualityWeight * quality +
    RANKER_CONFIG.likesWeight * likeVolume +
    RANKER_CONFIG.freshnessWeight * freshness;

  return { score, quality, likeVolume, freshness, ageDays };
}

export function rankCandidates(candidates: any[]) {
  const now = Date.now();
  return candidates
    .map((candidate) => ({
      ...candidate,
      ...scoreCandidate(candidate, now),
    }))
    .sort(
      (left, right) =>
        right.score - left.score ||
        right.submittedAt - left.submittedAt ||
        right.id - left.id,
    );
}

export function applyDiversity(ranked: any[]) {
  const selected = [];
  const deferred = [];
  const creatorCounts = new Map<string, number>();

  for (const candidate of ranked) {
    const creatorId = candidate.author || candidate.creatorId;
    const count = creatorCounts.get(creatorId) || 0;
    if (creatorId && count >= RANKER_CONFIG.creatorPerSnapshot) {
      deferred.push(candidate);
      continue;
    }
    selected.push(candidate);
    if (creatorId) creatorCounts.set(creatorId, count + 1);
  }
  return [...selected, ...deferred];
}
