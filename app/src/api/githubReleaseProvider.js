import { ENGINE_RELEASE_SOURCES } from "../config/engineReleaseSources.js";

const CACHE_PREFIX = "weekbox-engine-releases-v2-";
const CACHE_FRESH_MS = 3 * 60 * 60 * 1000;
const NIGHTLY_CACHE_PREFIX = "weekbox-engine-nightly-";
const NIGHTLY_CACHE_MS = 3 * 60 * 60 * 1000;
const nightlyCache = new Map();

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

function readNightlyCache(cacheKey) {
  try {
    return JSON.parse(
      localStorage.getItem(`${NIGHTLY_CACHE_PREFIX}${cacheKey}`) || "null",
    );
  } catch {
    return null;
  }
}

function writeNightlyCache(cacheKey, cache) {
  try {
    localStorage.setItem(
      `${NIGHTLY_CACHE_PREFIX}${cacheKey}`,
      JSON.stringify(cache),
    );
  } catch {}
}

function getNextPage(linkHeader) {
  const next = linkHeader?.split(",").find((link) => /rel="next"/.test(link));
  return next?.match(/<([^>]+)>/)?.[1] || null;
}

const PLATFORM_MISMATCH_PATTERNS = {
  win: [/mac(?:os|osx)?|darwin/i, /linux/i],
  win32: [/mac(?:os|osx)?|darwin/i, /linux/i],
  win64: [/mac(?:os|osx)?|darwin/i, /linux/i],
  lin: [/mac(?:os|osx)?|darwin/i, /windows|win32|win64/i],
  mac: [/windows|win32|win64/i, /linux/i],
  mac64: [/windows|win32|win64/i, /linux/i],
  macarm: [/windows|win32|win64/i, /linux/i],
};

function getCurrentPlatformKeys() {
  if (window.NL_OS === "Windows") {
    return window.NL_ARCH === "x64" ? ["win64", "win"] : ["win32", "win"];
  }
  if (window.NL_OS === "Linux") return ["lin"];
  if (window.NL_OS === "Darwin") {
    if (window.NL_ARCH === "x64") return ["mac64", "mac"];
    if (window.NL_ARCH === "arm64") return ["macarm", "mac"];
    return ["mac", "mac64", "macarm"];
  }
  return [];
}

function filterVersionsForCurrentPlatform(versions) {
  const platforms = getCurrentPlatformKeys();
  if (!platforms.length) return versions;
  return versions.filter((version) =>
    platforms.some((platform) => Boolean(version[platform])),
  );
}

function selectAsset(assets, patterns, exclude = [], platform) {
  return assets.find((asset) => {
    const name = asset.name || "";
    return (
      !exclude.some((pattern) => pattern.test(name)) &&
      !(PLATFORM_MISMATCH_PATTERNS[platform] || []).some((pattern) =>
        pattern.test(name),
      ) &&
      patterns.some((pattern) => pattern.test(name))
    );
  });
}

function normalizeRelease(release, source) {
  if (release.draft || !release.tag_name) return null;
  const version = release.tag_name.replace(/^v/i, "");
  const result = { version, releasedAt: release.published_at || null };
  for (const [platform, patterns] of Object.entries(source.assets)) {
    const asset = selectAsset(
      release.assets || [],
      patterns,
      source.exclude,
      platform,
    );
    if (asset?.browser_download_url)
      result[platform] = asset.browser_download_url;
  }
  return Object.keys(result).some(
    (key) => key !== "version" && key !== "releasedAt",
  )
    ? result
    : null;
}

function withLatestReleaseOption(versions, engineId) {
  if (engineId !== "psychonline" || !versions.length) return versions;
  const existingLatest = versions.find(
    (version) => version.version === "Latest",
  );
  if (existingLatest) {
    const releaseVersion = existingLatest.releaseVersion;
    if (
      releaseVersion &&
      !versions.some((version) => version.version === releaseVersion)
    ) {
      return [
        existingLatest,
        { ...existingLatest, version: releaseVersion },
        ...versions.filter((version) => version !== existingLatest),
      ];
    }
    return versions;
  }
  const [latest] = versions;
  return [
    {
      ...latest,
      version: "Latest",
      releaseVersion: latest.version,
      updateKey: `release:${latest.version}`,
    },
    ...versions,
  ];
}

async function getLatestSuccessfulRun(source, artifact) {
  const workflow = encodeURIComponent(artifact.workflow);
  const branch = encodeURIComponent(source.nightly.branch);
  const response = await fetch(
    `https://api.github.com/repos/${source.repository}/actions/workflows/${workflow}/runs?branch=${branch}&status=success&per_page=1`,
    { headers: { Accept: "application/vnd.github+json" } },
  );
  if (!response.ok) throw new Error("GitHub workflow runs request failed");
  return (await response.json()).workflow_runs?.[0] || null;
}

function getCurrentNightlyPlatform(source) {
  const assets = source.nightly.assets;
  const os = window.NL_OS;
  const arch = window.NL_ARCH;

  if (os === "Windows") return arch === "x64" && assets.win64 ? "win64" : "win";
  if (os === "Linux") return "lin";
  if (os === "Darwin") {
    if (arch === "x64" && assets.mac64) return "mac64";
    if (arch === "arm64" && assets.macarm) return "macarm";
    return "mac";
  }
  return null;
}

async function getLatestNightly(source) {
  if (!source.nightly) return null;
  const platform = getCurrentNightlyPlatform(source);
  const cacheKey = `${source.repository}:${platform || "all"}`;
  const cached = nightlyCache.get(cacheKey);
  if (cached && Date.now() - cached.savedAt < NIGHTLY_CACHE_MS) {
    return cached.version;
  }
  const persisted = readNightlyCache(cacheKey);
  if (persisted && Date.now() - persisted.savedAt < NIGHTLY_CACHE_MS) {
    nightlyCache.set(cacheKey, persisted);
    return persisted.version;
  }
  const version = { version: "Nightly", isNightly: true, updateKeys: {} };
  const nightlyAssets = platform
    ? [[platform, source.nightly.assets[platform]]]
    : Object.entries(source.nightly.assets);
  const results = await Promise.allSettled(
    nightlyAssets.map(async ([platform, artifact]) => {
      const run = await getLatestSuccessfulRun(source, artifact);
      if (!run?.id || !run.head_sha) return null;
      return { platform, artifact, run };
    }),
  );

  for (const result of results) {
    if (result.status !== "fulfilled" || !result.value) continue;
    const { platform, artifact, run } = result.value;
    const name = encodeURIComponent(artifact.artifact);
    // A run URL is immutable, unlike nightly.link's branch URL, which moves
    // whenever a later workflow succeeds.
    version[platform] =
      `https://nightly.link/${source.repository}/actions/runs/${run.id}/${name}.zip`;
    version.updateKeys[platform] = `nightly:${run.head_sha}`;
    if (!version.releasedAt || run.updated_at > version.releasedAt) {
      version.releasedAt = run.updated_at || run.created_at || null;
    }
  }

  if (!Object.keys(version.updateKeys).length) {
    const unavailable = { version: null, savedAt: Date.now() };
    nightlyCache.set(cacheKey, unavailable);
    writeNightlyCache(cacheKey, unavailable);
    return null;
  }
  const saved = { version, savedAt: Date.now() };
  nightlyCache.set(cacheKey, saved);
  writeNightlyCache(cacheKey, saved);
  return version;
}

async function withNightlyVersion(versions, source) {
  if (!source.nightly) return versions.filter((version) => !version.isNightly);
  try {
    const nightly = await getLatestNightly(source);
    return nightly
      ? [nightly, ...versions.filter((version) => !version.isNightly)]
      : versions.filter((version) => !version.isNightly);
  } catch {
    return versions.filter((version) => !version.isNightly);
  }
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
    if (!response.ok)
      throw new Error(`GitHub releases request failed: ${response.status}`);
    if (firstResponse) responseEtag = response.headers.get("etag");
    releases.push(...(await response.json()));
    url = getNextPage(response.headers.get("link"));
    firstResponse = false;
  }

  return { releases, etag: responseEtag };
}

async function getLatestRelease(source) {
  const response = await fetch(
    `https://api.github.com/repos/${source.repository}/releases/latest`,
    { headers: { Accept: "application/vnd.github+json" } },
  );
  if (!response.ok) throw new Error("GitHub latest release request failed");
  return normalizeRelease(await response.json(), source);
}

export async function getEngineReleaseVersions(engineId) {
  const source = ENGINE_RELEASE_SOURCES[engineId];
  if (!source) return [];
  const cached = readCache(engineId);
  if (
    cached?.versions?.length &&
    Date.now() - cached.savedAt < CACHE_FRESH_MS
  ) {
    return filterVersionsForCurrentPlatform(
      await withNightlyVersion(
        withLatestReleaseOption(cached.versions, engineId),
        source,
      ),
    );
  }

  try {
    const result = await fetchAllReleases(source, cached?.etag);
    if (result.notModified && cached?.versions?.length) {
      writeCache(engineId, { ...cached, savedAt: Date.now() });
      return filterVersionsForCurrentPlatform(
        await withNightlyVersion(
          withLatestReleaseOption(cached.versions, engineId),
          source,
        ),
      );
    }
    const versions = withLatestReleaseOption(
      result.releases
        .map((release) => normalizeRelease(release, source))
        .filter(Boolean),
      engineId,
    );
    if (versions.length === 0 && !source.nightly) return [];
    writeCache(engineId, {
      versions,
      etag: result.etag,
      savedAt: Date.now(),
    });
    return filterVersionsForCurrentPlatform(
      await withNightlyVersion(versions, source),
    );
  } catch (error) {
    return cached?.versions?.length
      ? filterVersionsForCurrentPlatform(
          await withNightlyVersion(
            withLatestReleaseOption(cached.versions, engineId),
            source,
          ),
        )
      : withNightlyVersion([], source);
  }
}

export async function getEngineUpdateCandidate(engineId) {
  const source = ENGINE_RELEASE_SOURCES[engineId];
  if (!source?.updates) return null;
  if (source.updates.channel === "nightly") {
    return getLatestNightly(source).catch(() => null);
  }
  try {
    const latest = await getLatestRelease(source);
    if (latest) return { ...latest, updateKey: `release:${latest.version}` };
  } catch {}
  const versions = await getEngineReleaseVersions(engineId);
  const version = versions.find(
    (item) => !item.isNightly && item.version !== "Latest",
  );
  return version
    ? { ...version, updateKey: `release:${version.version}` }
    : null;
}
