import { ENGINE_RELEASE_SOURCES } from "../config/engineReleaseSources.js";

const CACHE_PREFIX = "weekbox:engine-releases:";
const CACHE_FRESH_MS = 24 * 60 * 60 * 1000;

function getCacheKey(engineId) {
  return `${CACHE_PREFIX}${engineId}`;
}

function readCache(engineId) {
  try {
    return JSON.parse(localStorage.getItem(getCacheKey(engineId)) || "null");
  } catch {
    return null;
  }
}

function writeCache(engineId, cache) {
  try {
    localStorage.setItem(getCacheKey(engineId), JSON.stringify(cache));
  } catch {}
}

function getNextPage(linkHeader) {
  const next = linkHeader
    ?.split(",")
    .find((link) => /rel="next"/.test(link));
  return next?.match(/<([^>]+)>/)?.[1] || null;
}

function selectAsset(assets, patterns, exclude = []) {
  return assets.find((asset) => {
    const name = asset.name || "";
    return (
      !exclude.some((pattern) => pattern.test(name)) &&
      patterns.some((pattern) => pattern.test(name))
    );
  });
}

function normalizeRelease(release, source) {
  if (release.draft || !release.tag_name) return null;
  const version = release.tag_name.replace(/^v/i, "");
  const result = { version, releasedAt: release.published_at || null };
  for (const [platform, patterns] of Object.entries(source.assets)) {
    const asset = selectAsset(release.assets || [], patterns, source.exclude);
    if (asset?.browser_download_url) result[platform] = asset.browser_download_url;
  }
  return Object.keys(result).some((key) => key !== "version" && key !== "releasedAt")
    ? result
    : null;
}

async function fetchAllReleases(source, etag) {
  let url = `https://api.github.com/repos/${source.repository}/releases?per_page=100`;
  const releases = [];
  let firstResponse = true;
  let responseEtag = null;

  while (url) {
    const headers = { Accept: "application/vnd.github+json" };
    if (firstResponse && etag) headers["If-None-Match"] = etag;
    const response = await fetch(url, { headers });
    if (response.status === 304) return { notModified: true };
    if (!response.ok) throw new Error(`GitHub releases request failed: ${response.status}`);
    if (firstResponse) responseEtag = response.headers.get("etag");
    releases.push(...(await response.json()));
    url = getNextPage(response.headers.get("link"));
    firstResponse = false;
  }

  return { releases, etag: responseEtag };
}

export async function getEngineReleaseVersions(engineId) {
  const source = ENGINE_RELEASE_SOURCES[engineId];
  if (!source) return [];
  const cached = readCache(engineId);
  if (cached?.versions?.length && Date.now() - cached.savedAt < CACHE_FRESH_MS) {
    return cached.versions;
  }

  try {
    const result = await fetchAllReleases(source, cached?.etag);
    if (result.notModified && cached?.versions?.length) {
      writeCache(engineId, { ...cached, savedAt: Date.now() });
      return cached.versions;
    }
    const versions = result.releases
      .map((release) => normalizeRelease(release, source))
      .filter(Boolean);
    if (versions.length === 0) return [];
    writeCache(engineId, {
      versions,
      etag: result.etag,
      savedAt: Date.now(),
    });
    return versions;
  } catch (error) {
    return cached?.versions?.length || [];
  }
}
