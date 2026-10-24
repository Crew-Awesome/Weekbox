/**
 * Weights and parameters for candidate mod ranking.
 */
export const RANKER_CONFIG = {
  qualityTargetRate: 0.04,
  qualityConfidenceViews: 100,
  likeSaturation: 100,
  freshnessHalfLifeDays: 45,
  qualityWeight: 0.5,
  likesWeight: 0.2,
  freshnessWeight: 0.3,
  creatorPerSnapshot: 2,
}

export interface RankableCandidate {
  likes?: number
  views?: number
  createdAt?: number
  submittedAt?: number
  [key: string]: unknown
}

const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value))

/**
 * Computes quality, volume, and freshness score for a mod candidate.
 */
export function scoreCandidate(
  candidate: RankableCandidate,
  snapshotCreatedAt: number = Date.now(),
) {
  const likes = Math.max(0, Number(candidate.likes) || 0)
  const views = Math.max(1, Number(candidate.views) || 0)
  const createdAtSecs = Number(
    candidate.createdAt || candidate.submittedAt || 0,
  )
  const ageDays = Math.max(
    0,
    (snapshotCreatedAt / 1000 - createdAtSecs) / 86400,
  )

  const qualityConfidence = clamp(
    views / Math.max(1, RANKER_CONFIG.qualityConfidenceViews),
  )
  const quality = clamp(
    (likes / views / RANKER_CONFIG.qualityTargetRate) * qualityConfidence,
  )
  const likeVolume = clamp(
    Math.log1p(likes) / Math.log1p(RANKER_CONFIG.likeSaturation),
  )

  const freshness =
    0.35 + 0.65 * 2 ** (-ageDays / RANKER_CONFIG.freshnessHalfLifeDays)

  const score =
    RANKER_CONFIG.qualityWeight * quality +
    RANKER_CONFIG.likesWeight * likeVolume +
    RANKER_CONFIG.freshnessWeight * freshness

  return { score, quality, likeVolume, freshness, ageDays }
}

/**
 * Sorts an array of candidates descending by their computed ranking score.
 */
export function rankCandidates<T extends RankableCandidate>(
  candidates: T[],
  snapshotCreatedAt: number = Date.now(),
) {
  return candidates
    .map((candidate) => ({
      candidate,
      ...scoreCandidate(candidate, snapshotCreatedAt),
    }))
    .sort((a, b) => b.score - a.score)
}
