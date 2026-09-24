import { appEvents } from "../../backend/core/routing/events.service.js";
import { nativeFetch } from "../../backend/services/network/native-http.js";
import { enhanceContentLinks } from "./contentLinks.js";
import { Marked } from "marked";
import {
  activateCheckoutDialog,
  deactivateCheckoutDialog,
} from "./home/modal/dialogFocus.js";
import { setModalBackdrop } from "./home/modal/modalBackdrop.js";
import { createLoadingState } from "./hourglass.js";
import { modModal } from "./home/modal/index.js";
import { sanitizeReleaseHtml } from "./engines/releaseNotes.js";
import { t } from "./i18n/index.js";

const NEWS_REPOSITORY = "Crew-Awesome/weekbox.news";
const NEWS_BRANCH = "main";
const NEWS_RAW_URL = `https://raw.githubusercontent.com/${NEWS_REPOSITORY}/${NEWS_BRANCH}`;
const NEWS_PUBLIC_URL = `${NEWS_RAW_URL}/public`;
const NEWS_INDEX_PATH = "content/news/index.json";
const NEWS_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/i;
const NEWS_CACHE_KEY = "weekbox_news_feed_v9";
const NEWS_SEEN_KEY = "weekbox_news_seen_v1";
const NEWS_REQUEST_TIMEOUT = 8000;

function safeNewsUrl(value, baseUrl = `${NEWS_PUBLIC_URL}/`) {
  try {
    const rawValue = String(value || "").trim();
    const rootRelative = rawValue.startsWith("/");
    const relativeValue = rawValue.startsWith("/")
      ? rawValue.slice(1)
      : rawValue;
    const url = new URL(
      relativeValue,
      rootRelative ? `${NEWS_PUBLIC_URL}/` : baseUrl,
    );
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

function githubRawUrl(path) {
  return `${NEWS_RAW_URL}/${path.split("/").map(encodeURIComponent).join("/")}`;
}

function githubRawDirectoryUrl(path) {
  return githubRawUrl(path.slice(0, path.lastIndexOf("/") + 1));
}

async function fetchNewsPost(catalogPost, signal) {
  const slug = catalogPost.slug;
  const postPath = `content/news/posts/${slug}/post.json`;
  const response = await nativeFetch(githubRawUrl(postPath), {
    headers: { Accept: "application/json" },
    signal,
  });
  if (!response.ok)
    throw new Error(`GitHub news post returned ${response.status}`);
  const post = await response.json();
  return normalizeNewsPost(post, catalogPost, postPath);
}

async function fetchNewsBody(post, signal) {
  const bodyPath = `${post.sourcePath.slice(0, post.sourcePath.lastIndexOf("/"))}/body.md`;
  const response = await nativeFetch(githubRawUrl(bodyPath), {
    headers: { Accept: "text/markdown" },
    signal,
  });
  if (!response.ok)
    throw new Error(`GitHub news body returned ${response.status}`);
  return response.text();
}

function normalizeNewsPost(post, catalogPost, sourcePath) {
  if (!post || typeof post !== "object") return null;
  const slug =
    typeof catalogPost.slug === "string"
      ? catalogPost.slug.trim().toLowerCase()
      : "";
  const publishedAt = Date.parse(catalogPost.publishedAt || "");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return null;
  if (typeof post.title !== "string" || !post.title.trim()) return null;
  if (!Number.isFinite(publishedAt) || publishedAt > Date.now()) return null;
  return {
    slug,
    title: post.title.trim(),
    excerpt: typeof post.excerpt === "string" ? post.excerpt.trim() : "",
    publishedAt: catalogPost.publishedAt,
    coverUrl:
      typeof post.coverUrl === "string" && post.coverUrl.trim()
        ? post.coverUrl
        : "/assets/images/banner.webp",
    tags: Array.isArray(catalogPost.tags)
      ? catalogPost.tags.filter((tag) => typeof tag === "string").slice(0, 8)
      : [],
    body: typeof post.body === "string" ? post.body : "",
    sourcePath,
    sourceBaseUrl: githubRawDirectoryUrl(sourcePath),
  };
}

async function fetchNewsPayload(signal) {
  const indexResponse = await nativeFetch(githubRawUrl(NEWS_INDEX_PATH), {
    headers: { Accept: "application/json" },
    signal,
  });
  if (!indexResponse.ok)
    throw new Error(`GitHub news index returned ${indexResponse.status}`);
  const index = await indexResponse.json();
  const now = Date.now();
  const catalogPosts = Array.isArray(index?.posts)
    ? index.posts
        .filter(
          (post) =>
            post &&
            typeof post === "object" &&
            typeof post.slug === "string" &&
            NEWS_SLUG.test(post.slug) &&
            Number.isFinite(Date.parse(post.publishedAt)) &&
            Date.parse(post.publishedAt) <= now,
        )
        .slice(0, 24)
    : [];
  const posts = await Promise.all(
    catalogPosts.map((post) => fetchNewsPost(post, signal)),
  );
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    posts: posts.filter(Boolean).slice(0, 24),
  };
}

const newsMarkdown = new Marked({ gfm: true, breaks: false });

function renderNewsMarkdown(value, post) {
  const source = String(value || "").replace(/\r\n?/g, "\n");
  if (!source.trim()) return "";
  const html = newsMarkdown.parse(source, {
    walkTokens(token) {
      if (token.type !== "link" && token.type !== "image") return;
      token.href = token.href
        ? safeNewsUrl(token.href, post?.sourceBaseUrl)
        : "";
    },
  });
  return sanitizeReleaseHtml(html);
}

function renderNewsMeta(meta, post) {
  meta.replaceChildren();
  const date = newsDate(post.publishedAt);
  if (date)
    meta.appendChild(
      Object.assign(document.createElement("span"), { textContent: date }),
    );
  if (post.tags?.length)
    meta.appendChild(
      Object.assign(document.createElement("span"), {
        textContent: String(post.tags[0]),
      }),
    );
}

function applyNewsCover(modal, image, post, coverUrl) {
  image.hidden = !coverUrl;
  image.src = coverUrl;
  image.alt = post.title ? `${post.title} cover` : "";
  setModalBackdrop(modal, coverUrl);
}

function applyCachedNews(view, cached, badgeOnly) {
  if (cached) {
    view.updateUnreadBadge(cached.posts);
    if (!badgeOnly) {
      view.render(cached);
      view.markNewsRead(cached.posts);
    }
    return;
  }
  if (!badgeOnly) view.setLoading();
}

function handleNewsLoadError(view, error, cached, badgeOnly) {
  if (error?.name === "AbortError") return;
  if (badgeOnly) {
    console.warn("WeekBox news badge unavailable", error);
  } else if (cached) {
    view.setStatus(t("news.refreshFailedCached"), "error");
  } else {
    view.render({ posts: [] });
    view.setStatus(t("news.unavailable"), "error");
  }
  console.warn("WeekBox news feed unavailable", error);
}

export const newsView = {
  request: null,
  bodyRequest: null,
  modal: null,

  init() {
    this.grid = document.querySelector("[data-news-grid]");
    this.status = document.querySelector("[data-news-status]");
    this.refreshButton = document.querySelector("[data-news-refresh]");
    if (!this.grid || !this.status) return;
    this.ensureModal();
    this.refreshButton?.addEventListener("click", () => void this.load());
    void this.load();
  },

  destroy() {
    this.request?.abort();
    this.request = null;
    this.bodyRequest?.abort();
    this.bodyRequest = null;
    this.closeModal(false);
    this.grid = null;
    this.status = null;
    this.refreshButton = null;
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

  open(post) {
    const modal = this.ensureModal();
    if (!modal) return;
    const image = modal.querySelector("#news-detail-image");
    const title = modal.querySelector("#news-detail-title");
    const meta = modal.querySelector("#news-detail-meta");
    const excerpt = modal.querySelector("#news-detail-excerpt");
    const body = modal.querySelector("#news-detail-body");
    this.bodyRequest?.abort();
    this.bodyRequest = null;
    const renderBody = (value) => {
      body.innerHTML = renderNewsMarkdown(value, post);
      enhanceContentLinks(body, {
        onGameBanana: (submission) => modModal.openSubmission(submission),
      });
    };
    const loadBody = async () => {
      if (post.body) {
        renderBody(post.body);
        return;
      }
      body.textContent = t("news.loading");
      const controller = new AbortController();
      this.bodyRequest = controller;
      try {
        const markdown = await fetchNewsBody(post, controller.signal);
        if (this.bodyRequest !== controller) return;
        post.body = markdown;
        this.writeCachedBody(post);
        renderBody(markdown || post.excerpt || t("news.articleUnavailable"));
      } catch (error) {
        if (error?.name !== "AbortError" && this.bodyRequest === controller) {
          renderBody(post.excerpt || t("news.articleUnavailable"));
        }
      } finally {
        if (this.bodyRequest === controller) this.bodyRequest = null;
      }
    };
    title.textContent = String(post.title || t("nav.news"));
    renderNewsMeta(meta, post);
    excerpt.textContent = String(post.excerpt || "");
    excerpt.hidden = !post.excerpt;
    body.textContent = t("news.loading");
    const coverUrl = safeNewsUrl(post.coverUrl, post.sourceBaseUrl);
    applyNewsCover(modal, image, post, coverUrl);
    modal.style.display = "flex";
    void loadBody();
    requestAnimationFrame(() => {
      modal.classList.add("show");
      activateCheckoutDialog(
        modal,
        modal.querySelector(".news-detail-modal__body"),
        modal.querySelector("#news-detail-close"),
        () => this.closeModal(),
      );
    });
  },

  closeModal(restoreFocus = true) {
    this.bodyRequest?.abort();
    this.bodyRequest = null;
    const modal = this.modal;
    if (!modal) return;
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

  readCache() {
    try {
      const cached = JSON.parse(localStorage.getItem(NEWS_CACHE_KEY) || "null");
      return Array.isArray(cached?.posts) ? cached : null;
    } catch {
      return null;
    }
  },

  writeCache(payload) {
    try {
      localStorage.setItem(NEWS_CACHE_KEY, JSON.stringify(payload));
    } catch {}
  },

  writeCachedBody(post) {
    const cached = this.readCache();
    const cachedPost = cached?.posts?.find((item) => item?.slug === post.slug);
    if (!cachedPost) return;
    cachedPost.body = post.body;
    this.writeCache(cached);
  },

  updateUnreadBadge(posts) {
    const badge = document.getElementById("newsletter-unread");
    const validPosts = (Array.isArray(posts) ? posts : []).filter(
      (post) => post && post.slug && post.title,
    );
    if (!badge) return;
    if (!validPosts.length) {
      badge.textContent = "";
      badge.hidden = true;
      return;
    }

    let seenSlug = "";
    try {
      seenSlug = localStorage.getItem(NEWS_SEEN_KEY) || "";
      if (!seenSlug) {
        localStorage.setItem(NEWS_SEEN_KEY, String(validPosts[0].slug));
        badge.hidden = true;
        return;
      }
    } catch {
      badge.hidden = true;
      return;
    }

    const unread = validPosts.findIndex(
      (post) => String(post.slug) === seenSlug,
    );
    const count = unread < 0 ? validPosts.length : unread;
    badge.textContent = count > 99 ? "99+" : String(count);
    badge.hidden = count === 0;
  },

  markNewsRead(posts) {
    const firstPost = (Array.isArray(posts) ? posts : []).find(
      (post) => post?.slug,
    );
    if (!firstPost) return;
    try {
      localStorage.setItem(NEWS_SEEN_KEY, String(firstPost.slug));
    } catch {}
    this.updateUnreadBadge(posts);
  },

  render(payload) {
    if (!this.grid) return;
    this.grid.replaceChildren();
    const posts = payload.posts.filter(
      (post) => post && post.slug && post.title,
    );
    if (!posts.length) {
      const empty = document.createElement("p");
      empty.className = "news-view__empty";
      empty.textContent = t("news.noNews");
      this.grid.appendChild(empty);
      return;
    }
    for (const [index, post] of posts.entries()) {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "news-view__card";
      card.style.setProperty("--card-index", String(Math.min(index, 7)));
      card.setAttribute(
        "aria-label",
        t("news.openArticle", { title: post.title }),
      );
      card.addEventListener("click", () => void this.open(post));
      const coverUrl = safeNewsUrl(post.coverUrl, post.sourceBaseUrl);
      if (coverUrl) {
        const image = document.createElement("img");
        image.className = "news-view__card-image";
        image.src = coverUrl;
        image.alt = "";
        image.loading = "lazy";
        image.addEventListener("error", () => image.remove(), { once: true });
        card.appendChild(image);
      }
      const body = document.createElement("div");
      body.className = "news-view__card-body";
      const meta = document.createElement("div");
      meta.className = "news-view__card-meta";
      const date = newsDate(post.publishedAt);
      if (date)
        meta.appendChild(
          Object.assign(document.createElement("span"), { textContent: date }),
        );
      if (post.tags?.[0]) {
        meta.appendChild(
          Object.assign(document.createElement("span"), {
            className: "news-view__card-tag",
            textContent: String(post.tags[0]),
          }),
        );
      }
      body.appendChild(meta);
      body.appendChild(
        Object.assign(document.createElement("h2"), {
          className: "news-view__card-title",
          textContent: String(post.title),
        }),
      );
      if (post.excerpt) {
        body.appendChild(
          Object.assign(document.createElement("p"), {
            className: "news-view__card-excerpt",
            textContent: String(post.excerpt),
          }),
        );
      }
      card.appendChild(body);
      this.grid.appendChild(card);
    }
  },

  async load({ badgeOnly = false } = {}) {
    if (!badgeOnly && (!this.grid || !this.status)) return;
    const cached = this.readCache();
    applyCachedNews(this, cached, badgeOnly);
    this.request?.abort();
    const controller = new AbortController();
    this.request = controller;
    const timeout = setTimeout(() => controller.abort(), NEWS_REQUEST_TIMEOUT);
    if (this.refreshButton) this.refreshButton.disabled = true;
    try {
      const payload = await fetchNewsPayload(controller.signal);
      this.writeCache(payload);
      this.updateUnreadBadge(payload.posts);
      if (!badgeOnly) {
        this.render(payload);
        this.markNewsRead(payload.posts);
        this.setStatus("");
      }
    } catch (error) {
      handleNewsLoadError(this, error, cached, badgeOnly);
    } finally {
      clearTimeout(timeout);
      if (this.request === controller) this.request = null;
      if (this.refreshButton) this.refreshButton.disabled = false;
    }
  },
};

export function registerNewsView() {
  appEvents.addEventListener(
    "news:refresh-badge",
    () => void newsView.load({ badgeOnly: true }),
  );
  appEvents.addEventListener("view:loaded", (event) => {
    if (event.detail === "news") newsView.init();
    else newsView.destroy();
  });
}
