import { ItchClient } from "itchlib";
import { nativeFetch } from "../../services/network/native-http.js";

const ITCH_REQUEST_TIMEOUT_MS = 15_000;

const itchClient = new ItchClient({
  fetch: (url, options = {}) =>
    nativeFetch(url, {
      ...options,
      body:
        options.body instanceof URLSearchParams
          ? options.body.toString()
          : options.body,
    }),
  timeout: ITCH_REQUEST_TIMEOUT_MS,
});

function parseUploads(uploads, source) {
  const platformUploads = {};
  for (const [platform, pattern] of Object.entries(source.platforms)) {
    const upload = uploads.find((item) => {
      pattern.lastIndex = 0;
      return pattern.test(item.name);
    });
    if (upload) {
      platformUploads[platform] = {
        id: upload.id || undefined,
        name: upload.name,
        size: upload.size,
        version: upload.version || "",
      };
    }
  }
  return platformUploads;
}

function getReleaseVersion(uploads) {
  return uploads.find((upload) => upload.version)?.version || "";
}

export async function getItchRelease(source, githubRepository = "") {
  const game = await itchClient.getGame(source.pageUrl);
  const uploads = parseUploads(game.uploads, source);
  const version = getReleaseVersion(game.uploads);
  if (!version) return null;

  return {
    version,
    label: `Itch (${version})`,
    itch: {
      pageUrl: source.pageUrl,
      platforms: Object.keys(uploads),
      uploads,
    },
    githubRepository,
  };
}

export async function resolveItchDownloadUrl(itch, platform) {
  const uploads = await itchClient.getDownloadUploads(itch.pageUrl);
  const patterns = {
    win: /windows/i,
    lin: /linux/i,
    mac: /mac/i,
  };
  const pattern = patterns[platform];
  if (!pattern) throw new Error("Unsupported Itch.io platform");

  const upload = uploads.find((item) => {
    pattern.lastIndex = 0;
    return pattern.test(item.name);
  });
  if (!upload?.id) throw new Error("Itch.io upload is unavailable");

  return itchClient.getDownloadUrl(itch.pageUrl, upload.id);
}
