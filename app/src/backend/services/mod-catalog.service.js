import { backstageApi } from "../providers/backstage/backstage.provider.js";
import { gameJoltApi } from "../providers/gamejolt/gamejolt.provider.js";
import { gameBananaApi } from "../providers/gamebanana/gamebanana.provider.js";
import { peoApi } from "../providers/peo/peo.provider.js";

function getExternalProviderId(modId) {
  return String(modId).match(/^(peo|backstage|gamejolt):(.+)$/);
}

function resolveModIdFromUrl(value) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    let match;
    if (
      host === "gamebanana.com" &&
      (match = url.pathname.match(/^\/(mods|tools)\/(\d+)(?:\/|$)/i))
    ) {
      return `${match[1].toLowerCase() === "tools" ? "tool" : "mod"}:${match[2]}`;
    }
    if (
      host === "gamejolt.com" &&
      (match = url.pathname.match(/^\/games\/(?:[^/]+\/)?(\d+)(?:\/|$)/i))
    ) {
      return `gamejolt:${match[1]}`;
    }
    if (
      host === "funkinbackstage.net" &&
      (match = url.pathname.match(/^\/mods\/([a-z0-9]+)\/?$/i))
    ) {
      return `backstage:${match[1]}`;
    }
    if (
      host === "funkin.sniro.boo" &&
      (match = url.pathname.match(/^\/mod\/([^/]+)\/?$/i))
    ) {
      return `peo:${decodeURIComponent(match[1])}`;
    }
  } catch {}
  return null;
}

function parseProviderImportUrl(value) {
  if (/^\d+$/.test(value)) {
    return {
      provider: "gamebanana",
      id: value,
      type: "mod",
      url: `https://gamebanana.com/mods/${value}`,
    };
  }
  let url;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (!/^https?:$/.test(url.protocol)) return null;
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (host === "gamebanana.com" || host.endsWith(".gamebanana.com")) {
    const source = gameBananaApi.getGameBananaSubmission(url.href);
    const match = url.pathname.match(/^\/(mods|tools)\/(\d+)(?:\/|$)/i);
    const parsed =
      source ||
      (match ? { type: match[1].slice(0, -1), id: Number(match[2]) } : null);
    return parsed?.id
      ? {
          provider: "gamebanana",
          id: String(parsed.id),
          type: parsed.type === "tool" ? "tool" : "mod",
          url: url.href,
        }
      : null;
  }
  if (host === "funkin.sniro.boo") {
    const match = url.pathname.match(/^\/mod\/([^/]+)\/?$/i);
    return match
      ? {
          provider: "peo",
          id: decodePath(match[1]),
          type: "mod",
          url: url.href,
        }
      : null;
  }
  if (host === "funkinbackstage.net" || host === "api.funkinbackstage.net") {
    const match = url.pathname.match(/^\/mods\/([a-z0-9_-]+)\/?$/i);
    return match
      ? {
          provider: "backstage",
          id: decodePath(match[1]),
          type: "mod",
          url: url.href,
        }
      : null;
  }
  if (host === "gamejolt.com" || host.endsWith(".gamejolt.com")) {
    const match = url.pathname.match(/^\/games\/[^/]+\/(\d+)(?:\/|$)/i);
    return match
      ? {
          provider: "gamejolt",
          id: match[1],
          type: "mod",
          url: `https://gamejolt.com/games/${url.pathname
            .split("/")
            .filter(Boolean)
            .slice(-2)
            .join("/")}`,
        }
      : null;
  }
  return null;
}

export const modCatalogService = {
  isExternalModId(modId) {
    return Boolean(getExternalProviderId(modId));
  },

  getEngineIdForSubmission(type, id) {
    return gameBananaApi.getEngineIdForSubmission(type, id);
  },

  getModDetails(modId, onProgress) {
    const providerId = getExternalProviderId(modId);
    return this.getDetailsForSource(
      providerId
        ? { provider: providerId[1], id: providerId[2], type: "mod" }
        : { provider: "gamebanana", id: modId, type: "mod" },
      { onProgress },
    );
  },

  getToolDetails(toolId, options) {
    return gameBananaApi.getToolDetails(toolId, options);
  },

  getDetailsForSource(source, options = {}, fallbackModId = null) {
    if (source?.provider === "backstage" && source.id) {
      return backstageApi.getModDetails(source.id);
    }
    if (source?.provider === "gamejolt" && source.id) {
      return gameJoltApi.getGameDetails(source.id);
    }
    if (source?.provider === "peo" && source.id) {
      return peoApi.getModDetails(source.id);
    }
    if (source?.provider === "gamebanana" && source.id) {
      return source.type === "tool"
        ? gameBananaApi.getToolDetails(source.id, options)
        : gameBananaApi.getModDetails(source.id, options);
    }
    return fallbackModId
      ? gameBananaApi.getModDetails(fallbackModId, options)
      : Promise.resolve(null);
  },

  getEngineIdForCategory(categoryId) {
    return gameBananaApi.getEngineIdForCategory(categoryId);
  },

  parseSubmissionUrl(value) {
    const gameBananaSubmission = gameBananaApi.getGameBananaSubmission(value);
    if (gameBananaSubmission) {
      return { kind: "gamebanana", submission: gameBananaSubmission };
    }

    const parsedUrl = new URL(value);
    const peoMatch = parsedUrl.pathname.match(/^\/mod\/([^/]+)\/?$/i);
    if (/(?:^|\.)sniro\.boo$/i.test(parsedUrl.hostname) && peoMatch) {
      return { kind: "peo", modId: `peo:${decodePath(peoMatch[1])}` };
    }
    const backstageMatch = parsedUrl.pathname.match(
      /^\/mods\/([a-z0-9_-]+)\/?$/i,
    );
    if (
      /^(?:www\.)?funkinbackstage\.net$/i.test(parsedUrl.hostname) &&
      backstageMatch
    ) {
      return {
        kind: "backstage",
        modId: `backstage:${decodePath(backstageMatch[1])}`,
      };
    }
    const gameJoltMatch = parsedUrl.pathname.match(
      /^\/games\/(?:[^/]+\/)?(\d+)(?:\/|$)/i,
    );
    if (/(?:^|\.)gamejolt\.com$/i.test(parsedUrl.hostname) && gameJoltMatch) {
      return { kind: "gamejolt", modId: `gamejolt:${gameJoltMatch[1]}` };
    }
    return null;
  },

  getSubmissionDetails(
    submission,
    { loadDetails = true, loadTitle = false } = {},
  ) {
    if (loadDetails) {
      return submission.type === "tool"
        ? gameBananaApi.getToolDetails(submission.id, {
            requireDownload: false,
          })
        : gameBananaApi.getModDetails(submission.id, {
            includeRequirements: false,
          });
    }
    if (submission.type === "tool") {
      return gameBananaApi.getToolDetails(submission.id, {
        requireDownload: false,
      });
    }
    if (!loadTitle) return Promise.resolve(null);
    return gameBananaApi
      .getModProfile(submission.id)
      .then((profile) => (profile ? { title: profile._sName } : null));
  },

  getAuthorProfile(authorId, source) {
    return source === "backstage"
      ? backstageApi.getUserProfile(authorId)
      : gameBananaApi.getMemberProfile(authorId);
  },

  getAuthorContributions(authorId, source) {
    return source === "backstage"
      ? backstageApi.getUserContributions(authorId)
      : gameBananaApi.getMemberMods(authorId);
  },

  resolveModIdFromUrl(value) {
    return resolveModIdFromUrl(value);
  },

  parseProviderImportUrl(value) {
    return parseProviderImportUrl(value);
  },

  getProviderImportDetails(source) {
    if (!source?.provider || !source.id) return null;
    return this.getDetailsForSource(
      source,
      source.provider === "gamebanana"
        ? source.type === "tool"
          ? { requireDownload: false }
          : { includeRequirements: false }
        : {},
    );
  },

  getSearchSuggestions(query, model) {
    return gameBananaApi.getSearchSuggestions(query, model);
  },

  getHomeFeaturedMods(source) {
    if (source === "psychonline") return Promise.resolve([]);
    if (source === "backstage") {
      return backstageApi
        .getMods({ featured: true, sort: "activity", page: 1, limit: 12 })
        .then((result) => result.mods);
    }
    return gameBananaApi.getFeaturedCarousel();
  },

  getBackstageCarouselFallback() {
    return backstageApi.getMods({ sort: "activity", page: 1, limit: 1 });
  },
};

function decodePath(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
