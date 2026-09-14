import { ENGINE_RELEASE_SOURCES, type EngineReleaseSource } from "./engine-release-sources";

export interface EngineReleaseItem {
  id: string;
  version: string;
  name: string;
  body: string;
  releasedAt: string | null;
  downloadUrl?: string | null;
  assetSize?: number;
  isNightly?: boolean;
  prerelease?: boolean;
}

const CACHE_PREFIX = "weekbox_engine_releases_v2_";
const CACHE_TTL_MS = 60 * 60 * 1000;

function getCurrentPlatformKeys(): string[] {
  if (typeof window !== "undefined") {
    const nl = (window as unknown as { NL_OS?: string; NL_ARCH?: string });
    if (nl.NL_OS === "Windows") {
      return nl.NL_ARCH === "x64" ? ["win64", "win"] : ["win32", "win"];
    }
    if (nl.NL_OS === "Linux") return ["lin"];
    if (nl.NL_OS === "Darwin") {
      if (nl.NL_ARCH === "arm64") return ["macarm", "mac"];
      if (nl.NL_ARCH === "x64") return ["mac64", "mac"];
      return ["mac", "mac64", "macarm"];
    }
  }

  const ua = typeof navigator !== "undefined" ? navigator.userAgent.toLowerCase() : "";
  if (ua.includes("win")) return ["win64", "win", "win32"];
  if (ua.includes("mac")) return ["mac64", "macarm", "mac"];
  if (ua.includes("linux")) return ["lin"];
  return ["win64", "win"];
}

function selectDownloadUrl(
  assets: Array<{ name?: string; browser_download_url?: string; size?: number }>,
  source: EngineReleaseSource
): { url: string | null; size: number } {
  if (!assets || !assets.length) return { url: null, size: 0 };
  const platformKeys = getCurrentPlatformKeys();

  for (const plat of platformKeys) {
    const patterns = source.assets[plat];
    if (!patterns || !patterns.length) continue;

    const matched = assets.find((asset) => {
      const name = asset.name || "";
      if (source.exclude && source.exclude.some((rx) => rx.test(name))) {
        return false;
      }
      return patterns.some((rx) => rx.test(name));
    });

    if (matched && matched.browser_download_url) {
      return { url: matched.browser_download_url, size: Number(matched.size) || 0 };
    }
  }

  return { url: null, size: 0 };
}

function readCache(engineId: string): EngineReleaseItem[] | null {
  try {
    const raw = localStorage.getItem(`${CACHE_PREFIX}${engineId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.data) && Date.now() - parsed.savedAt < CACHE_TTL_MS) {
      return parsed.data;
    }
    return null;
  } catch {
    return null;
  }
}

function writeCache(engineId: string, data: EngineReleaseItem[]): void {
  try {
    localStorage.setItem(
      `${CACHE_PREFIX}${engineId}`,
      JSON.stringify({ savedAt: Date.now(), data })
    );
  } catch {}
}

export async function fetchEngineReleases(engineId: string): Promise<EngineReleaseItem[]> {
  const source = ENGINE_RELEASE_SOURCES[engineId];
  if (!source) return [];

  const cached = readCache(engineId);
  if (cached && cached.length > 0) {
    return cached;
  }

  try {
    const res = await fetch(`https://api.github.com/repos/${source.repository}/releases?per_page=50`, {
      headers: {
        Accept: "application/vnd.github+json",
      },
    });

    if (!res.ok) {
      if (cached) return cached;
      throw new Error(`GitHub request failed: ${res.status}`);
    }

    const rawReleases: any[] = await res.json();
    if (!Array.isArray(rawReleases)) {
      return cached || [];
    }

    const normalized: EngineReleaseItem[] = rawReleases
      .filter((r) => !r.draft && r.tag_name)
      .map((r) => {
        const rawTag = String(r.tag_name || "").trim();
        const cleanVersion = rawTag.replace(/^v/i, "");
        const assetInfo = selectDownloadUrl(r.assets || [], source);

        return {
          id: String(r.id || rawTag),
          version: cleanVersion,
          name: r.name || `Release ${rawTag}`,
          body: r.body || "No release notes provided for this version.",
          releasedAt: r.published_at || null,
          downloadUrl: assetInfo.url,
          assetSize: assetInfo.size,
          prerelease: Boolean(r.prerelease),
        };
      })
      .filter((r) => Boolean(r.downloadUrl));

    if (source.nightly) {
      const platformKeys = getCurrentPlatformKeys();
      const nightlyAssets = source.nightly.assets;
      let matchedArtifact: { workflow: string; artifact: string } | null = null;
      for (const plat of platformKeys) {
        if (nightlyAssets[plat]) {
          matchedArtifact = nightlyAssets[plat];
          break;
        }
      }

      if (matchedArtifact) {
        const branch = encodeURIComponent(source.nightly.branch);
        const workflow = encodeURIComponent(matchedArtifact.workflow.replace(/\.(?:ya?ml)$/i, ""));
        const name = encodeURIComponent(matchedArtifact.artifact);
        const nightlyUrl = `https://nightly.link/${source.repository}/workflows/${workflow}/${branch}/${name}.zip`;

        normalized.unshift({
          id: "nightly",
          version: "Nightly",
          name: "Nightly Build (Latest Commit)",
          body: "### Nightly Build\nAutomated build compiled continuously from the main repository branch. Contains the latest unreleased changes, features, and bugfixes.",
          releasedAt: new Date().toISOString(),
          downloadUrl: nightlyUrl,
          isNightly: true,
        });
      }
    }

    if (normalized.length > 0) {
      writeCache(engineId, normalized);
    }

    return normalized;
  } catch {
    return cached || [];
  }
}
