const FX_TWITTER_VIDEO_HOST = "https://video.fxtwitter.com";

function safeNewsUrl(value, baseUrl = "https://x.com/") {
  try {
    const rawValue = String(value || "").trim();
    const relativeValue = rawValue.startsWith("/")
      ? rawValue.slice(1)
      : rawValue;
    const url = new URL(relativeValue, baseUrl);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.href
      : "";
  } catch {
    return "";
  }
}

export function newsDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

export function toSafeExternalUrl(value, baseUrl) {
  const url = safeNewsUrl(value, baseUrl);
  return url.startsWith("https://") ? url : "";
}

export function isRetweet(post) {
  return Boolean(
    post?.isRetweet ||
    post?.reposted_by ||
    post?.repostedBy ||
    /^RT(?:\s+by)?\s+@/i.test(String(post?.text || post?.title || "").trim()),
  );
}

export function hasNewsContent(post) {
  return Boolean(
    post?.id &&
    (String(post.text || "").trim() || post.quote?.id) &&
    post.link &&
    post.publishedAt &&
    !Number.isNaN(Date.parse(post.publishedAt)),
  );
}

export function normalizePublishedAt(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

export function mediaIdentity(value) {
  try {
    const url = new URL(value);
    return `${url.hostname}${url.pathname}`.toLowerCase();
  } catch {
    return String(value || "").toLowerCase();
  }
}

export function uniqueMediaUrls(values) {
  const seen = new Set();
  return values.filter((value) => {
    const identity = mediaIdentity(value);
    if (!identity || seen.has(identity)) return false;
    seen.add(identity);
    return true;
  });
}

export function normalizeFxVideos(media) {
  return Array.isArray(media?.videos)
    ? media.videos
        .map((video) => {
          const formats = [
            ...(Array.isArray(video?.formats) ? video.formats : []),
          ]
            .filter((format) => format.container === "mp4" && format.url)
            .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))
            .map((format) => toSafeExternalUrl(format.url))
            .filter(Boolean)
            .map((url) => {
              const parsed = new URL(url);
              return `${FX_TWITTER_VIDEO_HOST}${parsed.pathname}${parsed.search}`;
            });
          const transcodeUrl = toSafeExternalUrl(video?.transcode_url);
          const sources = [...(transcodeUrl ? [transcodeUrl] : []), ...formats];
          return {
            thumbnailUrl: toSafeExternalUrl(video.thumbnail_url),
            url: sources[0] || "",
            sources,
          };
        })
        .filter((video) => video.url || video.thumbnailUrl)
    : [];
}

function normalizeNewsAuthor(author, source, nested) {
  const name = author.name || author.screen_name;
  return {
    sourceName: name || (nested ? "Quoted post" : source.name),
    username: author.screen_name || (nested ? "" : source.username),
    avatarUrl: toSafeExternalUrl(author.avatar_url),
  };
}

function normalizeNewsMedia(status) {
  return {
    images: uniqueMediaUrls(
      (Array.isArray(status?.media?.photos) ? status.media.photos : []).map(
        (photo) => toSafeExternalUrl(photo?.url),
      ),
    ),
    videos: normalizeFxVideos(status?.media),
  };
}

function normalizeNewsStats(status) {
  return {
    likes: status?.likes,
    reposts: status?.reposts,
    replies: status?.replies,
    quotes: status?.quotes,
    views: status?.views,
  };
}

export function normalizeNewsStatus(status, source, nested = false) {
  const author =
    !nested && source.includeReposts && status?.reposted_by
      ? status.reposted_by
      : status?.author || {};
  const timestamp =
    status?.created_timestamp != null
      ? normalizePublishedAt(Number(status.created_timestamp) * 1000)
      : "";
  const normalized = {
    id: String(status?.id || ""),
    text: String(status?.text || "").trim(),
    ...normalizeNewsMedia(status),
    link: normalizePostLink(status?.url),
    publishedAt: timestamp || normalizePublishedAt(status?.created_at),
    ...normalizeNewsAuthor(author, source, nested),
    stats: normalizeNewsStats(status),
    quote: null,
    isRetweet: false,
  };
  if (!nested && status?.quote) {
    normalized.quote = normalizeNewsStatus(status.quote, source, true);
  }
  return normalized;
}

export function normalizePostLink(value) {
  const link = toSafeExternalUrl(value);
  if (!link) return "";
  try {
    return new URL(link).href;
  } catch {
    return "";
  }
}
