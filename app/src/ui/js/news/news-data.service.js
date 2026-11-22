import { nativeFetch } from "../../../backend/services/network/native-http.js";
import {
  hasNewsContent,
  isRetweet,
  mediaIdentity,
  normalizeFxVideos,
  normalizeNewsStatus,
  normalizePostLink,
  normalizePublishedAt,
  toSafeExternalUrl,
  uniqueMediaUrls,
} from "./news-model.js";
import {
  shouldRetryNewsSource,
  waitForNewsRetry,
  getNewsAbortReason,
} from "../newsRetry.util.mjs";

export const NEWS_SOURCES = [
  { name: "Funkin News", username: "News_Funkin" },
  { name: "FunkinFest", username: "FunkinFest" },
  { name: "Discussing FNF", username: "Discussingfnf" },
  { name: "FNF Developers", username: "FNF_Developers" },
  { name: "Funkin Interviews", username: "Funkininterview" },
  { name: "GameBanana FNF", username: "GameBananaFNF" },
  { name: "WeekBox", username: "WeekBoxTeam" },
  { name: "DirectMania", username: "DirectMania" },
  { name: "FunkCon", username: "FunkCon24", includeReposts: true },
];

export const NEWS_REQUEST_TIMEOUT = 60000;
export const NEWS_PAGE_SIZE = 10;
export const NEWS_MAX_PAGES_PER_ACCOUNT = 5;
const NEWS_SOURCE_CONCURRENCY = 3;
const NEWS_SOURCE_MAX_ATTEMPTS = 3;
const NEWS_SOURCE_RETRY_DELAY = 500;
const FX_TWITTER_PROFILE_API = "https://api.fxtwitter.com/2/profile";
const FX_TWITTER_STATUS_API = "https://api.fxtwitter.com/2/status";

export async function fetchPostDetails(post, signal) {
  const response = await nativeFetch(
    `${FX_TWITTER_STATUS_API}/${encodeURIComponent(post.id)}`,
    { signal },
  );
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const payload = await response.json();
  if (payload?.code && payload.code !== 200) {
    throw new Error(`FxTwitter code ${payload.code}`);
  }
  return payload?.status || null;
}

export function mergePostDetails(post, detail) {
  if (!detail) return post;
  const rawPhotos = Array.isArray(detail.media?.photos)
    ? detail.media.photos.map((media) => media.url).filter(Boolean)
    : [];
  const videos = normalizeFxVideos(detail.media);
  const videoIdentities = new Set(
    videos
      .map((media) => media.thumbnailUrl)
      .filter(Boolean)
      .map(mediaIdentity),
  );
  const photos = uniqueMediaUrls(rawPhotos).filter(
    (url) => !videoIdentities.has(mediaIdentity(url)),
  );
  const feedImages = uniqueMediaUrls(post.images || []).filter(
    (url) => !videoIdentities.has(mediaIdentity(url)),
  );
  const author = detail.author || {};
  const quote = detail.quote
    ? normalizeNewsStatus(
        detail.quote,
        {
          name: post.quote?.sourceName || "Quoted post",
          username: post.quote?.username || "",
        },
        true,
      )
    : post.quote;
  return {
    ...post,
    text: detail.text || post.text,
    publishedAt: normalizePublishedAt(detail.created_at) || post.publishedAt,
    link: normalizePostLink(detail.url) || post.link,
    images: photos.length ? photos : feedImages,
    videos,
    authorName: author.name || post.sourceName,
    avatarUrl: toSafeExternalUrl(author.avatar_url) || post.avatarUrl,
    stats: {
      likes: detail.likes,
      reposts: detail.reposts,
      replies: detail.replies,
      quotes: detail.quotes,
      views: detail.views,
    },
    quote,
  };
}

export async function fetchNewsSource(source, signal, page = {}) {
  const url = new URL(
    `${FX_TWITTER_PROFILE_API}/${encodeURIComponent(source.username)}/statuses`,
  );
  if (page.cursor) url.searchParams.set("cursor", page.cursor);
  for (let attempt = 0; attempt < NEWS_SOURCE_MAX_ATTEMPTS; attempt += 1) {
    try {
      return await fetchNewsSourceAttempt(source, url, signal, attempt);
    } catch (error) {
      if (!shouldRetryNewsSource(error, attempt, NEWS_SOURCE_MAX_ATTEMPTS))
        throw error;
      await waitForNewsRetry(signal, NEWS_SOURCE_RETRY_DELAY * 2 ** attempt);
    }
  }
  throw new Error(`${source.name} FxTwitter request failed`);
}

async function fetchNewsSourceAttempt(source, url, signal, attempt) {
  if (signal?.aborted) throw getNewsAbortReason(signal);
  console.info(
    `[WeekBox News] Fetching ${source.name} from FxTwitter${attempt ? ` (retry ${attempt}/${NEWS_SOURCE_MAX_ATTEMPTS - 1})` : ""}`,
  );
  const response = await nativeFetch(url.href, {
    headers: { Accept: "application/json" },
    signal,
  });
  if (!response.ok) {
    const error = new Error(
      `${source.name} FxTwitter returned ${response.status}`,
    );
    error.status = response.status;
    throw error;
  }
  const payload = await response.json();
  if (payload?.code && payload.code !== 200) {
    throw new Error(`FxTwitter code ${payload.code}`);
  }
  const results = Array.isArray(payload?.results) ? payload.results : [];
  const posts = results
    .filter(
      (status) =>
        status?.type === "status" &&
        (source.includeReposts || !isRetweet(status)),
    )
    .filter((status) => !status.replying_to)
    .map((status) => normalizeNewsStatus(status, source))
    .filter(hasNewsContent);
  const cursor = payload?.cursor?.bottom || "";
  console.info(
    `[WeekBox News] ${source.name} FxTwitter: ${results.length} statuses, ${posts.length} usable posts, pagination cursor ${cursor ? "received" : "missing"}`,
  );
  return { cursor, posts };
}

export async function fetchNewsPayload(signal, onPartial) {
  const results = [];
  const availableSources = new Set();
  const sourcePages = new Map();
  const postsById = new Map();
  for (
    let index = 0;
    index < NEWS_SOURCES.length;
    index += NEWS_SOURCE_CONCURRENCY
  ) {
    const batch = NEWS_SOURCES.slice(index, index + NEWS_SOURCE_CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map(async (source) => {
        try {
          return {
            source,
            status: "fulfilled",
            value: await fetchNewsSource(source, signal),
          };
        } catch (reason) {
          if (reason?.name === "AbortError") throw reason;
          console.warn(
            `[WeekBox News] ${source.name} FxTwitter unavailable`,
            reason,
          );
          return { source, status: "rejected", reason };
        }
      }),
    );

    for (const result of batchResults) {
      results.push(result);
      if (result.status !== "fulfilled") continue;
      availableSources.add(result.source.username);
      sourcePages.set(result.source.username, {
        cursor: result.value.cursor,
        page: 1,
      });
      result.value.posts.forEach((post) => postsById.set(post.id, post));
      const uniquePosts = [...postsById.values()]
        .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
        .slice(0, 80);
      if (uniquePosts.length) {
        onPartial?.({
          posts: uniquePosts,
          sourcePages,
          availableSources: new Set(availableSources),
        });
      }
    }
  }
  const uniquePosts = [...postsById.values()]
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .slice(0, 80);
  console.info(
    `[WeekBox News] Combined ${postsById.size} parsed posts into ${uniquePosts.length} unique posts`,
  );
  return {
    posts: uniquePosts,
    sourcePages,
    availableSources,
    unavailable:
      !uniquePosts.length &&
      results.every((result) => result.status === "rejected"),
  };
}
