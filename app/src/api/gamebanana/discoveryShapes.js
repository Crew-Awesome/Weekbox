/**
 * Normalized input for the later pure Discovery ranker.
 * @typedef {Object} DiscoveryCandidate
 * @property {number} id
 * @property {number} likes
 * @property {number} views
 * @property {number} createdAt Unix seconds
 * @property {?number} categoryId
 * @property {?string} engineId
 * @property {?string} creatorId
 * @property {Object} raw
 */

export function normalizeDiscoveryCandidate(raw, context = {}) {
  const number = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  return {
    id: number(raw?._idRow),
    likes: Math.max(0, number(raw?._nLikeCount)),
    views: Math.max(0, number(raw?._nViewCount)),
    createdAt: Math.max(0, number(raw?._tsDateAdded)),
    categoryId: Number.isFinite(Number(context.categoryId))
      ? Number(context.categoryId)
      : null,
    engineId: context.engineId || null,
    creatorId:
      context.creatorId || raw?._aSubmitter?._idRow?.toString() || null,
    raw: {
      ...raw,
      __injectedCategoryId: Number.isFinite(Number(context.categoryId))
        ? Number(context.categoryId)
        : raw?.__injectedCategoryId,
    },
  };
}

/**
 * @typedef {Object} DiscoveryResult
 * @property {Array<Object>} mods
 * @property {number} page
 * @property {number} pageSize
 * @property {?string} snapshotId
 * @property {boolean} exhausted
 * @property {boolean} partial
 * @property {boolean} stale
 * @property {Array<Object>} sourceErrors
 * @property {Object} diagnostics
 */
export function createDiscoveryResult({
  mods = [],
  page = 1,
  pageSize = 12,
  snapshotId = null,
  exhausted = false,
  partial = false,
  stale = false,
  sourceErrors = [],
  diagnostics = {},
} = {}) {
  return {
    mods,
    page,
    pageSize,
    snapshotId,
    exhausted,
    partial,
    stale,
    sourceErrors,
    diagnostics,
  };
}
