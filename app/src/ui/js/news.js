import { appEvents } from "../../backend/core/routing/events.service.js";
import { nativeFetch } from "../../backend/services/network/native-http.js";
import { setupDropdown } from "../utils/components/dropdown.component.js";
import { enhanceContentLinks } from "./contentLinks.js";
import { modModal } from "./home/modal/index.js";
import {
  activateCheckoutDialog,
  deactivateCheckoutDialog,
} from "./home/modal/dialogFocus.js";
import { setModalBackdrop } from "./home/modal/modalBackdrop.js";
import { createLoadingState } from "./hourglass.js";
import { t } from "./i18n/index.js";

const NEWS_SOURCES = [
  {
    name: "Funkin News",
    username: "News_Funkin",
  },
  {
    name: "Discussing FNF",
    username: "Discussingfnf",
  },
  {
    name: "FNF Developers",
    username: "FNF_Developers",
  },
  {
    name: "Funkin Interviews",
    username: "Funkininterview",
  },
  {
    name: "GameBanana FNF",
    username: "GameBananaFNF",
  },
  {
    name: "WeekBox",
    username: "WeekBoxTeam",
  },
];
const NEWS_SEEN_KEY = "weekbox_news_seen_v1";
const NEWS_HIDDEN_ACCOUNTS_KEY = "weekbox_news_hidden_accounts_v1";
const NEWS_REQUEST_TIMEOUT = 60000;
const NEWS_PAGE_SIZE = 10;
const NEWS_MAX_PAGES_PER_ACCOUNT = 5;
const FX_TWITTER_PROFILE_API = "https://api.fxtwitter.com/2/profile";
const FX_TWITTER_STATUS_API = "https://api.fxtwitter.com/2/status";
const FX_TWITTER_VIDEO_HOST = "https://video.fxtwitter.com";
let activeNewsMediaPreview = null;
let activeNewsMediaPreviewKeydown = null;

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

function newsDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

function toSafeExternalUrl(value, baseUrl) {
  const url = safeNewsUrl(value, baseUrl);
  return url.startsWith("https://") ? url : "";
}

function isRetweet(post) {
  return Boolean(
    post?.isRetweet ||
      post?.reposted_by ||
      post?.repostedBy ||
      /^RT(?:\s+by)?\s+@/i.test(String(post?.text || post?.title || "").trim()),
  );
}

function mediaIdentity(value) {
  try {
    const url = new URL(value);
    return `${url.hostname}${url.pathname}`.toLowerCase();
  } catch {
    return String(value || "").toLowerCase();
  }
}

function uniqueMediaUrls(values) {
  const seen = new Set();
  return values.filter((value) => {
    const identity = mediaIdentity(value);
    if (!identity || seen.has(identity)) return false;
    seen.add(identity);
    return true;
  });
}

function normalizeFxVideos(media) {
  return Array.isArray(media?.videos)
    ? media.videos
        .map((video) => {
          const formats = [...(video.formats || [])]
            .filter((format) => format.container === "mp4" && format.url)
            .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))
            .map((format) => toSafeExternalUrl(format.url))
            .filter(Boolean)
            .map((url) => {
              const parsed = new URL(url);
              return `${FX_TWITTER_VIDEO_HOST}${parsed.pathname}${parsed.search}`;
            });
          const transcodeUrl = toSafeExternalUrl(video.transcode_url);
          const sources = [
            ...(transcodeUrl ? [transcodeUrl] : []),
            ...formats,
          ];
          return {
            thumbnailUrl: toSafeExternalUrl(video.thumbnail_url),
            url: sources[0] || "",
            sources,
          };
        })
        .filter((video) => video.url || video.thumbnailUrl)
    : [];
}

function openNewsExternal(url) {
  if (typeof Neutralino !== "undefined" && Neutralino.os?.open) {
    void Neutralino.os.open(url).catch(() => {});
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

function appendPostText(root, value) {
  const pattern = /((?:https?:\/\/|www\.)[^\s]+|(?:[\w-]+\.)+(?:com|org|net|io|video)\/[^\s]+|(?<![\w])@\/?[A-Za-z0-9_]{1,15})/gi;
  let cursor = 0;
  for (const match of String(value || "").matchAll(pattern)) {
    const start = match.index;
    const raw = match[0];
    const trailing = raw.match(/[.,!?;:)\]]+$/)?.[0] || "";
    const visibleUrl = trailing ? raw.slice(0, -trailing.length) : raw;
    root.append(document.createTextNode(String(value).slice(cursor, start)));
    const mention = visibleUrl.match(/^@\/?([A-Za-z0-9_]{1,15})$/);
    const href = mention
      ? `https://x.com/${mention[1]}`
      : toSafeExternalUrl(
          visibleUrl.startsWith("http") ? visibleUrl : `https://${visibleUrl}`,
        );
    if (href) {
      const link = document.createElement("a");
      link.href = normalizePostLink(href);
      link.rel = "noopener noreferrer";
      link.textContent = visibleUrl;
      link.addEventListener("click", (event) => {
        event.preventDefault();
        openNewsExternal(link.href);
      });
      root.append(link);
    } else {
      root.append(document.createTextNode(visibleUrl));
    }
    if (trailing) root.append(document.createTextNode(trailing));
    cursor = start + raw.length;
  }
  root.append(document.createTextNode(String(value || "").slice(cursor)));
}

function closeNewsMediaPreview() {
  if (activeNewsMediaPreviewKeydown) {
    document.removeEventListener("keydown", activeNewsMediaPreviewKeydown);
    activeNewsMediaPreviewKeydown = null;
  }
  activeNewsMediaPreview?.querySelectorAll("video").forEach((video) => {
    video.pause();
    video.removeAttribute("src");
    video.load();
  });
  activeNewsMediaPreview?.remove();
  activeNewsMediaPreview = null;
}

function openNewsMediaPreview(source, type, poster = "") {
  if (!source) return;
  closeNewsMediaPreview();
  const overlay = document.createElement("div");
  overlay.className = "news-media-preview";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-label", "Media preview");
  const close = document.createElement("button");
  close.className = "news-media-preview__close";
  close.type = "button";
  close.setAttribute("aria-label", "Close media preview");
  close.innerHTML = '<i class="fa-solid fa-xmark" aria-hidden="true"></i>';
  close.addEventListener("click", closeNewsMediaPreview);
  const media = document.createElement(type === "video" ? "video" : "img");
  media.className = "news-media-preview__content";
  if (type === "video") {
    media.controls = true;
    media.autoplay = true;
    media.playsInline = true;
    media.poster = poster;
  } else {
    media.alt = "Media preview";
  }
  media.src = source;
  overlay.append(close, media);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) closeNewsMediaPreview();
  });
  activeNewsMediaPreview = overlay;
  activeNewsMediaPreviewKeydown = (event) => {
    if (event.key === "Escape") closeNewsMediaPreview();
  };
  document.addEventListener("keydown", activeNewsMediaPreviewKeydown);
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add("show"));
}

function makeMediaPreviewable(element, source, type, poster = "") {
  if (!source) return;
  element.classList.add("news-detail-modal__media-previewable");
  element.tabIndex = 0;
  element.setAttribute("role", "button");
  element.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (element instanceof HTMLVideoElement) element.pause();
    openNewsMediaPreview(source, type, poster);
  });
  element.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    openNewsMediaPreview(source, type, poster);
  });
}

function appendVideoMedia(container, media, post) {
  const frame = document.createElement("div");
  frame.className = "news-detail-modal__media-cell news-detail-modal__video-frame";
  const showFallback = () => {
    frame.replaceChildren();
    if (media.thumbnailUrl) {
      const poster = document.createElement("img");
      poster.src = media.thumbnailUrl;
      poster.alt = "Video thumbnail";
      poster.loading = "lazy";
      makeMediaPreviewable(poster, media.thumbnailUrl, "image");
      frame.appendChild(poster);
    }
    const link = document.createElement("a");
    link.href = post.link;
    link.rel = "noopener noreferrer";
    link.textContent = "Open video on Twitter";
    link.addEventListener("click", (event) => {
      event.preventDefault();
      openNewsExternal(link.href);
    });
    frame.appendChild(link);
  };
  const sources = [...new Set([media.url, ...(media.sources || [])].filter(Boolean))];
  const trySource = (index) => {
    if (!sources[index]) {
      showFallback();
      return;
    }
    frame.replaceChildren();
    const video = document.createElement("video");
    video.controls = true;
    video.preload = "metadata";
    video.poster = media.thumbnailUrl || "";
    video.src = sources[index];
    video.addEventListener("error", () => trySource(index + 1), { once: true });
    makeMediaPreviewable(video, sources[index], "video", media.thumbnailUrl);
    frame.appendChild(video);
  };
  trySource(0);
  container.appendChild(frame);
}

function stopModalVideos(modal) {
  modal.querySelectorAll("video").forEach((video) => {
    video.pause();
    video.removeAttribute("src");
    video.load();
  });
}

function renderModalLoading(modal) {
  const image = modal.querySelector("#news-detail-image");
  const title = modal.querySelector("#news-detail-title");
  const meta = modal.querySelector("#news-detail-meta");
  const excerpt = modal.querySelector("#news-detail-excerpt");
  const body = modal.querySelector("#news-detail-body");
  stopModalVideos(modal);
  title.textContent = "";
  meta.replaceChildren();
  meta.className = "news-detail-modal__meta";
  excerpt.hidden = true;
  body.replaceChildren();
  const loading = document.createElement("p");
  loading.className = "news-detail-modal__post-text";
  loading.textContent = t("news.loadingArticle");
  body.appendChild(loading);
  image.hidden = true;
  setModalBackdrop(modal, "");
}

async function fetchPostDetails(post, signal) {
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

function mergePostDetails(post, detail) {
  if (!detail) return post;
  const rawPhotos = Array.isArray(detail.media?.photos)
    ? detail.media.photos.map((media) => media.url).filter(Boolean)
    : [];
  const videos = normalizeFxVideos(detail.media);
  const videoIdentities = new Set(
    videos.map((media) => media.thumbnailUrl).filter(Boolean).map(mediaIdentity),
  );
  const photos = uniqueMediaUrls(rawPhotos).filter(
    (url) => !videoIdentities.has(mediaIdentity(url)),
  );
  const feedImages = uniqueMediaUrls(post.images || []).filter(
    (url) => !videoIdentities.has(mediaIdentity(url)),
  );
  const author = detail.author || {};
  return {
    ...post,
    text: detail.text || post.text,
    publishedAt: detail.created_at || post.publishedAt,
    link: detail.url || post.link,
    images: photos.length ? photos : feedImages,
    videos,
    authorName: author.name || post.sourceName,
    avatarUrl: author.avatar_url || post.avatarUrl,
    stats: {
      likes: detail.likes,
      reposts: detail.reposts,
      replies: detail.replies,
      quotes: detail.quotes,
      views: detail.views,
    },
    quote: detail.quote?.text || post.quote,
  };
}

function normalizePostLink(value) {
  const link = toSafeExternalUrl(value);
  if (!link) return "";
  try {
    return new URL(link).href;
  } catch {
    return "";
  }
}

async function fetchNewsSource(source, signal, page = {}) {
  const url = new URL(
    `${FX_TWITTER_PROFILE_API}/${encodeURIComponent(source.username)}/statuses`,
  );
  if (page.cursor) url.searchParams.set("cursor", page.cursor);
  console.info(`[WeekBox News] Fetching ${source.name} from FxTwitter`);
  let response = await nativeFetch(url.href, {
    headers: { Accept: "application/json" },
    signal,
  });
  if (response.status === 404 && !signal?.aborted) {
    await new Promise((resolve) => setTimeout(resolve, 250));
    response = await nativeFetch(url.href, {
      headers: { Accept: "application/json" },
      signal,
    });
  }
  if (!response.ok) {
    throw new Error(`${source.name} FxTwitter returned ${response.status}`);
  }
  const payload = await response.json();
  if (payload?.code && payload.code !== 200) {
    throw new Error(`FxTwitter code ${payload.code}`);
  }
  const results = Array.isArray(payload?.results) ? payload.results : [];
  const posts = results
    .filter((status) => status?.type === "status" && !isRetweet(status))
    .filter((status) => !status.replying_to)
    .map((status) => {
      const author = status.author || {};
      const publishedAt = status.created_timestamp
        ? new Date(status.created_timestamp * 1000).toISOString()
        : status.created_at;
      const images = uniqueMediaUrls(
        (status.media?.photos || []).map((photo) => toSafeExternalUrl(photo.url)),
      );
      return {
        id: String(status.id),
        text: String(status.text || "").trim(),
        images,
        videos: normalizeFxVideos(status.media),
        link: normalizePostLink(status.url),
        publishedAt,
        sourceName: author.name || source.name,
        username: author.screen_name || source.username,
        avatarUrl: toSafeExternalUrl(author.avatar_url),
        stats: {
          likes: status.likes,
          reposts: status.reposts,
          replies: status.replies,
          quotes: status.quotes,
          views: status.views,
        },
        quote: status.quote?.text || "",
        isRetweet: false,
      };
    })
    .filter((post) => post.id && post.text && post.link && post.publishedAt);
  const cursor = payload?.cursor?.bottom || "";
  console.info(
    `[WeekBox News] ${source.name} FxTwitter: ${results.length} statuses, ${posts.length} usable posts, pagination cursor ${cursor ? "received" : "missing"}`,
  );
  return { cursor, posts };
}

async function fetchNewsPayload(signal) {
  const results = [];
  for (const source of NEWS_SOURCES) {
    try {
      results.push({
        status: "fulfilled",
        value: await fetchNewsSource(source, signal),
      });
    } catch (reason) {
      if (reason?.name === "AbortError") throw reason;
      console.warn(`[WeekBox News] ${source.name} FxTwitter unavailable`, reason);
      results.push({ status: "rejected", reason });
    }
  }
  const sourcePages = new Map();
  const posts = results.flatMap((result, index) => {
    if (result.status !== "fulfilled") return [];
    const source = NEWS_SOURCES[index];
    sourcePages.set(source.username, {
      cursor: result.value.cursor,
      page: 1,
    });
    return result.value.posts;
  });
  const uniquePosts = [...new Map(posts.map((post) => [post.id, post])).values()]
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .slice(0, 80);
  console.info(
    `[WeekBox News] Combined ${posts.length} parsed posts into ${uniquePosts.length} unique posts`,
  );
  return {
    posts: uniquePosts,
    sourcePages,
    unavailable: !uniquePosts.length && results.every((result) => result.status === "rejected"),
  };
}

function handleNewsLoadError(view, error) {
  if (error?.name === "AbortError") return;
  view.render({ posts: [] });
  view.setStatus(t("news.unavailable"), "error");
  console.warn("WeekBox news feed unavailable", error);
}

function createNewsCard(post, index, openPost) {
  const card = document.createElement("article");
  card.className = "news-view__card";
  card.dataset.postId = post.id;
  card.style.setProperty("--card-index", String(Math.min(index, 7)));
  card.tabIndex = 0;
  card.setAttribute("aria-label", `Open ${post.sourceName} post details`);
  card.addEventListener(
    "click",
    (event) => {
      if (event.target.closest("button")) return;
      if (event.target.closest("a")) {
        event.preventDefault();
        event.stopPropagation();
      }
      openPost(post);
    },
    true,
  );
  card.addEventListener("keydown", (event) => {
    if (event.target.closest("button")) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    openPost(post);
  });

  const header = document.createElement("header");
  header.className = "news-view__post-header";
  const avatar = document.createElement("span");
  avatar.className = "news-view__avatar";
  avatar.setAttribute("aria-hidden", "true");
  if (post.avatarUrl) {
    const image = document.createElement("img");
    image.src = post.avatarUrl;
    image.alt = "";
    image.addEventListener(
      "error",
      () => {
        image.remove();
        avatar.textContent = post.sourceName.charAt(0);
      },
      { once: true },
    );
    avatar.appendChild(image);
  } else avatar.textContent = post.sourceName.charAt(0);
  header.appendChild(avatar);
  const identity = document.createElement("div");
  identity.className = "news-view__identity";
  const author = document.createElement("strong");
  author.textContent = post.sourceName;
  const handle = document.createElement("span");
  handle.textContent = `@${post.username}`;
  identity.append(author, handle);
  header.appendChild(identity);
  const date = document.createElement("time");
  date.className = "news-view__date";
  date.dateTime = new Date(post.publishedAt).toISOString();
  date.textContent = newsDate(post.publishedAt);
  header.appendChild(date);
  card.appendChild(header);

  const body = document.createElement("div");
  body.className = "news-view__card-body";
  const textWrap = document.createElement("div");
  textWrap.className = "news-view__text-wrap";
  const text = document.createElement("p");
  text.className = "news-view__card-text is-collapsed";
  appendPostText(text, post.text);
  textWrap.appendChild(text);
  const showMore = document.createElement("button");
  showMore.className = "news-view__show-more";
  showMore.type = "button";
  showMore.textContent = "Show more";
  showMore.hidden = true;
  showMore.setAttribute("aria-haspopup", "dialog");
  showMore.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    openPost(post);
  });
  textWrap.appendChild(showMore);
  requestAnimationFrame(() => {
    showMore.hidden = text.scrollHeight <= text.clientHeight + 1;
  });
  body.appendChild(textWrap);
  if (post.quote) {
    const quote = document.createElement("blockquote");
    quote.className = "news-view__quote";
    quote.textContent = post.quote;
    body.appendChild(quote);
  }
  const videos = post.videos || [];
  const mediaCount = videos.length + post.images.length;
  if (mediaCount) {
    const media = document.createElement("div");
    media.className = `news-view__media news-view__media--${Math.min(mediaCount, 4)}`;
    videos.forEach((video) => {
      if (!video.thumbnailUrl) return;
      const image = document.createElement("img");
      image.src = video.thumbnailUrl;
      image.alt = "Video thumbnail";
      image.loading = "lazy";
      image.className = "news-view__media-poster";
      media.appendChild(image);
    });
    post.images.forEach((src) => {
      const image = document.createElement("img");
      image.src = src;
      image.alt = "";
      image.loading = "lazy";
      image.addEventListener("error", () => image.remove(), { once: true });
      media.appendChild(image);
    });
    body.appendChild(media);
  }
  const link = document.createElement("a");
  link.className = "news-view__open-link";
  link.href = post.link;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = "Open post on Twitter";
  body.appendChild(link);
  card.appendChild(body);
  return card;
}

export const newsView = {
  request: null,
  bodyRequest: null,
  modal: null,
  account: "",
  hiddenAccounts: new Set(),
  accountMeta: new Map(),
  posts: [],
  sessionLoaded: false,
  visibleCount: NEWS_PAGE_SIZE,
  sourcePages: new Map(),
  loadingMore: false,
  loadMoreRequest: null,
  initialized: false,
  accountDropdownCtrl: null,
  accountClickHandler: null,
  infiniteObserver: null,
  scrollContainer: null,
  scrollHandler: null,

  init() {
    const grid = document.querySelector("[data-news-grid]");
    if (this.initialized && this.grid === grid) return;
    this.grid = grid;
    this.status = document.querySelector("[data-news-status]");
    this.refreshButton = document.querySelector("[data-news-refresh]");
    if (!this.grid || !this.status) return;
    this.initialized = true;
    this.readHiddenAccounts();
    this.setupAccountPicker();
    this.scrollContainer = this.grid.closest(".app-layout__content");
    this.infiniteObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) this.loadMore();
      },
      { root: this.scrollContainer || null, rootMargin: "600px" },
    );
    this.scrollHandler = () => {
      const container = this.scrollContainer;
      if (!container) return;
      if (
        container.scrollTop + container.clientHeight >=
        container.scrollHeight - 700
      ) {
        this.loadMore();
      }
    };
    this.scrollContainer?.addEventListener("scroll", this.scrollHandler, {
      passive: true,
    });
    this.refreshButton?.addEventListener("click", () => void this.load());
    if (this.sessionLoaded) {
      this.render({ posts: this.posts, sourcePages: this.sourcePages });
      this.setStatus("");
      return;
    }
    void this.load();
  },

  destroy() {
    this.request?.abort();
    this.request = null;
    this.loadMoreRequest?.abort();
    this.loadMoreRequest = null;
    this.bodyRequest?.abort();
    this.bodyRequest = null;
    this.closeModal(false);
    this.infiniteObserver?.disconnect();
    this.infiniteObserver = null;
    if (this.scrollHandler) {
      this.scrollContainer?.removeEventListener("scroll", this.scrollHandler);
      this.scrollHandler = null;
    }
    if (this.accountClickHandler) {
      document.removeEventListener("click", this.accountClickHandler);
      this.accountClickHandler = null;
    }
    this.accountDropdownCtrl?.destroy?.();
    this.accountDropdownCtrl = null;
    this.grid = null;
    this.status = null;
    this.refreshButton = null;
    this.scrollContainer = null;
    this.initialized = false;
    this.loadingMore = false;
  },

  setupAccountPicker() {
    const dropdown = document.getElementById("news-account-dropdown");
    const trigger = document.getElementById("news-account-trigger");
    if (!dropdown || !trigger) return;
    this.accountDropdownCtrl = setupDropdown(trigger, dropdown);
    this.accountClickHandler = (event) => {
      const visibility = event.target.closest(
        "#news-account-options .news-account-option__visibility",
      );
      if (visibility) {
        event.preventDefault();
        event.stopPropagation();
        this.toggleAccountVisibility(visibility.dataset.account);
        return;
      }
      const reset = event.target.closest("#news-account-options .news-account-reset");
      if (reset) {
        event.preventDefault();
        event.stopPropagation();
        this.account = "";
        this.accountDropdownCtrl?.close();
        this.visibleCount = NEWS_PAGE_SIZE;
        this.renderAccountOptions();
        this.renderVisiblePosts();
        return;
      }
      const option = event.target.closest(
        "#news-account-options .news-account-option__select",
      );
      if (!option) return;
      this.account =
        this.account === option.dataset.account ? "" : option.dataset.account || "";
      this.accountDropdownCtrl?.close();
      this.visibleCount = NEWS_PAGE_SIZE;
      this.renderAccountOptions();
      this.renderVisiblePosts();
    };
    document.addEventListener("click", this.accountClickHandler);
    this.renderAccountOptions();
  },

  readHiddenAccounts() {
    try {
      const saved = JSON.parse(
        localStorage.getItem(NEWS_HIDDEN_ACCOUNTS_KEY) || "[]",
      );
      this.hiddenAccounts = new Set(
        Array.isArray(saved) ? saved.filter((value) => typeof value === "string") : [],
      );
    } catch {
      this.hiddenAccounts = new Set();
    }
  },

  writeHiddenAccounts() {
    try {
      localStorage.setItem(
        NEWS_HIDDEN_ACCOUNTS_KEY,
        JSON.stringify([...this.hiddenAccounts]),
      );
    } catch {}
  },

  toggleAccountVisibility(username) {
    if (!username) return;
    if (this.hiddenAccounts.has(username)) this.hiddenAccounts.delete(username);
    else this.hiddenAccounts.add(username);
    this.writeHiddenAccounts();
    this.renderAccountOptions();
    this.renderVisiblePosts();
  },

  getFilteredPosts() {
    return this.posts.filter(
      (post) =>
        (!this.account || post.username === this.account) &&
        (this.account || !this.hiddenAccounts.has(post.username)),
    );
  },

  renderAccountOptions() {
    const options = document.getElementById("news-account-options");
    const trigger = document.getElementById("news-account-trigger");
    if (!options || !trigger) return;
    const accounts = NEWS_SOURCES.map((source) => ({
      ...source,
      ...this.accountMeta.get(source.username),
    }));
    options.replaceChildren();
    if (this.account) {
      const reset = document.createElement("button");
      reset.className = "news-account-reset";
      reset.type = "button";
      reset.dataset.account = "";
      reset.textContent = "Show visible feeds";
      options.appendChild(reset);
    }
    accounts.forEach((account) => {
      const row = document.createElement("div");
      row.className = `news-account-option${this.account === account.username ? " selected" : ""}`;
      row.setAttribute("role", "option");
      row.setAttribute("aria-selected", String(this.account === account.username));
      const select = document.createElement("button");
      select.className = "news-account-option__select";
      select.type = "button";
      select.dataset.account = account.username;
      const avatar = document.createElement("span");
      avatar.className = "news-account-option__avatar";
      if (account.avatarUrl) {
        const image = document.createElement("img");
        image.src = account.avatarUrl;
        image.alt = "";
        avatar.appendChild(image);
      } else avatar.textContent = account.name.charAt(0);
      const text = document.createElement("span");
      text.className = "news-account-option__text";
      text.innerHTML = `<strong></strong><small></small>`;
      text.querySelector("strong").textContent = account.name;
      text.querySelector("small").textContent = `@${account.username}`;
      select.append(avatar, text);
      const visibility = document.createElement("button");
      visibility.className = "news-account-option__visibility";
      visibility.type = "button";
      visibility.dataset.account = account.username;
      const visible = !this.hiddenAccounts.has(account.username);
      visibility.setAttribute("aria-label", `${visible ? "Hide" : "Show"} ${account.name}`);
      visibility.setAttribute("aria-pressed", String(visible));
      visibility.innerHTML = `<i class="fa-solid fa-eye${visible ? "" : "-slash"}" aria-hidden="true"></i>`;
      row.append(select, visibility);
      options.appendChild(row);
    });
    const selected = this.account
      ? accounts.find((account) => account.username === this.account)
      : null;
    const icon = trigger.querySelector(".news-account-trigger-icon");
    if (icon && selected?.avatarUrl) {
      const avatar = document.createElement("img");
      icon.className = "filter-engine-icon news-account-trigger-icon news-account-current-avatar";
      avatar.src = selected.avatarUrl;
      avatar.alt = "";
      icon.replaceChildren(avatar);
    } else if (icon) {
      icon.className = "filter-engine-icon news-account-trigger-icon";
      icon.innerHTML = selected
        ? '<i class="fa-solid fa-user" aria-hidden="true"></i>'
        : '<i class="fa-solid fa-users" aria-hidden="true"></i>';
    }
    const label = document.getElementById("news-account-selected");
    if (label) label.textContent = selected?.name || "News feeds";
  },

  async loadMore() {
    const filteredCount = this.getFilteredPosts().length;
    if (this.visibleCount < filteredCount) {
      this.visibleCount = Math.min(
        this.visibleCount + NEWS_PAGE_SIZE,
        filteredCount,
      );
      console.info(`[WeekBox News] Loading more posts: ${this.visibleCount}/${filteredCount}`);
      this.renderVisiblePosts();
      return;
    }
    if (this.loadingMore) return;
    const pages = [...this.sourcePages.entries()].filter(
      ([, page]) => page.cursor && page.page < NEWS_MAX_PAGES_PER_ACCOUNT,
    );
    if (!pages.length) {
      console.info("[WeekBox News] No older FxTwitter cursors available");
      return;
    }
    this.loadingMore = true;
    this.setLoadMoreIndicator(true, true);
    const controller = new AbortController();
    this.loadMoreRequest = controller;
    try {
      const olderPosts = [];
      for (const [username, page] of pages) {
        try {
          const result = await fetchNewsSource(
            NEWS_SOURCES.find((source) => source.username === username),
            controller.signal,
            page,
          );
          olderPosts.push(...result.posts);
          this.sourcePages.set(username, {
            cursor:
              result.cursor && result.cursor !== page.cursor
                ? result.cursor
                : "",
            page: page.page + 1,
          });
        } catch (error) {
          if (error?.name === "AbortError") throw error;
          console.warn(
            `[WeekBox News] ${username} older FxTwitter page unavailable`,
            error,
          );
        }
      }
      const merged = new Map(this.posts.map((post) => [post.id, post]));
      olderPosts.forEach((post) => merged.set(post.id, post));
      this.posts = [...merged.values()].sort(
        (a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt),
      );
      if (olderPosts.length) this.visibleCount += NEWS_PAGE_SIZE;
      console.info(`[WeekBox News] Loaded ${olderPosts.length} older posts`);
      this.renderVisiblePosts();
    } catch (error) {
      if (error?.name !== "AbortError") {
        console.warn("[WeekBox News] Loading older posts failed", error);
        this.renderVisiblePosts();
      }
    } finally {
      this.loadingMore = false;
      if (this.loadMoreRequest === controller) this.loadMoreRequest = null;
    }
  },

  ensureModal() {
    let modal = document.getElementById("news-detail-modal");
    if (!modal) {
      const tpl = document.getElementById("tpl-news-modal");
      if (!tpl) return null;
      const wrapper = document.createElement("div");
      wrapper.innerHTML = tpl.innerHTML;
      modal = wrapper.firstElementChild;
      if (!modal) return null;
      document.body.appendChild(modal);
      modal
        .querySelector("#news-detail-close")
        ?.addEventListener("click", () => this.closeModal());
      modal.addEventListener("click", (event) => {
        if (event.target === modal) this.closeModal();
      });
    }
    this.modal = modal;
    return modal;
  },

  renderModalPost(modal, post) {
    const image = modal.querySelector("#news-detail-image");
    const title = modal.querySelector("#news-detail-title");
    const meta = modal.querySelector("#news-detail-meta");
    const excerpt = modal.querySelector("#news-detail-excerpt");
    const body = modal.querySelector("#news-detail-body");
    title.textContent = post.authorName || post.sourceName;
    title.className = "visually-hidden";
    meta.replaceChildren();
    meta.className = "news-detail-modal__author";
    const avatar = document.createElement("img");
    avatar.src = post.avatarUrl || "";
    avatar.alt = "";
    avatar.hidden = !post.avatarUrl;
    meta.appendChild(avatar);
    const identity = document.createElement("span");
    identity.className = "news-detail-modal__identity";
    const name = document.createElement("strong");
    name.textContent = post.authorName || post.sourceName;
    const handle = document.createElement("span");
    handle.textContent = `@${post.username}`;
    identity.append(name, handle);
    meta.appendChild(identity);
    excerpt.hidden = true;
    stopModalVideos(modal);
    body.replaceChildren();
    const text = document.createElement("p");
    text.className = "news-detail-modal__post-text";
    appendPostText(text, String(post.text || "").trimEnd());
    enhanceContentLinks(text, {
      loadGameBananaDetails: false,
      loadGameBananaTitle: true,
      onGameBanana: (submission) => modModal.openSubmission(submission),
    });
    body.appendChild(text);
    if (post.quote) {
      const quote = document.createElement("blockquote");
      quote.className = "news-view__quote";
      appendPostText(quote, post.quote);
      enhanceContentLinks(quote, {
        loadGameBananaDetails: false,
        loadGameBananaTitle: true,
        onGameBanana: (submission) => modModal.openSubmission(submission),
      });
      body.appendChild(quote);
    }
    const mediaGrid = document.createElement("div");
    const videos = post.videos || [];
    videos.forEach((media) => appendVideoMedia(mediaGrid, media, post));
    post.images.forEach((src) => {
      const cell = document.createElement("div");
      cell.className =
        "news-detail-modal__media-cell news-detail-modal__image-cell";
      const media = document.createElement("img");
      media.src = src;
      media.alt = "";
      media.loading = "lazy";
      makeMediaPreviewable(media, src, "image");
      cell.appendChild(media);
      mediaGrid.appendChild(cell);
    });
    const mediaCount = mediaGrid.childElementCount;
    mediaGrid.className = `news-detail-modal__media-grid news-detail-modal__media-grid--${mediaCount === 1 ? "single" : "collage"}`;
    if (mediaGrid.childElementCount) body.appendChild(mediaGrid);
    const timestamp = document.createElement("time");
    timestamp.className = "news-detail-modal__timestamp";
    timestamp.dateTime = new Date(post.publishedAt).toISOString();
    timestamp.textContent = newsDate(post.publishedAt);
    body.appendChild(timestamp);
    const stats = document.createElement("div");
    stats.className = "news-detail-modal__stats";
    for (const [label, value] of [
      ["Replies", post.stats?.replies],
      ["Reposts", post.stats?.reposts],
      ["Likes", post.stats?.likes],
      ["Quotes", post.stats?.quotes],
      ["Views", post.stats?.views],
    ]) {
      if (value === undefined || value === null) continue;
      const stat = document.createElement("span");
      stat.innerHTML = `<strong>${Number(value).toLocaleString()}</strong> ${label}`;
      stats.appendChild(stat);
    }
    if (stats.childElementCount) body.appendChild(stats);
    const original = document.createElement("a");
    original.href = post.link;
    original.rel = "noopener noreferrer";
    original.textContent = "Open original post on Twitter";
    original.addEventListener("click", (event) => {
      event.preventDefault();
      openNewsExternal(original.href);
    });
    body.appendChild(original);
    image.hidden = true;
    setModalBackdrop(modal, "");
  },

  open(post) {
    const modal = this.ensureModal();
    if (!modal) return;
    this.bodyRequest?.abort();
    this.bodyRequest = new AbortController();
    renderModalLoading(modal);
    modal.style.display = "flex";
    requestAnimationFrame(() => {
      modal.classList.add("show");
      activateCheckoutDialog(
        modal,
        modal.querySelector(".news-detail-modal__body"),
        modal.querySelector("#news-detail-close"),
        () => this.closeModal(),
      );
    });
    fetchPostDetails(post, this.bodyRequest.signal)
      .then((detail) => {
        if (!detail || this.bodyRequest?.signal.aborted) return;
        this.renderModalPost(modal, mergePostDetails(post, detail));
      })
      .catch((error) => {
        if (error?.name === "AbortError") return;
        console.warn("[WeekBox News] FxTwitter post detail unavailable", {
          postId: post.id,
          error,
        });
      });
  },

  closeModal(restoreFocus = true) {
    this.bodyRequest?.abort();
    this.bodyRequest = null;
    const modal = this.modal;
    if (!modal) return;
    closeNewsMediaPreview();
    stopModalVideos(modal);
    deactivateCheckoutDialog(modal, restoreFocus);
    modal.classList.remove("show");
    setTimeout(() => {
      if (!modal.classList.contains("show")) modal.style.display = "none";
    }, 260);
  },

  setStatus(message, state = "") {
    if (!this.status) return;
    this.status.textContent = message;
    this.status.dataset.state = state;
  },

  setLoading() {
    if (!this.grid) return;
    this.grid.replaceChildren(
      createLoadingState(t("news.loading"), 32, "news-view__loading"),
    );
    this.setStatus(t("news.loading"));
  },

  updateUnreadBadge(posts) {
    const badge = document.getElementById("newsletter-unread");
    const validPosts = (Array.isArray(posts) ? posts : []).filter(
      (post) => post && post.id && post.text,
    );
    if (!badge) return;
    if (!validPosts.length) {
      badge.textContent = "";
      badge.hidden = true;
      return;
    }

    let seenId = "";
    try {
      seenId = localStorage.getItem(NEWS_SEEN_KEY) || "";
      if (!seenId) {
        localStorage.setItem(NEWS_SEEN_KEY, String(validPosts[0].id));
        badge.hidden = true;
        return;
      }
    } catch {
      badge.hidden = true;
      return;
    }

    const unread = validPosts.findIndex(
      (post) => String(post.id) === seenId,
    );
    const count = unread < 0 ? validPosts.length : unread;
    badge.textContent = count > 99 ? "99+" : String(count);
    badge.hidden = count === 0;
  },

  markNewsRead(posts) {
    const firstPost = (Array.isArray(posts) ? posts : []).find(
      (post) => post?.id,
    );
    if (!firstPost) return;
    try {
      localStorage.setItem(NEWS_SEEN_KEY, String(firstPost.id));
    } catch {}
    this.updateUnreadBadge(posts);
  },

  render(payload) {
    this.posts = payload.posts
      .filter((post) => post && post.id && post.text)
      .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
    this.accountMeta = new Map(
      this.posts.map((post) => [
        post.username,
        { name: post.sourceName, avatarUrl: post.avatarUrl },
      ]),
    );
    this.renderAccountOptions();
    this.visibleCount = NEWS_PAGE_SIZE;
    this.sourcePages =
      payload.sourcePages instanceof Map
        ? payload.sourcePages
        : new Map(Object.entries(payload.sourcePages || {}));
    this.renderVisiblePosts();
  },

  renderVisiblePosts() {
    if (!this.grid) return;
    const filteredPosts = this.getFilteredPosts();
    const posts = filteredPosts.slice(0, this.visibleCount);
    console.info(`[WeekBox News] Rendering ${posts.length} visible posts`);

    for (const child of this.grid.children) {
      if (!child.classList.contains("news-view__card")) child.remove();
    }
    const existing = new Map(
      [...this.grid.querySelectorAll(":scope > .news-view__card")].map((card) => [
        card.dataset.postId,
        card,
      ]),
    );
    const visibleIds = new Set(posts.map((post) => post.id));

    if (!posts.length) {
      this.grid.replaceChildren();
      const empty = document.createElement("p");
      empty.className = "news-view__empty";
      empty.textContent = t("news.noNews");
      this.grid.appendChild(empty);
      return;
    }

    let anchor = this.grid.firstElementChild;
    for (const [index, post] of posts.entries()) {
      const card =
        existing.get(post.id) || createNewsCard(post, index, (selected) => this.open(selected));
      card.style.setProperty("--card-index", String(Math.min(index, 7)));
      if (card !== anchor) this.grid.insertBefore(card, anchor);
      anchor = card.nextElementSibling;
    }
    for (const [id, card] of existing) {
      if (!visibleIds.has(id)) card.remove();
    }

    const hasOlderPages = [...this.sourcePages.values()].some(
      (page) => page.cursor && page.page < NEWS_MAX_PAGES_PER_ACCOUNT,
    );
    this.setLoadMoreIndicator(posts.length < filteredPosts.length || hasOlderPages);
  },

  setLoadMoreIndicator(visible = false, loading = false) {
    this.grid?.querySelector(".news-view__load-sentinel")?.remove();
    if (!visible || !this.grid) return;
    const sentinel = document.createElement("div");
    sentinel.className = "news-view__load-sentinel";
    sentinel.setAttribute("aria-live", "polite");
    sentinel.textContent = loading ? "Loading more…" : "";
    this.grid.appendChild(sentinel);
    this.infiniteObserver?.observe(sentinel);
  },

  async load() {
    if (!this.grid || !this.status) return;
    this.sessionLoaded = false;
    this.setLoading();
    this.request?.abort();
    const controller = new AbortController();
    this.request = controller;
    const timeout = setTimeout(() => controller.abort(), NEWS_REQUEST_TIMEOUT);
    if (this.refreshButton) this.refreshButton.disabled = true;
    try {
      const payload = await fetchNewsPayload(controller.signal);
      this.sessionLoaded = !payload.unavailable;
      this.updateUnreadBadge(payload.posts);
      this.render(payload);
      this.markNewsRead(payload.posts);
      this.setStatus(payload.unavailable ? t("news.unavailable") : "", payload.unavailable ? "error" : "");
    } catch (error) {
      handleNewsLoadError(this, error);
    } finally {
      clearTimeout(timeout);
      if (this.request === controller) this.request = null;
      if (this.refreshButton) this.refreshButton.disabled = false;
    }
  },
};

export function registerNewsView() {
  appEvents.addEventListener("view:loaded", (event) => {
    if (event.detail === "news") newsView.init();
    else newsView.destroy();
  });
}
